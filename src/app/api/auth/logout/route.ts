import { NextResponse } from "next/server";
import { clearAdminSessionCookie, getAdminSession } from "@/lib/auth/jwt";
import { logAuditAction } from "@/lib/audit/logger";

export async function POST() {
  const session = await getAdminSession();
  if (session) {
    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "ADMIN_LOGOUT",
      entityType: "Admin",
      entityId: session.id,
    });
  }

  await clearAdminSessionCookie();
  return NextResponse.json({ success: true, message: "Logged out successfully" });
}
