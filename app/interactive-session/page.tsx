"use client";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "coach"; text: string };

type CarlosMode =
  | "frustrado"
  | "enojado"
  | "inseguro"
  | "tecnico"
  | "proactivo"
  | "resignado";

export default function InteractiveSession() {
  // ---- Modo de Carlos ----
  const [mode, setMode] = useState<CarlosMode>("proactivo");

  // ---- Estado de conversación ----
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [evalResult, setEvalResult] = useState<any>(null);
  const [loadingReply, setLoadingReply] = useState(false);

  // ---- Voz (STT + TTS) ----
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [speaking, setSpeaking] = useState(false);

  // ---- Cámara del usuario ----
  const userVideoRef = useRef<HTMLVideoElement | null>(null);

  // ---- Audio IA ----
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ---- Voz navegador (fallback) ----
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // ======== UI estilos ========
  const wrap: React.CSSProperties = {
    maxWidth: 1200,
    margin: "24px auto",
    padding: "16px",
    minHeight: "100vh",
    background: "#020617",
    color: "#e5e7eb",
  };
  const header: React.CSSProperties = {
    textAlign: "center",
    color: "#bfdbfe",
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 4,
  };
  const subHeader: React.CSSProperties = {
    textAlign: "center",
    color: "#9ca3af",
    marginBottom: 16,
    fontSize: 13,
  };
  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    alignItems: "start",
  };
  const panel: React.CSSProperties = {
    background: "#020617",
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 12,
    boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
  };
  const tag: React.CSSProperties = {
    position: "absolute",
    top: 10,
    left: 10,
    background: "rgba(15,23,42,0.9)",
    color: "#e5e7eb",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  };

  // ======== Inicializar modo y primer mensaje (solo en cliente) ========
  useEffect(() => {
    let finalMode: CarlosMode = "proactivo";
    if (typeof window !== "undefined") {
      const fromStorage = sessionStorage.getItem("carlosMode") as CarlosMode | null;
      finalMode = fromStorage || "proactivo";
      sessionStorage.setItem("carlosMode", finalMode);
    }
    setMode(finalMode);
    setMessages([
      {
        role: "coach",
        text: openingByMode(finalMode),
      },
    ]);
  }, []);

  // ======== Cámara del usuario ========
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
          await userVideoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.warn("No se pudo activar la cámara:", e);
      }
    })();
  }, []);

  // ======== Voz IA + fallback navegador ========
  function coachSpeak(text: string, audioBase64?: string | null) {
    // 1) Si tenemos audio IA (mp3 en base64), lo usamos
    if (audioBase64 && audioRef.current) {
      const src = `data:audio/mpeg;base64,${audioBase64}`;
      audioRef.current.src = src;
      audioRef.current.onplaying = () => setSpeaking(true);
      audioRef.current.onended = () => setSpeaking(false);
      audioRef.current.onerror = () => setSpeaking(false);
      audioRef.current
        .play()
        .catch((e) => {
          console.warn("Error reproduciendo audio IA, uso fallback:", e);
          fallbackSpeechSynthesis(text);
        });
      return;
    }

    // 2) Si no hay audio IA, usamos speechSynthesis como backup
    fallbackSpeechSynthesis(text);
  }

  function fallbackSpeechSynthesis(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    function pickSpanishVoice(): SpeechSynthesisVoice | null {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return null;

      const googleEs = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith("es") &&
          v.name.toLowerCase().includes("google")
      );
      if (googleEs) return googleEs;

      const anyEs = voices.find((v) => v.lang.toLowerCase().startsWith("es"));
      if (anyEs) return anyEs;

      return voices[0] || null;
    }

    if (!voiceRef.current) {
      const existing = window.speechSynthesis.getVoices();
      if (existing.length) {
        voiceRef.current = pickSpanishVoice();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          voiceRef.current = pickSpanishVoice();
        };
      }
    }

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-MX";
    u.rate = 0.9;
    u.pitch = 1.05;
    if (voiceRef.current) {
      u.voice = voiceRef.current;
    }

    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  // ======== Mensaje inicial según modo ========
  function openingByMode(m: CarlosMode): string {
    switch (m) {
      case "frustrado":
        return "Jefe, gracias por tu tiempo. Estoy muy frustrado con la situación del Dr. Silva.";
      case "enojado":
        return "Necesito hablar contigo ya. Lo que está pasando con el Dr. Silva me parece inaceptable.";
      case "inseguro":
        return "Quería pedirte ayuda… siento que no estoy logrando nada con el Dr. Silva.";
      case "tecnico":
        return "Traigo datos actualizados del Dr. Silva y su comportamiento de prescripción. Me gustaría revisarlos contigo.";
      case "proactivo":
        return "Gracias por el espacio. Me gustaría que veamos juntos cómo mejorar la relación con el Dr. Silva.";
      case "resignado":
        return "Para ser sincero, ya casi me rindo con el Dr. Silva… pero sé que tenemos que hablarlo.";
      default:
        return "Estoy listo para la sesión de coaching. ¿Por dónde empezamos?";
    }
  }

  // ======== Turno del líder -> IA genera respuesta de Carlos ========
  async function pushUserTurn(text: string) {
    if (!text.trim() || loadingReply) return;

    const leaderMsg: Message = { role: "user", text: text.trim() };
    const historyToSend: Message[] = [...messages, leaderMsg];

    setMessages((prev) => [...prev, leaderMsg]);
    setLoadingReply(true);

    try {
      const res = await fetch("/api/carlos-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          history: historyToSend,
        }),
      });

      const data = await res.json();
      const replyText: string =
        typeof data.reply === "string"
          ? data.reply
          : "Necesito un poco más de información para responder.";

      const carlosMsg: Message = { role: "coach", text: replyText };

      setMessages((prev) => [...prev, carlosMsg]);
      coachSpeak(carlosMsg.text, data.audioBase64); // 👈 usamos la voz IA aquí
    } catch (e) {
      console.error("Error obteniendo respuesta de Carlos:", e);
      const fallback: Message = {
        role: "coach",
        text:
          "Hubo un problema para procesar lo que dijiste, pero me interesa seguir la conversación. ¿Puedes repetirlo de otra forma?",
      };
      setMessages((prev) => [...prev, fallback]);
      coachSpeak(fallback.text);
    } finally {
      setLoadingReply(false);
    }
  }

  // ======== STT: voz continua ========
  function startListening() {
    if (listening) return;
    const SR =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (!SR) {
      alert(
        "Tu navegador no soporta reconocimiento de voz. Usa Chrome/Edge o prueba modo texto."
      );
      return;
    }

    const rec: any = new SR();
    rec.lang = "es-MX";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (ev: any) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) {
          const said = res[0].transcript.trim();
          if (said) {
            void pushUserTurn(said);
          }
        }
      }
    };
    rec.onerror = (e: any) => console.warn("STT error:", e.error);
    rec.onend = () => {
      if (listening) {
        try {
          rec.start();
        } catch {}
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch (e) {
      console.warn("No se pudo iniciar STT:", e);
      alert(
        "No pude iniciar el micrófono. Revisa permisos en el candado del navegador."
      );
    }
  }

  function stopListening() {
    setListening(false);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  // ======== Evaluación ========
  async function evaluateNow() {
    const transcript = messages
      .map((m) => `${m.role === "user" ? "LIDER" : "CARLOS"}: ${m.text}`)
      .join("\n");
    const res = await fetch("/api/eval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const data = await res.json();
    setEvalResult(data);
  }

  // ======== UI ========
  return (
    <div style={wrap}>
      {/* reproductor de audio IA oculto */}
      <audio ref={audioRef} style={{ display: "none" }} />

      <div style={header}>🧠 Leo – Sesión de coaching con Carlos</div>
      <div style={subHeader}>
        Modo seleccionado: <b style={{ color: "#a5b4fc" }}>{mode}</b>
      </div>

      <div style={grid}>
        {/* Panel Avatar (Carlos) */}
        <div style={{ ...panel, position: "relative" }}>
          <span style={tag}>Carlos (avatar)</span>
          <img
            src="/avatar.mp4"
            alt="Carlos"
            style={{
              width: "100%",
              height: 360,
              objectFit: "cover",
              borderRadius: 8,
              border: "1px solid #111827",
            }}
          />
        </div>

        {/* Panel cámara líder */}
        <div style={{ ...panel, position: "relative" }}>
          <span style={tag}>Tú (líder)</span>
          <video
            ref={userVideoRef}
            muted
            playsInline
            style={{
              width: "100%",
              height: 360,
              objectFit: "cover",
              borderRadius: 8,
              border: "1px solid #111827",
            }}
          />
        </div>
      </div>

      {/* Controles voz + evaluación */}
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          marginTop: 18,
        }}
      >
        {!listening ? (
          <button
            onClick={startListening}
            style={{
              background: "#6366f1",
              color: "#fff",
              padding: "10px 18px",
              border: 0,
              borderRadius: 999,
            }}
          >
            Iniciar voz
          </button>
        ) : (
          <button
            onClick={stopListening}
            style={{
              background: "#374151",
              color: "#fff",
              padding: "10px 18px",
              border: 0,
              borderRadius: 999,
            }}
          >
            Pausar voz
          </button>
        )}
        <button
          onClick={evaluateNow}
          style={{
            background: "#0ea5e9",
            color: "#081018",
            padding: "10px 18px",
            border: 0,
            borderRadius: 999,
          }}
        >
          Evaluar conversación
        </button>
      </div>

      {/* Chat transcript */}
      <div style={{ ...panel, marginTop: 16 }}>
        <div style={{ maxHeight: 280, overflowY: "auto", padding: 6 }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent:
                  m.role === "user" ? "flex-end" : "flex-start",
                margin: "8px 0",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: m.role === "user" ? "#1e293b" : "#0f172a",
                  color: "#e5e7eb",
                  border: "1px solid #1f2937",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.7,
                    marginBottom: 4,
                  }}
                >
                  {m.role === "user" ? "Tú (líder)" : "Carlos"}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Entrada de texto: Enter envía */}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              const t = input.trim();
              setInput("");
              void pushUserTurn(t);
            }
          }}
          placeholder={
            loadingReply
              ? "Esperando respuesta de Carlos…"
              : "Habla con Carlos o escribe y pulsa Enter…"
          }
          style={{
            width: "100%",
            marginTop: 10,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #1f2937",
            background: "#020617",
            color: "#e5e7eb",
          }}
        />
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginTop: 10,
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          <span>Voz: {listening ? "🎙️ escuchando" : "⏸️ en pausa"}</span>
          <span> Carlos: {speaking ? "🔊 hablando" : "🤐 en silencio"}</span>
          {loadingReply && <span>Procesando respuesta de Carlos…</span>}
        </div>
      </div>

      {/* Resultados evaluación */}
      {evalResult && (
        <div style={{ ...panel, marginTop: 16 }}>
          <h3 style={{ marginTop: 0, color: "#bfdbfe" }}>
            Resultados de la evaluación
          </h3>
          <pre
            style={{
              margin: 0,
              background: "#020617",
              padding: 12,
              borderRadius: 8,
              color: "#d1d5db",
              border: "1px solid #1f2937",
            }}
          >
            {JSON.stringify(evalResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
