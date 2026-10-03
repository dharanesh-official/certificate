import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");
    const q = url.searchParams.get("q")?.trim() || "";

    // If eventId is provided, scope to that event
    if (eventId) {
      if (!q) {
        const participants = await prisma.participant.findMany({
          where: { event_id: eventId, eligible: true },
          select: {
            id: true,
            name: true,
            roll_number: true,
            department: true,
            institution: true,
          },
          take: 5,
          orderBy: { name: "asc" },
        });
        return NextResponse.json({ participants });
      }

      const participants = await prisma.participant.findMany({
        where: {
          event_id: eventId,
          eligible: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { roll_number: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          roll_number: true,
          department: true,
          institution: true,
        },
        take: 10,
        orderBy: { name: "asc" },
      });

      return NextResponse.json({ participants });
    }

    // Global suggest across all active events
    if (!q) {
      return NextResponse.json({ participants: [] });
    }

    const participants = await prisma.participant.findMany({
      where: {
        eligible: true,
        event: { status: "ACTIVE" },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { roll_number: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        roll_number: true,
        department: true,
        institution: true,
        event: {
          select: {
            id: true,
            name: true,
            event_code: true,
            program: {
              select: { name: true },
            },
          },
        },
      },
      take: 8,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ participants });
  } catch (error) {
    console.error("Participant suggest error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions", participants: [] },
      { status: 500 }
    );
  }
}
