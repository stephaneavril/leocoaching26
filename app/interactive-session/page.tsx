"use client";
import { useState, useEffect, useRef } from "react";

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

  // NUEVO: Referencia para el elemento de video de la webcam
  const webcamRef = useRef<HTMLVideoElement>(null);

  // Efecto para hablar, configurar reconocimiento de voz y activar cámara
  useEffect(() => {
    // 1. Hablar el mensaje inicial
    speak(messages[0].text);

    // 2. Configurar reconocimiento de voz (Speech-to-Text)
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

      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    } else {
      console.warn("El reconocimiento de voz no es soportado por este navegador.");
    }

    // 3. NUEVO: Activar la cámara web del usuario
    async function getWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error al acceder a la webcam:", err);
        alert("No se pudo acceder a la cámara. Por favor, revisa los permisos.");
      }
    }
    getWebcam();
    
    // Función de limpieza
    return () => {
      window.speechSynthesis.cancel(); // Detener voz al salir
      // Detener la cámara al salir
      if (webcamRef.current && webcamRef.current.srcObject) {
        const stream = webcamRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // El array vacío [] asegura que esto solo se ejecute una vez

  // Función para enviar mensaje (con tipos corregidos)
  const send = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { role: "user", text };
    const next = [...messages, userMessage];
    const coachReply = autoCoachReply(text);
    const coachMessage: Message = { role: "coach", text: coachReply };

    setMessages([...next, coachMessage]);
    speak(coachReply);
    setInput("");
  };

  // Función para grabar voz
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

  // Función de evaluación (sin cambios)
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

  // --- RENDERIZADO (JSX) ---
  // Ahora usa 'className' en lugar de 'style'
  return (
    <>
      <header className="session-header">
        <h2>Leo – Simulación de Entrevista</h2>
      </header>
      
      <main className="session-container">
        {/* Columna Izquierda: Coach */}
        <div className="coach-view">
          <img
            src="/avatar.png" // Esta es tu IMAGEN FIJA
            alt="Avatar"
            className="coach-avatar"
          />
        </div>

        {/* Columna Derecha: Usuario + Chat */}
        <div className="chat-ui">
          {/* Cámara del Usuario */}
          <div className="user-view">
            <video
              ref={webcamRef}
              autoPlay
              muted
              playsInline
              className="user-webcam"
            ></video>
          </div>

          {/* Mensajes del Chat */}
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                <b>{m.role === "user" ? "Tú" : "Coach"}</b>
                {m.text}
              </div>
            ))}
          </div>

          {/* Controles del Chat */}
          <div className="chat-controls">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu respuesta o usa el micrófono..."
              onKeyDown={(e) => e.key === "Enter" && send(input)}
            />
            
            <button 
              onClick={toggleRecording}
              className={`record-button ${isRecording ? "recording" : ""}`}
            >
              {isRecording ? "Detener" : "Hablar"}
            </button>

            <button onClick={() => send(input)}>Enviar</button>
            <button onClick={evaluate} disabled={loadingEval}>
              {loadingEval ? "Evaluando…" : "Evaluar"}
            </button>
          </div>
        </div>
      </main>

      {/* Pop-up de Evaluación (aún sin estilo, pero funciona) */}
      {evalResult && (
        <section style={{ position: 'fixed', top: 20, right: 20, background: 'white', color: 'black', padding: 20, borderRadius: 8, zIndex: 100, maxWidth: 400 }}>
          <h3>Resultados</h3>
          <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", maxHeight: 400, overflow: 'auto' }}>
            {JSON.stringify(evalResult, null, 2)}
          </pre>
          <button onClick={() => setEvalResult(null)} style={{marginTop: 10}}>Cerrar</button>
        </section>
      )}
    </>
  );
}

// Función de respuesta (sin cambios)
function autoCoachReply(userText: string) {
  if (/precio|costo|descuento/i.test(userText)) return "¿Cómo justificarías el valor más allá del precio?";
  if (/doctor|paciente|síntoma/i.test(userText)) return "¿Qué perfil de cliente/paciente tienes en mente y qué beneficio concreto ofreces?";
  if (/evidencia|estudio|dato/i.test(userText)) return "¿Cómo traduces ese dato a un resultado medible?";
  return "Entiendo. ¿Cómo lo conectarías con una necesidad específica y un siguiente paso?";
}