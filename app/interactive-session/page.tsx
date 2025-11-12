"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type Message = { role: "user" | "coach"; text: string };

export default function InteractiveSession() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "coach", text: "Hola, soy tu coach virtual. ¿Qué objetivo tienes para esta visita?" },
  ]);
  const [input, setInput] = useState("");
  const [loadingEval, setLoadingEval] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  // --- NUEVA LÓGICA DE ESTADO ---
  // Usamos useState para los 'triggers' de React
  const [isMicActive, _setIsMicActive] = useState(false);
  const [isCoachSpeaking, _setIsCoachSpeaking] = useState(false);
  // Usamos useRef para leer el estado actual DENTRO de los callbacks
  const isMicActiveRef = useRef(isMicActive);
  const isCoachSpeakingRef = useRef(isCoachSpeaking);

  // Funciones setter que actualizan AMBOS
  const setIsMicActive = (val: boolean) => {
    _setIsMicActive(val);
    isMicActiveRef.current = val;
  };
  const setIsCoachSpeaking = (val: boolean) => {
    _setIsCoachSpeaking(val);
    isCoachSpeakingRef.current = val;
  };
  // --- FIN DE LA NUEVA LÓGICA DE ESTADO ---

  const recognitionRef = useRef<any>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Función para que hable el coach
  const speakCoach = useCallback((text: string, onEnd: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    setIsCoachSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.onend = () => {
      setIsCoachSpeaking(false);
      onEnd();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []); // Dependencia vacía, se crea una sola vez

  // Función para procesar el texto del usuario
  const processUserSpeech = useCallback((userText: string) => {
    if (!userText.trim()) return;

    const userMessage: Message = { role: "user", text: userText };
    const coachReply = autoCoachReply(userText);
    const coachMessage: Message = { role: "coach", text: coachReply };

    setMessages(prevMessages => [...prevMessages, userMessage, coachMessage]);

    speakCoach(coachReply, () => {
      // Coach terminó, reiniciar el mic si debe estar activo
      // Leemos desde el REF para evitar 'stale state'
      if (recognitionRef.current && isMicActiveRef.current) {
        recognitionRef.current.start();
      }
    });

    setInput("");
  }, [speakCoach]); // Depende de 'speakCoach' (que es estable)

  // Efecto de inicialización: Se ejecuta UNA SOLA VEZ
  useEffect(() => {
    // 1. Activar la cámara web
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Error al acceder a la webcam:", err);
      });

    // 2. Configurar el reconocimiento de voz
    if (typeof window !== "undefined" && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = true;
      recognition.interimResults = true;

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setInput(finalTranscript + interimTranscript);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          // Leer desde el REF para evitar 'stale state'
          if (finalTranscript.trim() && !isCoachSpeakingRef.current) {
            processUserSpeech(finalTranscript.trim());
            finalTranscript = '';
          }
        }, 1500);
      };

      recognition.onerror = (event: any) => {
        console.error('Error de reconocimiento de voz:', event.error);
        if (event.error === 'not-allowed') setIsMicActive(false);
      };
      
      // ESTA ES LA CORRECCIÓN CLAVE:
      // El 'onend' ya no intenta reiniciar. El useEffect 'controlador' lo hará.
      recognition.onend = () => {
        console.log("Recognition service ended.");
      };

      recognitionRef.current = recognition;

    } else {
      console.warn("El reconocimiento de voz no es soportado por este navegador.");
    }

    // 3. Hablar el mensaje inicial
    speakCoach(messages[0].text, () => {
      // No hacer nada especial
    });

    // 4. Limpieza al salir
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (webcamRef.current && webcamRef.current.srcObject) {
        const stream = webcamRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [processUserSpeech, speakCoach]); // Dependencias estables, solo se ejecuta una vez

  // Efecto "Controlador": Este es el ÚNICO lugar que llama a start() y stop()
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isMicActive && !isCoachSpeaking) {
      // Si el mic debe estar ON y el coach NO habla -> ENCENDER
      recognitionRef.current.start();
    } else {
      // Si el mic debe estar OFF o el coach SÍ habla -> APAGAR
      recognitionRef.current.stop();
    }
  }, [isMicActive, isCoachSpeaking]); // Reacciona a los cambios de estos dos estados

  // Handler para el botón principal
  const toggleMicActive = () => {
    setIsMicActive(!isMicActive);
  };

  // Función de evaluación
  const evaluate = async () => {
    setLoadingEval(true);
    // ... (código de evaluación sin cambios)
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
    <>
      <header className="session-header">
        <h2>Leo – Simulación de Entrevista</h2>
      </header>
      
      <main className="session-container">
        {/* Coach */}
        <div className="coach-view">
          <img src="/avatar.png" alt="Avatar" className="coach-avatar" />
        </div>

        {/* Usuario + Chat */}
        <div className="chat-ui">
          {/* Cámara */}
          <div className="user-view">
            <video ref={webcamRef} autoPlay muted playsInline className="user-webcam"></video>
          </div>

          {/* Mensajes */}
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                <b>{m.role === "user" ? "Tú" : "Coach"}</b>
                {m.text}
              </div>
            ))}
          </div>

          {/* Controles */}
          <div className="chat-controls">
            <input
              value={input}
              readOnly
              placeholder={isCoachSpeaking ? "Coach hablando..." : (isMicActive ? "Escuchando..." : "Micrófono apagado")}
            />
            
            <button
              onClick={toggleMicActive}
              className={`record-button ${isMicActive ? "recording" : ""}`}
              disabled={isCoachSpeaking}
            >
              {isMicActive ? "Micrófono ON" : "Micrófono OFF"}
            </button>
            
            <button onClick={evaluate} disabled={loadingEval}>
              {loadingEval ? "Evaluando…" : "Evaluar"}
            </button>
          </div>
        </div>
      </main>

      {/* Pop-up de Evaluación */}
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

// Función de respuesta del coach
function autoCoachReply(userText: string) {
  if (/precio|costo|descuento/i.test(userText)) return "¿Cómo justificarías el valor más allá del precio?";
  if (/doctor|paciente|síntoma/i.test(userText)) return "¿Qué perfil de cliente/paciente tienes en mente y qué beneficio concreto ofreces?";
  if (/evidencia|estudio|dato/i.test(userText)) return "¿Cómo traduces ese dato a un resultado medible?";
  return "Entiendo. ¿Cómo lo conectarías con una necesidad específica y un siguiente paso?";
}