import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "cert_portal_admin_session";
const JWT_SECRET = process.env.AUTH_SECRET || "cert-portal-fallback-secret-2026-production";

export interface AdminPayload {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function signAdminToken(admin: AdminPayload): string {
  return jwt.sign(admin, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminPayload;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyAdminToken(token);
  } catch {
    return null;
  }
}

export async function setAdminSessionCookie(admin: AdminPayload): Promise<void> {
  const token = signAdminToken(admin);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
