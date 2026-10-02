import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");
    const q = url.searchParams.get("q")?.trim() || "";

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required to fetch participant suggestions.", participants: [] },
        { status: 400 }
      );
    }

    if (!q) {
      // Return first 5 participants as quick suggestions when focused
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

    // STRICTLY SCOPED to the selected event: never touches other events!
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
  } catch (error) {
    console.error("Participant suggest error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions", participants: [] },
      { status: 500 }
    );
  }
}
