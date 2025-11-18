"use client";

import { useRouter } from "next/navigation";

type CarlosMode =
  | "frustrado"
  | "enojado"
  | "inseguro"
  | "tecnico"
  | "proactivo"
  | "resignado";

const MODES: { id: CarlosMode; title: string; desc: string; emoji: string }[] = [
  {
    id: "frustrado",
    title: "Carlos frustrado",
    desc: "Se siente bloqueado, ya intentó varias veces con el Dr. Silva.",
    emoji: "😥",
  },
  {
    id: "enojado",
    title: "Carlos enojado",
    desc: "Está molesto, siente injusticia y culpa a todos.",
    emoji: "😠",
  },
  {
    id: "inseguro",
    title: "Carlos inseguro",
    desc: "Duda de sus capacidades y se siente poco competente.",
    emoji: "😓",
  },
  {
    id: "tecnico",
    title: "Carlos técnico",
    desc: "Muy lógico y de datos, busca soluciones concretas.",
    emoji: "🧠",
  },
  {
    id: "proactivo",
    title: "Carlos proactivo",
    desc: "Quiere mejorar y viene con ganas de trabajar.",
    emoji: "😊",
  },
  {
    id: "resignado",
    title: "Carlos resignado",
    desc: "Siente que nada va a cambiar, energía muy baja.",
    emoji: "😶",
  },
];

export default function CarlosModePage() {
  const router = useRouter();

  const handleSelect = (mode: CarlosMode) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("carlosMode", mode);
    }
    router.push(`/interactive-session?mode=${mode}`);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          width: "100%",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: 8, fontSize: 28 }}>
          Selecciona el estilo de{" "}
          <span style={{ color: "#a5b4fc" }}>Carlos</span>
        </h1>
        <p
          style={{
            textAlign: "center",
            marginBottom: 24,
            color: "#9ca3af",
            fontSize: 14,
          }}
        >
          Elige cómo quieres que se comporte el representante en esta sesión de
          coaching.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => handleSelect(m.id)}
              style={{
                textAlign: "left",
                padding: 14,
                borderRadius: 12,
                border: "1px solid #1f2937",
                background: "#020617",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 24 }}>{m.emoji}</div>
              <div style={{ fontWeight: 600, marginTop: 6 }}>{m.title}</div>
              <div
                style={{
                  fontSize: 13,
                  color: "#9ca3af",
                  marginTop: 4,
                }}
              >
                {m.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
