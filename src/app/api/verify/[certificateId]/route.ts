import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ certificateId: string }> }
) {
  try {
    const ip = getClientIp(req.headers);
    // Rate limit: 60 verifications per minute per IP
    const rate = checkRateLimit(`verify:${ip}`, 60, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Verification rate limit exceeded. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const { certificateId } = await context.params;
    const cleanCertId = certificateId.trim().toUpperCase();

    const url = new URL(req.url);
    const eventIdParam = url.searchParams.get("eventId");
    const rollNumberParam = url.searchParams.get("rollNumber");

    let participant = null;

    if (eventIdParam && rollNumberParam) {
      participant = await prisma.participant.findFirst({
        where: {
          event_id: eventIdParam,
          roll_number: { equals: rollNumberParam.trim(), mode: "insensitive" },
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              event_code: true,
              event_date: true,
              organizer: true,
              department: true,
            },
          },
        },
      });
    }

    if (!participant) {
      // Try to parse roll number from the last segment of the certificate ID
      const parts = cleanCertId.split("-");
      if (parts.length >= 2) {
        const rollCandidate = parts[parts.length - 1];
        participant = await prisma.participant.findFirst({
          where: { roll_number: { equals: rollCandidate.trim(), mode: "insensitive" } },
          include: {
            event: {
              select: {
                id: true,
                name: true,
                event_code: true,
                event_date: true,
                organizer: true,
                department: true,
              },
            },
          },
        });
      }
    }

    if (!participant || !participant.eligible) {
      return NextResponse.json(
        {
          valid: false,
          status: "NOT_FOUND",
          message: "This certificate identifier could not be verified against the official participant roster.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      status: "VALID",
      certificate: {
        certificateId: cleanCertId,
        participantName: participant.name,
        rollNumber: participant.roll_number,
        department: participant.department,
        institution: participant.institution,
        eventName: participant.event.name,
        eventCode: participant.event.event_code,
        eventDate: participant.event.event_date,
        organizer: participant.event.organizer,
      },
    });
  } catch (error) {
    console.error("Verification API error:", error);
    return NextResponse.json(
      { error: "An error occurred while verifying this certificate." },
      { status: 500 }
    );
  }
}
