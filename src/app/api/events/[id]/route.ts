import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getAdminSession } from "@/lib/auth/jwt";
import { logAuditAction } from "@/lib/audit/logger";
import { z } from "zod";

const updateEventSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters").optional(),
  program_id: z.string().nullable().optional(),
  description: z.string().optional(),
  event_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  venue: z.string().optional(),
  organizer: z.string().min(2).optional(),
  department: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]).optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const event = await prisma.event.findUnique({
      where: { id },
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
        templates: {
          where: { is_active: true },
          take: 1,
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("GET /api/events/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
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

    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: parsed.data,
    });

    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "EVENT_UPDATED",
      entityType: "Event",
      entityId: id,
      details: parsed.data,
    });

    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error("PUT /api/events/[id] error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const event = await prisma.event.findUnique({
      where: { id },
      select: { name: true, event_code: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id },
    });

    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "EVENT_DELETED",
      entityType: "Event",
      entityId: id,
      details: { name: event.name, code: event.event_code },
    });

    return NextResponse.json({ success: true, message: "Event deleted successfully." });
  } catch (error) {
    console.error("DELETE /api/events/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
