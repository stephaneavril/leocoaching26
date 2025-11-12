"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type Message = { role: "user" | "coach"; text: string };

export default function InteractiveSession() {
  
  // --- CORRECCIÓN 1: El saludo inicial ---
  // Cambiamos el saludo genérico por uno que coincida con la personalidad de "Carlos".
  // Ahora la voz y el primer texto que veas serán idénticos.
  const [messages, setMessages] = useState<Message[]>([
    { role: "coach", text: "Hola jefe. Me dijiste que querías que habláramos sobre la situación con el Dr. Silva." },
  ]);
  // --- FIN DE LA CORRECCIÓN 1 ---

  const [input, setInput] = useState("");
  const [loadingEval, setLoadingEval] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  const [isMicActive, _setIsMicActive] = useState(false);
  const [isCoachSpeaking, _setIsCoachSpeaking] = useState(false);
  const isMicActiveRef = useRef(isMicActive);
  const isCoachSpeakingRef = useRef(isCoachSpeaking);

  const setIsMicActive = (val: boolean) => {
    isMicActiveRef.current = val;
    _setIsMicActive(val);
  };
  const setIsCoachSpeaking = (val: boolean) => {
    isCoachSpeakingRef.current = val;
    _setIsCoachSpeaking(val);
  };

  const recognitionRef = useRef<any>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Función para que hable el coach (sin cambios)
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
  }, []);

  // Función para procesar el texto del usuario
  const processUserSpeech = useCallback(async (userText: string) => {
    if (!userText.trim()) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const userMessage: Message = { role: "user", text: userText };
    const newMessagesHistory = [...messages, userMessage];
    setMessages(newMessagesHistory);
    setInput("");

    // --- CORRECCIÓN 2: Enviar el historial COMPLETO ---
    // Estábamos borrando el saludo inicial con 'apiMessages.shift()'.
    // Ahora enviamos TODO el historial, para que la IA sepa lo que "Carlos"
    // acaba de decir y pueda continuar la conversación con contexto.
    const apiMessages = newMessagesHistory.map(msg => ({
      role: msg.role === "coach" ? "assistant" : "user",
      content: msg.text,
    }));
    // --- FIN DE LA CORRECCIÓN 2 ---

    let coachReply = "Lo siento, ha ocurrido un error.";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }), // Enviar el historial completo
      });

      if (res.ok) {
        const data = await res.json();
        coachReply = data.reply;
      } else {
        coachReply = "Error al conectar con la IA. Intenta de nuevo.";
      }
    } catch (err) {
      console.error(err);
      coachReply = "Error de conexión.";
    }

    const coachMessage: Message = { role: "coach", text: coachReply };
    setMessages(prev => [...prev, coachMessage]);

    speakCoach(coachReply, () => {
      if (isMicActiveRef.current) {
        recognitionRef.current.start();
      }
    });

  }, [messages, speakCoach]); // Depende de 'messages' y 'speakCoach'


  // Efecto de inicialización (sin cambios)
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Error al acceder a la webcam:", err);
      });

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
      
      recognition.onend = () => {
        console.log("Recognition service ended.");
      };

      recognitionRef.current = recognition;

    } else {
      console.warn("El reconocimiento de voz no es soportado por este navegador.");
    }

    // Habla el NUEVO saludo (el de "Carlos")
    speakCoach(messages[0].text, () => {});

    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (webcamRef.current && webcamRef.current.srcObject) {
        const stream = webcamRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processUserSpeech, speakCoach]); // Dependencias estables


  // Handler para el botón principal (sin cambios)
  const toggleMicActive = () => {
    if (!recognitionRef.current) return;
    const nextState = !isMicActiveRef.current;
    setIsMicActive(nextState);
    if (nextState) {
      recognitionRef.current.start();
    } else {
      recognitionRef.current.stop();
    }
  };

  // Función de evaluación (sin cambios)
  const evaluate = async () => {
    setLoadingEval(true);
    try {
      const transcript = messages.map(m => `${m.role === "user" ? "Líder" : "Empleado"}: ${m.text}`).join("\n\n");
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

  // JSX (sin cambios)
  return (
    <>
      <header className="session-header">
        <h2>Leo – Simulación de Entrevista</h2>
      </header>
      
      <main className="session-container">
        <div className="coach-view">
          <img src="/avatar.png" alt="Avatar" className="coach-avatar" />
        </div>
        <div className="chat-ui">
          <div className="user-view">
            <video ref={webcamRef} autoPlay muted playsInline className="user-webcam"></video>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                <b>{m.role === "user" ? "Tú (Líder)" : "Carlos (Empleado)"}</b>
                {m.text}
              </div>
            ))}
          </div>
          <div className="chat-controls">
            <input
              value={input}
              readOnly
              placeholder={isCoachSpeaking ? "Carlos hablando..." : (isMicActive ? "Escuchando..." : "Micrófono apagado")}
            />
            <button
              onClick={toggleMicActive}
              className={`record-button ${isMicActive ? "recording" : ""}`}
              disabled={isCoachSpeaking}
            >
              {isMicActive ? "Micróf ON" : "Micróf OFF"}
            </button>
            <button onClick={evaluate} disabled={loadingEval}>
              {loadingEval ? "Evaluando…" : "Evaluar"}
            </button>
          </div>
        </div>
      </main>

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

// Ya no se usa esta función, la IA se encarga de las respuestas.
// function autoCoachReply(userText: string) {
//   ...
// }