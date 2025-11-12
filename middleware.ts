import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/interactive-session"];

export async function middleware(req: NextRequest) {
  if (!PROTECTED_PREFIXES.some(p => req.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const cookie = req.cookies.get("access_token")?.value;
  if (!cookie) return NextResponse.redirect(new URL("/login", req.url));
  try {
    await verifyJWT(cookie);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login?exp=1", req.url));
  }
}

export const config = {
  matcher: ["/interactive-session/:path*"]
};
