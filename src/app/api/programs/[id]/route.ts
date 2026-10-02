import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getAdminSession } from "@/lib/auth/jwt";
import { logAuditAction } from "@/lib/audit/logger";
import { z } from "zod";

const updateProgramSchema = z.object({
  name: z.string().min(2, "Program name must be at least 2 characters").optional(),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  venue: z.string().optional(),
  organizer: z.string().min(2).optional(),
  department: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        events: {
          include: {
            _count: {
              select: {
                participants: true,
              },
            },
            templates: {
              where: { is_active: true },
              select: {
                id: true,
                version: true,
                template_reference: true,
              },
            },
          },
          orderBy: { created_at: "asc" },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    return NextResponse.json({ program });
  } catch (error) {
    console.error("GET /api/programs/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch program" }, { status: 500 });
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
    const parsed = updateProgramSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const updatedProgram = await prisma.program.update({
      where: { id },
      data: parsed.data,
    });

    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "PROGRAM_UPDATED",
      entityType: "Program",
      entityId: id,
      details: parsed.data,
    });

    return NextResponse.json({ success: true, program: updatedProgram });
  } catch (error) {
    console.error("PUT /api/programs/[id] error:", error);
    return NextResponse.json({ error: "Failed to update program" }, { status: 500 });
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

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        events: true,
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const deleteEvents = url.searchParams.get("deleteEvents") === "true";

    // Set child events program_id to null or cascade delete
    await prisma.$transaction(async (tx) => {
      if (deleteEvents) {
        const events = await tx.event.findMany({
          where: { program_id: id },
          select: { id: true },
        });
        for (const ev of events) {
          await tx.event.delete({ where: { id: ev.id } });
        }
      } else {
        await tx.event.updateMany({
          where: { program_id: id },
          data: { program_id: null },
        });
      }

      await tx.program.delete({
        where: { id },
      });
    });

    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "PROGRAM_DELETED",
      entityType: "Program",
      entityId: id,
      details: { name: program.name, code: program.code, deleteEvents },
    });

    return NextResponse.json({
      success: true,
      message: deleteEvents
        ? "Program and all child events deleted successfully."
        : "Program deleted successfully (child events retained as standalone).",
    });
  } catch (error) {
    console.error("DELETE /api/programs/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete program" }, { status: 500 });
  }
}
