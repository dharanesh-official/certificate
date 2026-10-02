import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { generateCertificatePdf } from "@/lib/certificate/pdfGenerator";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/certificate/defaultTemplate";
import { TemplateConfiguration } from "@/lib/certificate/templateTypes";
import { generateUniqueCertificateId } from "@/lib/certificate/idGenerator";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");
    const participantId = url.searchParams.get("participantId");
    const rollNumber = url.searchParams.get("rollNumber");

    if (!eventId || (!participantId && !rollNumber)) {
      return NextResponse.json(
        { error: "Event ID and Participant ID (or Roll Number) are required." },
        { status: 400 }
      );
    }

    // 1. Fetch Event with active template
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        templates: {
          where: { is_active: true },
          take: 1,
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // 2. Fetch Participant strictly from this event
    let participant = null;
    if (participantId) {
      participant = await prisma.participant.findFirst({
        where: { id: participantId, event_id: eventId },
      });
    } else if (rollNumber) {
      participant = await prisma.participant.findFirst({
        where: { roll_number: { equals: rollNumber.trim(), mode: "insensitive" }, event_id: eventId },
      });
    }

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found for the specified event." },
        { status: 404 }
      );
    }

    // 3. Resolve Template Configuration
    const templateRecord = event.templates[0] || null;
    let templateConfig: TemplateConfiguration = DEFAULT_TEMPLATE_CONFIG;
    let bgBuffer: Buffer | null = null;

    if (templateRecord) {
      try {
        templateConfig = JSON.parse(templateRecord.configuration_json);
      } catch {
        templateConfig = DEFAULT_TEMPLATE_CONFIG;
      }

      if (templateRecord.template_reference?.startsWith("data:image/")) {
        const base64Data = templateRecord.template_reference.split(",")[1];
        if (base64Data) {
          bgBuffer = Buffer.from(base64Data, "base64");
        }
      }
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const verificationUrl = `${protocol}://${host}/verify?eventId=${event.id}&rollNumber=${participant.roll_number}`;
    const certificateId = generateUniqueCertificateId(event.event_code, participant.roll_number);

    // 4. Generate in memory strictly on-the-fly - ZERO DATABASE STORAGE, ZERO DISK STORAGE
    const pdfBytes = await generateCertificatePdf({
      event: {
        name: event.name,
        event_date: event.event_date,
        organizer: event.organizer,
        department: event.department,
      },
      participant: {
        name: participant.name,
        roll_number: participant.roll_number,
        department: participant.department,
        institution: participant.institution,
      },
      certificateId,
      verificationUrl,
      templateConfig,
      backgroundImageBuffer: bgBuffer,
    });

    const safeFilename = `Certificate-${certificateId}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Content-Length": pdfBytes.byteLength.toString(),
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "Pragma": "no-cache",
      },
    });
  } catch (error) {
    console.error("PDF download stream error:", error);
    return NextResponse.json(
      { error: "Failed to generate certificate stream. Please try again." },
      { status: 500 }
    );
  }
}
