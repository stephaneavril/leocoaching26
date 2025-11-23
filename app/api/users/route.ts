import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// GET → lista usuarios
export async function GET() {
  const { rows } = await sql`SELECT * FROM users ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

// POST → crear usuario
export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, role } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const { rows } = await sql`
      INSERT INTO users (name, email, role)
      VALUES (${name}, ${email.toLowerCase()}, ${role || "user"})
      RETURNING *;
    `;

  return NextResponse.json(rows[0]);
}

// PATCH → activar / desactivar
export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, active } = body;

  const { rows } = await sql`
     UPDATE users
     SET is_active = ${active}
     WHERE id = ${id}
     RETURNING *;
  `;

  return NextResponse.json(rows[0]);
}

// DELETE → eliminar usuario
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  await sql`DELETE FROM users WHERE id = ${id}`;
  return NextResponse.json({ status: "ok" });
}
