import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { cleanParticipantName, cleanRollNumber } from "@/lib/utils/sanitize";
import { z } from "zod";

const lookupSchema = z.object({
  eventId: z.string().min(1, "Please select an event"),
  rollNumber: z.string().optional(),
  query: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    // Rate limit: 30 lookups per minute
    const rate = checkRateLimit(`lookup:${ip}`, 30, 60 * 1000);
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
    const rawSearch = (parsed.data.query || parsed.data.rollNumber || "").trim();

    if (!rawSearch) {
      return NextResponse.json(
        { error: "Please enter your Name or Roll Number." },
        { status: 400 }
      );
    }

    // 1. Verify Event exists and is ACTIVE
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

    // 2. Strict Event-Specific Lookup: Case-insensitive search by Roll Number, Name, or Email
    const trimmed = rawSearch.trim();
    const cleanRoll = cleanRollNumber(trimmed);
    const cleanName = cleanParticipantName(trimmed);

    const participant = await prisma.participant.findFirst({
      where: {
        event_id: eventId,
        OR: [
          { roll_number: { equals: cleanRoll, mode: "insensitive" } },
          { roll_number: { equals: trimmed, mode: "insensitive" } },
          { name: { contains: cleanName || trimmed, mode: "insensitive" } },
          { email: { equals: trimmed, mode: "insensitive" } },
        ],
      },
    });

    if (!participant) {
      return NextResponse.json(
        {
          error: `No participant matching "${rawSearch}" was found in ${event.name}. Please ensure you have selected the correct event and entered your registered Name or Roll Number.`,
        },
        { status: 404 }
      );
    }

    // 3. Verify participant eligibility
    if (!participant.eligible) {
      return NextResponse.json(
        { error: "This participant record is marked as ineligible for certificate issuance. Please contact the event organizer." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
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
    });
  } catch (error) {
    console.error("Participant lookup error:", error);
    return NextResponse.json(
      { error: "An error occurred while validating your participant record. Please try again." },
      { status: 500 }
    );
  }
}
