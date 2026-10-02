import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getAdminSession } from "@/lib/auth/jwt";
import { logAuditAction } from "@/lib/audit/logger";
import { z } from "zod";

const createProgramSchema = z.object({
  name: z.string().min(2, "Program name must be at least 2 characters"),
  code: z.string().min(2, "Program code must be at least 2 characters").transform(v => v.toUpperCase().trim()),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  venue: z.string().optional(),
  organizer: z.string().min(2, "Organizer name is required"),
  department: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]).default("ACTIVE"),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isPublic = searchParams.get("public") === "true";

    if (isPublic) {
      const activePrograms = await prisma.program.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          start_date: true,
          end_date: true,
          venue: true,
          organizer: true,
          department: true,
          events: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              name: true,
              event_code: true,
              event_date: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      });
      return NextResponse.json({ programs: activePrograms });
    }

    // Admin view
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const programs = await prisma.program.findMany({
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
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ programs });
  } catch (error) {
    console.error("GET /api/programs error:", error);
    return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Admin authentication required." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createProgramSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid program input data" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check duplicate program code
    const existing = await prisma.program.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Program code '${data.code}' already exists. Please choose a unique code.` },
        { status: 409 }
      );
    }

    const program = await prisma.program.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
        venue: data.venue,
        organizer: data.organizer,
        department: data.department,
        status: data.status,
      },
    });

    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "PROGRAM_CREATED",
      entityType: "Program",
      entityId: program.id,
      details: { name: program.name, code: program.code },
    });

    return NextResponse.json({ success: true, program }, { status: 201 });
  } catch (error) {
    console.error("POST /api/programs error:", error);
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
  }
}
