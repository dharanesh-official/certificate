import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getAdminSession } from "@/lib/auth/jwt";
import { logAuditAction } from "@/lib/audit/logger";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/certificate/defaultTemplate";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;

    let template = await prisma.certificateTemplate.findFirst({
      where: { event_id: eventId, is_active: true },
      orderBy: { version: "desc" },
    });

    if (!template) {
      // Auto-create default template if none exists
      template = await prisma.certificateTemplate.create({
        data: {
          event_id: eventId,
          template_reference: "default-ornate-gold",
          width: 842,
          height: 595,
          configuration_json: JSON.stringify(DEFAULT_TEMPLATE_CONFIG),
          version: 1,
          is_active: true,
        },
      });
    }

    return NextResponse.json({
      template: {
        id: template.id,
        eventId: template.event_id,
        templateReference: template.template_reference,
        width: template.width,
        height: template.height,
        version: template.version,
        configuration: JSON.parse(template.configuration_json),
      },
    });
  } catch (error) {
    console.error("GET template error:", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await context.params;
    const body = await req.json();
    const { configuration, templateReference, width = 842, height = 595 } = body;

    if (!configuration || !Array.isArray(configuration.fields)) {
      return NextResponse.json({ error: "Invalid template configuration" }, { status: 400 });
    }

    const activeTemplate = await prisma.certificateTemplate.findFirst({
      where: { event_id: eventId, is_active: true },
    });

    let savedTemplate;

    if (activeTemplate) {
      savedTemplate = await prisma.certificateTemplate.update({
        where: { id: activeTemplate.id },
        data: {
          configuration_json: JSON.stringify(configuration),
          template_reference: templateReference || activeTemplate.template_reference,
          width,
          height,
        },
      });

      await logAuditAction({
        adminId: session.id,
        adminEmail: session.email,
        action: "TEMPLATE_UPDATED",
        entityType: "CertificateTemplate",
        entityId: savedTemplate.id,
        details: { eventId, version: activeTemplate.version },
      });
    } else {
      savedTemplate = await prisma.certificateTemplate.create({
        data: {
          event_id: eventId,
          template_reference: templateReference || "default-ornate-gold",
          width,
          height,
          configuration_json: JSON.stringify(configuration),
          version: 1,
          is_active: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      template: {
        id: savedTemplate.id,
        version: savedTemplate.version,
        configuration: JSON.parse(savedTemplate.configuration_json),
      },
    });
  } catch (error) {
    console.error("PUT template error:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}
