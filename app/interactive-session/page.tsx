"use client";
import { useState, useEffect, useRef } from "react";

// El tipo 'Message' requiere que 'role' sea exactamente "user" o "coach"
type Message = { role: "user" | "coach"; text: string };

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function InteractiveSession() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "coach", text: "Hola, soy tu coach virtual. ¿Qué objetivo tienes para esta visita?" },
  ]);
  const [input, setInput] = useState("");
  const [loadingEval, setLoadingEval] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    speak(messages[0].text);

    if (typeof window !== "undefined" && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn("El reconocimiento de voz no es soportado por este navegador.");
    }
  }, []);

  const send = (text: string) => {
    if (!text.trim()) return;

    // --- CORRECCIÓN DE TIPO ---
    // Siendo explícitos con el tipo 'Message'
    const userMessage: Message = { role: "user", text };
    const next = [...messages, userMessage];
    const coachReply = autoCoachReply(text);

    // Siendo explícitos con el tipo 'Message'
    const coachMessage: Message = { role: "coach", text: coachReply };
    setMessages([...next, coachMessage]);
    // --- FIN DE LA CORRECCIÓN ---

    speak(coachReply);
    setInput("");
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
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
              placeholder="Escribe tu respuesta o usa el micrófono..."
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd" }}
            />
            
            <button 
              onClick={toggleRecording} 
              style={{ padding: "10px 14px", borderRadius: 8, background: isRecording ? "#FFCDD2" : "#E0E0E0" }}
            >
              {isRecording ? "Detener" : "Hablar"}
            </button>

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
          <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(evalResult, null, 2)}
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