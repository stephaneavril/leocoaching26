import { NextResponse } from "next/server";
import { signAccess, signRefresh, cookieOpts } from "@/lib/auth";
import bcrypt from "bcrypt";

async function findUserByEmail(email: string) {
  if (process.env.DEMO_USER === email) {
    const hash = process.env.DEMO_HASH || await bcrypt.hash(process.env.DEMO_PASS || "demo123", 10);
    return { id: "u1", email, passwordHash: hash };
  }
  return null;
}

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const user = await findUserByEmail(email);
  if (!user) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const access = await signAccess({ sub: user.id, email: user.email });
  const refresh = await signRefresh({ sub: user.id });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("access_token", access, cookieOpts(60 * 10));
  res.cookies.set("refresh_token", refresh, cookieOpts(60 * 60 * 24));
  return res;
}
