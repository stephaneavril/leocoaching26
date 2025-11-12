import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "80px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>LEO Coaching (New)</h1>
      <p style={{ opacity: 0.8 }}>Sistema minimal sin HeyGen. Usa avatar estático, autenticación vía cookies y evaluación por reglas.</p>
      <ul>
        <li><Link href="/login">Ir a Login</Link></li>
        <li><Link href="/interactive-session">Ir a la Sesión</Link> <small>(requiere login)</small></li>
      </ul>
    </main>
  );
}
