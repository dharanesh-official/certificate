import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "cert_portal_admin_session";
const JWT_SECRET =
  process.env.AUTH_SECRET || "cert-portal-fallback-secret-2026-production";

/**
 * Cache the CryptoKey so it is only imported ONCE per runtime instance
 * (warm requests pay zero importKey overhead).
 */
let _cachedKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;
  _cachedKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return _cachedKey;
}

/** Edge-compatible HS256 JWT verification using cached WebCrypto key. */
async function verifyJwtEdge(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const [headerB64, payloadB64, sigB64] = parts;
    const key = await getCryptoKey();

    const sigStr = sigB64.replace(/-/g, "+").replace(/_/g, "/");
    const sigBuf = Uint8Array.from(atob(sigStr), (c) => c.charCodeAt(0));

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBuf,
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );

    if (!valid) return false;

    // Check expiry
    const payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    if (payload.exp && Date.now() / 1000 > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow: login page and auth API
  if (pathname === "/admin/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi =
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/programs") ||
    pathname.startsWith("/api/events") ||
    pathname.startsWith("/api/certificates");

  if (isAdminPage || isAdminApi) {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: "Authentication required. Please log in." },
          { status: 401 }
        );
      }
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    const valid = await verifyJwtEdge(token);
    if (!valid) {
      if (isAdminApi) {
        const res = NextResponse.json(
          { error: "Session expired. Please log in again." },
          { status: 401 }
        );
        res.cookies.delete(AUTH_COOKIE_NAME);
        return res;
      }
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      const res = NextResponse.redirect(url);
      res.cookies.delete(AUTH_COOKIE_NAME);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|images/|fonts/|icons/).*)",
  ],
};
