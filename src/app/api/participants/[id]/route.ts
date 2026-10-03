import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getAdminSession } from "@/lib/auth/jwt";
import { logAuditAction } from "@/lib/audit/logger";
import { z } from "zod";

const updateParticipantSchema = z.object({
  roll_number: z.string().min(1).transform(v => v.trim().toUpperCase()).optional(),
  name: z
    .string()
    .min(1)
    .regex(
      /^[A-Za-z\s]+$/,
      "The Name field should accept only alphabetic characters (A–Z). Numbers, special characters, and other non-alphabetic characters are not allowed."
    )
    .transform(v => v.trim())
    .optional(),
  email: z.string().email().optional().or(z.literal("")),
  department: z.string().optional(),
  institution: z.string().optional(),
  eligible: z.boolean().optional(),
});

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
    const parsed = updateParticipantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const updated = await prisma.participant.update({
      where: { id },
      data: parsed.data,
    });

    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "PARTICIPANT_UPDATED",
      entityType: "Participant",
      entityId: id,
      details: parsed.data,
    });

    return NextResponse.json({ success: true, participant: updated });
  } catch (error) {
    console.error("PUT participant error:", error);
    return NextResponse.json({ error: "Failed to update participant" }, { status: 500 });
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

    const participant = await prisma.participant.findUnique({
      where: { id },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    await prisma.participant.delete({ where: { id } });

    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "PARTICIPANT_DELETED",
      entityType: "Participant",
      entityId: id,
      details: { roll_number: participant.roll_number, name: participant.name },
    });

    return NextResponse.json({ success: true, message: "Participant deleted successfully." });
  } catch (error) {
    console.error("DELETE participant error:", error);
    return NextResponse.json({ error: "Failed to delete participant" }, { status: 500 });
  }
}
