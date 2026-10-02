import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getAdminSession } from "@/lib/auth/jwt";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalPrograms,
      totalEvents,
      totalParticipants,
      totalTemplates,
      recentEvents,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.program.count(),
      prisma.event.count(),
      prisma.participant.count(),
      prisma.certificateTemplate.count({ where: { is_active: true } }),
      prisma.event.findMany({
        take: 6,
        orderBy: { created_at: "desc" },
        include: {
          program: { select: { name: true, code: true } },
          _count: {
            select: { participants: true },
          },
        },
      }),
      prisma.auditLog.findMany({
        take: 6,
        orderBy: { created_at: "desc" },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalPrograms,
        totalEvents,
        totalParticipants,
        totalTemplates,
      },
      recentEvents,
      recentAuditLogs,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to load dashboard statistics" }, { status: 500 });
  }
}
