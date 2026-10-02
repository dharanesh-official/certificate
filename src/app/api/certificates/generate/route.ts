import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { generateUniqueCertificateId } from "@/lib/certificate/idGenerator";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { z } from "zod";

const generateSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  participantId: z.string().optional(),
  rollNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    // Rate limit: 25 generations per minute per IP
    const rate = checkRateLimit(`gen:${ip}`, 25, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Generation rate limit exceeded. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request payload" },
        { status: 400 }
      );
    }

    const { eventId, participantId, rollNumber } = parsed.data;

    // 1. Authoritative Server-side Event Validation
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        program: {
          select: { id: true, name: true, code: true },
        },
        templates: {
          where: { is_active: true },
          take: 1,
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `This event is currently ${event.status.toLowerCase()}. Certificate generation is only available for active events.` },
        { status: 403 }
      );
    }

    // 2. Authoritative Participant Validation strictly inside this event
    let participant = null;
    if (participantId) {
      participant = await prisma.participant.findFirst({
        where: { id: participantId, event_id: eventId },
      });
    } else if (rollNumber) {
      const cleanRoll = rollNumber.trim().toUpperCase();
      participant = await prisma.participant.findFirst({
        where: { event_id: eventId, roll_number: { equals: cleanRoll, mode: "insensitive" } },
      });
    }

    if (!participant) {
      return NextResponse.json(
        { error: "No matching participant record was found for this event." },
        { status: 404 }
      );
    }

    if (!participant.eligible) {
      return NextResponse.json(
        { error: "This participant is not eligible for certificate generation." },
        { status: 403 }
      );
    }

    // 3. Generate Certificate ID on-the-fly (NO DATABASE STORAGE)
    const certificateId = generateUniqueCertificateId(event.event_code, participant.roll_number);

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    // NO DATABASE WRITES: Zero issued certificate data stored in DB!
    return NextResponse.json({
      success: true,
      certificateId,
      status: "VALID",
      issuedAt: new Date().toISOString(),
      downloadUrl: `/api/certificates/download?eventId=${event.id}&participantId=${participant.id}`,
      verifyUrl: `${baseUrl}/verify?eventId=${event.id}&rollNumber=${participant.roll_number}`,
      participant: {
        id: participant.id,
        name: participant.name,
        roll_number: participant.roll_number,
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
    console.error("Certificate generation error:", error);
    return NextResponse.json(
      { error: "We couldn't generate your certificate right now. Please try again." },
      { status: 500 }
    );
  }
}
