import { NextRequest, NextResponse } from "next/server";

/**
 * Password-protects the whole app (pages + /api/*) with HTTP Basic Auth so strangers who find the
 * public URL can't burn the SerpApi quota.
 *
 * - APP_PASSWORD set           → login required (any username, this password).
 * - APP_PASSWORD unset, on Vercel with a real SERPAPI_KEY → fail closed (503) rather than expose the key's quota.
 * - Otherwise (local dev / demo mode) → open.
 */
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function safeEqual(a: string, b: string): boolean {
  // Constant-time compare (length leak only) to avoid timing attacks on the password.
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;

  if (!password) {
    const realKeyInUse = !!process.env.SERPAPI_KEY && process.env.MOCK !== "1";
    if (process.env.VERCEL && realKeyInUse) {
      return new NextResponse("Server misconfigured: APP_PASSWORD is not set.", { status: 503 });
    }
    return NextResponse.next();
  }

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const supplied = decoded.slice(decoded.indexOf(":") + 1);
      if (safeEqual(supplied, password)) return NextResponse.next();
    } catch {
      /* malformed header → fall through to 401 */
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Flight Scanner", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}
