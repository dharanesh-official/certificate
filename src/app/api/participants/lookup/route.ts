import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { cleanParticipantName, cleanRollNumber } from "@/lib/utils/sanitize";
import { z } from "zod";

const lookupSchema = z.object({
  eventId: z.string().optional(),
  rollNumber: z.string().optional(),
  name: z.string().optional(),
  query: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    // Rate limit: 40 lookups per minute
    const rate = checkRateLimit(`lookup:${ip}`, 40, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many lookup attempts. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = lookupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { eventId } = parsed.data;
    const rawSearch = (
      parsed.data.query ||
      parsed.data.rollNumber ||
      parsed.data.name ||
      ""
    ).trim();

    if (!rawSearch) {
      return NextResponse.json(
        { error: "Please enter your Name or Roll Number to search." },
        { status: 400 }
      );
    }

    const cleanRoll = cleanRollNumber(rawSearch);
    const cleanName = cleanParticipantName(rawSearch);

    // ─────────────────────────────────────────────────────────────
    // FLOW A: GLOBAL SEARCH ACROSS ALL EVENTS (No eventId provided)
    // ─────────────────────────────────────────────────────────────
    if (!eventId) {
      // Search across ALL participant records in ALL events
      const allMatches = await prisma.participant.findMany({
        where: {
          OR: [
            { roll_number: { equals: cleanRoll, mode: "insensitive" } },
            { roll_number: { equals: rawSearch, mode: "insensitive" } },
            { name: { equals: rawSearch, mode: "insensitive" } },
            { name: { contains: cleanName || rawSearch, mode: "insensitive" } },
          ],
        },
        include: {
          event: {
            include: {
              program: {
                select: { id: true, name: true, code: true },
              },
              templates: {
                where: { is_active: true },
                select: { id: true, is_active: true },
                take: 1,
              },
            },
          },
        },
        orderBy: [
          { event: { event_date: "desc" } },
          { name: "asc" },
        ],
      });

      // CASE 1: No participant is found anywhere
      if (allMatches.length === 0) {
        return NextResponse.json(
          {
            success: false,
            status: "NOT_FOUND",
            error: `No participant record found for "${rawSearch}". Please verify the Name or Roll Number spelling and try again.`,
            results: [],
          },
          { status: 404 }
        );
      }

      // Filter for records with certificate available:
      // A certificate is available when the participant is marked eligible
      // AND the event is ACTIVE.
      const availableMatches = allMatches.filter(
        (p) => p.eligible && p.event.status === "ACTIVE"
      );

      // CASE 2: Participant is found, but has NO certificates available
      if (availableMatches.length === 0) {
        return NextResponse.json(
          {
            success: false,
            status: "NO_CERTIFICATES",
            error: `Participant record found for "${rawSearch}", but no certificates are currently available. The record may be marked ineligible or the event is inactive. Please contact the event coordinator.`,
            results: [],
            totalFound: allMatches.length,
          },
          { status: 403 }
        );
      }

      // CASE 3 & 4: Certificates available!
      // Group / map events with available certificates
      const distinctRollNumbers = Array.from(
        new Set(availableMatches.map((p) => p.roll_number.toUpperCase()))
      );

      const results = availableMatches.map((p) => ({
        participant: {
          id: p.id,
          roll_number: p.roll_number,
          name: p.name,
          department: p.department,
          institution: p.institution,
          eligible: p.eligible,
        },
        event: {
          id: p.event.id,
          name: p.event.name,
          event_code: p.event.event_code,
          event_date: p.event.event_date,
          organizer: p.event.organizer,
          department: p.event.department,
          status: p.event.status,
          program: p.event.program,
        },
        certificateAvailable: true,
      }));

      return NextResponse.json({
        success: true,
        status: "FOUND",
        query: rawSearch,
        total: results.length,
        hasMultipleParticipantsWithSameName: distinctRollNumbers.length > 1,
        distinctRollNumbers,
        results,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // FLOW B: EVENT-SPECIFIC LOOKUP (If eventId is specifically supplied)
    // ─────────────────────────────────────────────────────────────
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        event_code: true,
        event_date: true,
        organizer: true,
        department: true,
        status: true,
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "The selected event was not found." },
        { status: 404 }
      );
    }

    if (event.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Certificate generation for this event is currently ${event.status.toLowerCase()}.` },
        { status: 403 }
      );
    }

    const participant = await prisma.participant.findFirst({
      where: {
        event_id: eventId,
        OR: [
          { roll_number: { equals: cleanRoll, mode: "insensitive" } },
          { roll_number: { equals: rawSearch, mode: "insensitive" } },
          { name: { contains: cleanName || rawSearch, mode: "insensitive" } },
        ],
      },
    });

    if (!participant) {
      return NextResponse.json(
        {
          error: `No participant matching "${rawSearch}" was found in ${event.name}.`,
          status: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (!participant.eligible) {
      return NextResponse.json(
        {
          error: "This participant record is marked as ineligible for certificate issuance. Please contact the event organizer.",
          status: "NO_CERTIFICATES",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "FOUND",
      participant: {
        id: participant.id,
        roll_number: participant.roll_number,
        name: participant.name,
        department: participant.department,
        institution: participant.institution,
      },
      event: {
        id: event.id,
        name: event.name,
        event_code: event.event_code,
        event_date: event.event_date,
        organizer: event.organizer,
        department: event.department,
        program: event.program,
      },
      results: [
        {
          participant,
          event,
          certificateAvailable: true,
        },
      ],
    });
  } catch (error) {
    console.error("Participant lookup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred while validating participant records. Please try again." },
      { status: 500 }
    );
  }
}
