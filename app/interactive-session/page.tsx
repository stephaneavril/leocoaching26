"use client";
import { useState, useEffect, useRef, useCallback } from "react"; // Añadir useCallback

type Message = { role: "user" | "coach"; text: string };

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  // Esperar a que la voz termine antes de continuar
  utterance.onend = () => {
    // Puedes añadir lógica aquí si necesitas hacer algo después de que la coach hable
  };
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

  // NUEVOS ESTADOS para el control de voz continuo
  const [isMicActive, setIsMicActive] = useState(false); // ¿El micrófono está encendido?
  const [isCoachSpeaking, setIsCoachSpeaking] = useState(false); // ¿La coach está hablando?
  const recognitionRef = useRef<any>(null);
  const interimTranscriptRef = useRef<string>(''); // Para guardar el texto intermedio
  const finalTranscriptRef = useRef<string>(''); // Para guardar el texto final
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null); // Para detectar pausas

  const webcamRef = useRef<HTMLVideoElement>(null);

  // Función para procesar el texto del usuario y obtener respuesta del coach
  // Usamos useCallback para que esta función no se recree innecesariamente
  const processUserSpeech = useCallback((userText: string) => {
    if (!userText.trim()) return;

    const userMessage: Message = { role: "user", text: userText };
    const coachReply = autoCoachReply(userText);
    const coachMessage: Message = { role: "coach", text: coachReply };

    setMessages(prevMessages => [...prevMessages, userMessage, coachMessage]);
    
    setIsCoachSpeaking(true); // Indicar que la coach va a hablar
    const utterance = new SpeechSynthesisUtterance(coachReply);
    utterance.lang = "es-ES";
    utterance.onend = () => {
      setIsCoachSpeaking(false); // La coach terminó de hablar
      if (isMicActive) { // Si el micrófono estaba activo, reiniciarlo para el usuario
         recognitionRef.current?.start(); // Reiniciar el reconocimiento después de que la coach termine
      }
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    
    setInput(""); // Limpiar el input
    finalTranscriptRef.current = ''; // Resetear transcripción final
    interimTranscriptRef.current = ''; // Resetear transcripción intermedia

  }, [isMicActive]); // Dependencia: si isMicActive cambia, useCallback se recrea

  // Efecto para inicializar SpeechSynthesis, SpeechRecognition y Webcam
  useEffect(() => {
    // Hablar el mensaje inicial al cargar la página
    speak(messages[0].text);

    // Configurar reconocimiento de voz
    if (typeof window !== "undefined" && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = true; // ESCUCHA CONTINUAMENTE
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        interimTranscriptRef.current = interim;
        finalTranscriptRef.current = final;
        setInput(finalTranscriptRef.current + interimTranscriptRef.current); // Mostrar ambas en el input

        // Resetear el temporizador de silencio con cada resultado
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
            if (finalTranscriptRef.current.trim() !== '' && !isCoachSpeaking) {
                // Si hay una transcripción final y la coach no está hablando, procesar
                processUserSpeech(finalTranscriptRef.current);
                setInput(''); // Limpiar el input después de enviar
                finalTranscriptRef.current = '';
                interimTranscriptRef.current = '';
            } else if (interimTranscriptRef.current.trim() !== '' && !isCoachSpeaking) {
                // Si hay una transcripción intermedia y la coach no está hablando, procesar
                processUserSpeech(interimTranscriptRef.current);
                setInput(''); // Limpiar el input después de enviar
                finalTranscriptRef.current = '';
                interimTranscriptRef.current = '';
            }
        }, 1500); // Pequeña pausa de 1.5 segundos para detectar final de frase

      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'not-allowed') {
            setIsMicActive(false); // Detener el micrófono si hay un error serio
        }
      };

      recognition.onend = () => {
        // Si el micrófono debería estar activo, pero el navegador lo apagó, reiniciarlo
        if (isMicActive && !isCoachSpeaking) {
          recognitionRef.current?.start();
        }
      };
      recognitionRef.current = recognition;
    } else {
      console.warn("El reconocimiento de voz no es soportado por este navegador.");
    }

    // Activar la cámara web del usuario
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
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (webcamRef.current && webcamRef.current.srcObject) {
        const stream = webcamRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isMicActive, isCoachSpeaking, processUserSpeech]); // Dependencias para re-ejecutar el efecto si cambian

  // Control para activar/desactivar el micrófono
  const toggleMicActive = () => {
    if (!recognitionRef.current) return;

    if (isMicActive) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsMicActive(!isMicActive);
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
    <>
      <header className="session-header">
        <h2>Leo – Simulación de Entrevista</h2>
      </header>
      
      <main className="session-container">
        {/* Columna Izquierda: Coach */}
        <div className="coach-view">
          <img
            src="/avatar.png"
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
              placeholder={isMicActive ? (isCoachSpeaking ? "Coach hablando..." : "Escuchando...") : "Haz clic en 'Micrófono' para hablar..."}
              disabled={true} // Deshabilitar la entrada manual de texto si la conversación es por voz
            />
            
            <button
              onClick={toggleMicActive}
              className={`record-button ${isMicActive ? "recording" : ""}`}
              disabled={isCoachSpeaking} // Deshabilitar el botón si la coach está hablando
            >
              {isMicActive ? "Micrófono ON" : "Micrófono OFF"}
            </button>

            {/* El botón de Enviar se elimina si la conversación es por voz, o se deja si quieres una opción manual */}
            {/* Si quieres que se envíe con ENTER, podrías reactivar el input y el botón "Enviar" */}
            {/* <button onClick={() => send(input)}>Enviar</button> */}
            
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