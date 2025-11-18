"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) window.location.href = "/carlos-mode";
    else setErr("Usuario o contraseña inválidos");
  };

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 24 }}>
      <h2>Iniciar sesión</h2>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        style={{ width: "100%", padding: 10, marginTop: 12 }}
      />
      <input
        value={password}
        type="password"
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        style={{ width: "100%", padding: 10, marginTop: 8 }}
      />
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <button onClick={submit} style={{ marginTop: 12, padding: "10px 14px" }}>
        Entrar
      </button>
    </main>
  );
}
