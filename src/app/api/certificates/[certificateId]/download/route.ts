import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { generateCertificatePdf } from "@/lib/certificate/pdfGenerator";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/certificate/defaultTemplate";
import { TemplateConfiguration } from "@/lib/certificate/templateTypes";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ certificateId: string }> }
) {
  try {
    const { certificateId } = await context.params;
    const cleanId = certificateId.trim();

    // Check if format is {EVENT_CODE}-{ROLL_NUMBER}
    // We search for a participant with that roll_number in matching event
    const parts = cleanId.split("-");
    let event = null;
    let participant = null;

    if (parts.length >= 2) {
      const rollCandidate = parts[parts.length - 1];
      participant = await prisma.participant.findFirst({
        where: { roll_number: rollCandidate },
        include: {
          event: {
            include: {
              templates: {
                where: { is_active: true },
                take: 1,
              },
            },
          },
        },
      });

      if (participant) {
        event = participant.event;
      }
    }

    if (!participant || !event) {
      return NextResponse.json(
        { error: "Certificate record could not be dynamically resolved." },
        { status: 404 }
      );
    }

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
      certificateId: cleanId,
      verificationUrl,
      templateConfig,
      backgroundImageBuffer: bgBuffer,
    });

    const safeFilename = `Certificate-${cleanId}.pdf`;

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
    console.error("Legacy download handler error:", error);
    return NextResponse.json(
      { error: "Failed to generate certificate stream." },
      { status: 500 }
    );
  }
}
