import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getAdminSession } from "@/lib/auth/jwt";
import { logAuditAction } from "@/lib/audit/logger";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { participantIds } = body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of participant IDs to delete." },
        { status: 400 }
      );
    }

    const result = await prisma.participant.deleteMany({
      where: {
        id: { in: participantIds },
      },
    });

    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "PARTICIPANTS_BATCH_DELETED",
      entityType: "Participant",
      entityId: "batch",
      details: { count: result.count, participantIds },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} participant(s).`,
      count: result.count,
    });
  } catch (error) {
    console.error("DELETE batch participants error:", error);
    return NextResponse.json(
      { error: "Failed to delete participants" },
      { status: 500 }
    );
  }
}
