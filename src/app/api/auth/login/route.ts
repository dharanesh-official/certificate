import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { verifyPassword } from "@/lib/security/hash";
import { setAdminSessionCookie } from "@/lib/auth/jwt";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { logAuditAction } from "@/lib/audit/logger";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    // Rate limit: 5 attempts per 1 minute
    const rate = checkRateLimit(`login:${ip}`, 5, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${rate.resetInSec} seconds before trying again.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request payload" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const passwordMatch = await verifyPassword(password, admin.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Set secure HttpOnly session cookie
    await setAdminSessionCookie({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    });

    // Record audit log
    await logAuditAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "ADMIN_LOGIN",
      entityType: "Admin",
      entityId: admin.id,
      details: { email: admin.email },
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during authentication" },
      { status: 500 }
    );
  }
}
