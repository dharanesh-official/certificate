import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getAdminSession } from "@/lib/auth/jwt";
import { logAuditAction } from "@/lib/audit/logger";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { cleanParticipantName, cleanRollNumber, cleanGenericText } from "@/lib/utils/sanitize";

const createParticipantSchema = z.object({
  roll_number: z.string().min(1, "Roll number is required").transform(v => cleanRollNumber(v)),
  name: z.string().min(2, "Full name is required").transform(v => cleanParticipantName(v)),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  department: z.string().optional().transform(v => v ? cleanGenericText(v) : undefined),
  institution: z.string().optional().transform(v => v ? cleanGenericText(v) : undefined),
  eligible: z.boolean().default(true),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await context.params;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));
    const skip = (page - 1) * limit;

    const where: Prisma.ParticipantWhereInput = { event_id: eventId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { roll_number: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, participants] = await Promise.all([
      prisma.participant.count({ where }),
      prisma.participant.findMany({
        where,
        orderBy: { roll_number: "asc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      participants,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET participants error:", error);
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }
}

export async function POST(
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
    const parsed = createParticipantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid participant input" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if participant already exists in this event
    const existing = await prisma.participant.findUnique({
      where: {
        event_id_roll_number: {
          event_id: eventId,
          roll_number: data.roll_number,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Participant with Roll Number '${data.roll_number}' already exists in this event.` },
        { status: 409 }
      );
    }

    const participant = await prisma.participant.create({
      data: {
        event_id: eventId,
        roll_number: data.roll_number,
        name: data.name,
        email: data.email || null,
        department: data.department || null,
        institution: data.institution || null,
        eligible: data.eligible,
      },
    });

    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "PARTICIPANT_ADDED",
      entityType: "Participant",
      entityId: participant.id,
      details: { roll_number: participant.roll_number, name: participant.name },
    });

    return NextResponse.json({ success: true, participant }, { status: 201 });
  } catch (error) {
    console.error("POST participant error:", error);
    return NextResponse.json({ error: "Failed to add participant" }, { status: 500 });
  }
}
