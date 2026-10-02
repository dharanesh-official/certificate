import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getAdminSession } from "@/lib/auth/jwt";
import { logAuditAction } from "@/lib/audit/logger";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/certificate/defaultTemplate";
import { z } from "zod";

const createEventSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters"),
  event_code: z.string().min(2, "Event code must be at least 2 characters").transform(v => v.toUpperCase().trim()),
  program_id: z.string().optional().nullable(),
  description: z.string().optional(),
  event_date: z.string().min(1, "Event date is required"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  venue: z.string().optional(),
  organizer: z.string().min(2, "Organizer name is required"),
  department: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]).default("ACTIVE"),
});

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isPublic = searchParams.get("public") === "true";
    const programId = searchParams.get("programId");

    const whereClause: any = {};
    if (programId) {
      whereClause.program_id = programId;
    }

    if (isPublic) {
      whereClause.status = "ACTIVE";
      const activeEvents = await prisma.event.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          event_code: true,
          event_date: true,
          organizer: true,
          department: true,
          description: true,
          program: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      });
      return NextResponse.json({ events: activeEvents });
    }

    // Admin view
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Admin authentication required." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid event input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check duplicate event code
    const existing = await prisma.event.findUnique({
      where: { event_code: data.event_code },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Event code '${data.event_code}' already exists. Please choose a unique code.` },
        { status: 409 }
      );
    }

    // Create event and default template in a transaction
    const newEvent = await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          name: data.name,
          event_code: data.event_code,
          program_id: data.program_id || null,
          description: data.description,
          event_date: data.event_date,
          start_time: data.start_time,
          end_time: data.end_time,
          venue: data.venue,
          organizer: data.organizer,
          department: data.department,
          status: data.status,
        },
      });

      // Initialize default certificate template with institutional defaults
      await tx.certificateTemplate.create({
        data: {
          event_id: event.id,
          template_reference: "default-ornate-gold",
          width: 842,
          height: 595,
          configuration_json: JSON.stringify(DEFAULT_TEMPLATE_CONFIG),
          version: 1,
          is_active: true,
        },
      });

      return event;
    });

    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "EVENT_CREATED",
      entityType: "Event",
      entityId: newEvent.id,
      details: { name: newEvent.name, code: newEvent.event_code },
    });

    return NextResponse.json({ success: true, event: newEvent }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
