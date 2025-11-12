"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type Message = { role: "user" | "coach"; text: string };

export default function InteractiveSession() {
  const [messages, setMessages] =useState<Message[]>([
    { role: "coach", text: "Hola, soy tu coach virtual. ¿Qué objetivo tienes para esta visita?" },
  ]);
  const [input, setInput] = useState("");
  const [loadingEval, setLoadingEval] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  // Estados para la conversación
  const [isMicActive, setIsMicActive] = useState(false);
  const [isCoachSpeaking, setIsCoachSpeaking] = useState(false);
  
  // Referencias para los objetos
  const recognitionRef = useRef<any>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Función para que hable el coach
  // Usamos useCallback para que la función sea estable
  const speakCoach = useCallback((text: string, onEnd: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    
    setIsCoachSpeaking(true); // Coach empieza a hablar
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.onend = () => {
      setIsCoachSpeaking(false); // Coach termina de hablar
      onEnd(); // Llama a la función 'onEnd'
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []); // Dependencias vacías, solo se crea una vez

  // Función para procesar el texto del usuario y obtener respuesta
  const processUserSpeech = useCallback((userText: string) => {
    if (!userText.trim()) return;

    const userMessage: Message = { role: "user", text: userText };
    const coachReply = autoCoachReply(userText);
    const coachMessage: Message = { role: "coach", text: coachReply };

    setMessages(prevMessages => [...prevMessages, userMessage, coachMessage]);
    
    // Hablar la respuesta del coach. Cuando termine...
    speakCoach(coachReply, () => {
      // ...reiniciar el micrófono si seguía activo
      if (recognitionRef.current && isMicActive) {
        recognitionRef.current.start();
      }
    });
    
    setInput(""); // Limpiar el input
  }, [isMicActive, speakCoach]); // Depende de 'isMicActive' y 'speakCoach'

  // Efecto de inicialización: Se ejecuta UNA SOLA VEZ
  useEffect(() => {
    // 1. Activar la cámara web
    async function getWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error al acceder a la webcam:", err);
      }
    }
    getWebcam();

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
        finalTranscript = ''; // Resetear finalTranscript en cada resultado

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        setInput(finalTranscript + interimTranscript); // Mostrar en el input lo que se está escuchando

        // Detectar silencio (fin de la frase)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (finalTranscript.trim() && !isCoachSpeaking) {
            processUserSpeech(finalTranscript.trim());
            finalTranscript = '';
          }
        }, 1500); // 1.5 segundos de silencio para enviar
      };

      recognition.onerror = (event: any) => {
        console.error('Error de reconocimiento de voz:', event.error);
        if (event.error === 'not-allowed') {
          alert("Por favor, permite el acceso al micrófono para hablar.");
          setIsMicActive(false);
        }
      };

      recognition.onend = () => {
        // Reiniciar automáticamente si el micrófono debe estar activo
        // y no es porque el coach esté hablando
        if (isMicActive && !isCoachSpeaking) {
          recognition.start();
        }
      };
      
      recognitionRef.current = recognition; // Guardar la instancia en la ref

    } else {
      console.warn("El reconocimiento de voz no es soportado por este navegador.");
    }
    
    // 3. Hablar el mensaje inicial
    speakCoach(messages[0].text, () => {
      // No hacer nada especial después del saludo inicial
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
  }, [processUserSpeech, speakCoach]); // El array de dependencias ahora solo tiene 'processUserSpeech' y 'speakCoach'

  
  // Efecto para controlar el ESTADO del micrófono (ON/OFF)
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isMicActive && !isCoachSpeaking) {
      // Si el mic debe estar ON y el coach NO habla -> ENCENDER
      recognitionRef.current.start();
    } else {
      // Si el mic debe estar OFF o el coach SÍ habla -> APAGAR
      recognitionRef.current.stop();
    }
  }, [isMicActive, isCoachSpeaking]); // Este efecto reacciona a los cambios de estado

  
  // Handler para el botón principal
  const toggleMicActive = () => {
    setIsMicActive(!isMicActive); // Simplemente cambia el estado
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
              readOnly // El input es solo de lectura, muestra la transcripción
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