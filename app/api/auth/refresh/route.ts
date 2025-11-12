import { NextResponse } from "next/server";
import { verifyJWT, signAccess, cookieOpts } from "@/lib/auth";

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = cookieHeader.split(";").map(s=>s.trim()).find(s=>s.startsWith("refresh_token="))?.split("=")[1];
  if (!token) return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  try {
    const payload = await verifyJWT(token);
    const access = await signAccess({ sub: payload.sub });
    const res = NextResponse.json({ ok: true });
    res.cookies.set("access_token", access, cookieOpts(60 * 10));
    return res;
  } catch {
    return NextResponse.json({ error: "Refresh inválido" }, { status: 401 });
  }
}
