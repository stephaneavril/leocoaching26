"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Message = { role: "user" | "coach"; text: string };

type CarlosMode =
  | "frustrado"
  | "enojado"
  | "inseguro"
  | "tecnico"
  | "proactivo"
  | "resignado";

export default function InteractiveSession() {
  const searchParams = useSearchParams();
  const urlMode = searchParams.get("mode") as CarlosMode | null;
  const initialMode: CarlosMode =
    urlMode ||
    (typeof window !== "undefined"
      ? ((sessionStorage.getItem("carlosMode") as CarlosMode) || "proactivo")
      : "proactivo");

  const [mode] = useState<CarlosMode>(initialMode);

  // ---- Estado de conversación ----
  const [messages, setMessages] = useState<Message[]>(() => [
    { role: "coach", text: openingByMode(initialMode) },
  ]);
  const [input, setInput] = useState("");
  const [evalResult, setEvalResult] = useState<any>(null);

  // ---- Voz (STT + TTS) ----
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [speaking, setSpeaking] = useState(false);

  // ---- Cámara del usuario ----
  const userVideoRef = useRef<HTMLVideoElement | null>(null);

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

  // ======== TTS de Carlos ========
  function coachSpeak(text: string) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-MX";
      u.rate = 1.0;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }

  // ======== Respuesta de Carlos según MODO ========
  function carlosReply(mode: CarlosMode, leaderText: string) {
    const txt = leaderText.toLowerCase();

    switch (mode) {
      case "frustrado":
