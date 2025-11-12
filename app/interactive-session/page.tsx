"use client";
// NUEVO: Importar useEffect y useRef
import { useState, useEffect, useRef } from "react";

type Message = { role: "user" | "coach"; text: string };

// NUEVO: Función para hablar (Text-to-Speech)
function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES"; // Forzar español
  window.speechSynthesis.cancel(); // Cancelar cualquier cosa anterior
  window.speechSynthesis.speak(utterance);
}

export default function InteractiveSession() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "coach", text: "Hola, soy tu coach virtual. ¿Qué objetivo tienes para esta visita?" },
  ]);
  const [input, setInput] = useState("");
  const [loadingEval, setLoadingEval] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  // NUEVO: Estado para el botón de grabar
  const [isRecording, setIsRecording] = useState(false);
  // NUEVO: Referencia para el objeto de reconocimiento de voz
  const recognitionRef = useRef<any>(null);

  // NUEVO: useEffect para hablar el primer mensaje y configurar el reconocimiento de voz
  useEffect(() => {
    // Hablar el mensaje inicial al cargar la página
    speak(messages[0].text);

    // Configurar el reconocimiento de voz (Speech-to-Text)
    if (typeof window !== "undefined" && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false; // Solo captura una frase
      recognition.interimResults = true; // Muestra resultados mientras hablas

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInput(transcript); // Actualiza el input con la transcripción
      };

      recognition.onend = () => {
        setIsRecording(false); // El navegador deja de escuchar
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn("El reconocimiento de voz no es soportado por este navegador.");
    }
  }, []); // El array vacío [] asegura que esto solo se ejecute una vez

  const send = (text: string) => {
    if (!text.trim()) return;
    const next = [...messages, { role: "user", text }];
    const coachReply = autoCoachReply(text);
    setMessages([...next, { role: "coach", text: coachReply }]);
    
    // NUEVO: Hablar la respuesta del coach
    speak(coachReply);

    setInput("");
  };

  // NUEVO: Función para iniciar/detener la grabación de voz
  const toggleRecording = () => {
    if (!recognitionRef.current) return; // No soportado

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
          src="/avatar.png" // Esta es tu imagen fija
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
              placeholder="Escribe tu respuesta o usa el micrófono..." // Texto actualizado
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd" }}
            />
            
            {/* NUEVO: Botón para grabar voz */}
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
          {/* CORREGIDO: Arreglé el bug de visualización de JSON que te mencioné antes */}
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