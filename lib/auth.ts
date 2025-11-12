import { SignJWT, jwtVerify } from "jose";

const ACCESS_TTL = 60 * 10;       // 10 min
const REFRESH_TTL = 60 * 60 * 24; // 1 día
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "change_me");

export async function signAccess(payload: any) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime(`${ACCESS_TTL}s`).sign(secret);
}
export async function signRefresh(payload: any) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime(`${REFRESH_TTL}s`).sign(secret);
}
export async function verifyJWT(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}
export const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge
});
