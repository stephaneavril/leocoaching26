"use client";
import { useState } from "react";

type Message = { role: "user" | "coach"; text: string };

export default function InteractiveSession() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "coach", text: "Hola, soy tu coach virtual. ¿Qué objetivo tienes para esta visita?" },
  ]);
  const [input, setInput] = useState("");
  const [loadingEval, setLoadingEval] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  const send = (text: string) => {
    if (!text.trim()) return;
    const next = [...messages, { role: "user", text }];
    const coachReply = autoCoachReply(text);
    setMessages([...next, { role: "coach", text: coachReply }]);
    setInput("");
  };

  const evaluate = async () => {
    setLoadingEval(true);
    try {
      const transcript = messages.map(m => `${m.role === "user" ? "REP" : "COACH"}: ${m.text}`).join("\n");
      const res = await fetch("/api/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      setEvalResult(data);
    } finally {
      setLoadingEval(false);
    }
  };

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
      <section style={{ display: "flex", gap: 20 }}>
        <img
          src="/avatar.png"
          alt="Avatar"
          width={220}
          height={220}
          style={{ borderRadius: 12, objectFit: "cover", border: "1px solid #eee" }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ height: 360, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 10, textAlign: m.role === "user" ? "right" : "left" }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: m.role === "user" ? "#EDF2FF" : "#F8F9FA",
                  }}
                >
                  <b>{m.role === "user" ? "Tú" : "Coach"}:</b> {m.text}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu respuesta…"
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd" }}
            />
            <button onClick={() => send(input)} style={{ padding: "10px 14px", borderRadius: 8 }}>
              Enviar
            </button>
            <button onClick={evaluate} disabled={loadingEval} style={{ padding: "10px 14px", borderRadius: 8 }}>
              {loadingEval ? "Evaluando…" : "Evaluar"}
            </button>
          </div>
        </div>
      </section>

      {evalResult && (
        <section style={{ marginTop: 24 }}>
          <h3>Resultados de la evaluación</h3>
          <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 8 }}>
{`${
"```json\n" + "${JSON.stringify(evalResult, null, 2)}" + "\n```"
}`}
          </pre>
        </section>
      )}
    </main>
  );
}

function autoCoachReply(userText: string) {
  if (/precio|costo|descuento/i.test(userText)) return "¿Cómo justificarías el valor más allá del precio?";
  if (/doctor|paciente|síntoma/i.test(userText)) return "¿Qué perfil de cliente/paciente tienes en mente y qué beneficio concreto ofreces?";
  if (/evidencia|estudio|dato/i.test(userText)) return "¿Cómo traduces ese dato a un resultado medible?";
  return "Entiendo. ¿Cómo lo conectarías con una necesidad específica y un siguiente paso?";
}
