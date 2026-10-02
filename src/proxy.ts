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
  const isPublicParam = req.nextUrl.searchParams.get("public") === "true";

  // 1. Always allow login page and auth API
  if (pathname === "/admin/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // 2. Allow public student endpoints without admin session:
  // - Public event list for certificate dropdown (/api/events?public=true)
  if (pathname === "/api/events" && req.method === "GET" && isPublicParam) {
    return NextResponse.next();
  }
  // - Participant lookup and suggestions
  if (pathname === "/api/participants/lookup" || pathname === "/api/participants/suggest") {
    return NextResponse.next();
  }
  // - On-demand certificate generation & download
  if (
    (pathname === "/api/certificates/generate" && req.method === "POST") ||
    (pathname === "/api/certificates/download" && req.method === "GET") ||
    (pathname.startsWith("/api/certificates/") && pathname.endsWith("/download") && req.method === "GET")
  ) {
    return NextResponse.next();
  }
  // - Certificate verification
  if (pathname.startsWith("/api/verify")) {
    return NextResponse.next();
  }

  // 3. Admin routes that REQUIRE active admin session:
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi =
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/programs") ||
    pathname.startsWith("/api/events") ||
    pathname.startsWith("/api/certificates") ||
    pathname.startsWith("/api/participants");

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
