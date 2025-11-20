import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type CarlosMode =
  | "frustrado"
  | "enojado"
  | "inseguro"
  | "tecnico"
  | "proactivo"
  | "resignado";

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        reply: "No tengo conexión al modelo de IA en este momento.",
        audioBase64: null,
      },
      { status: 200 }
    );
  }

  const { mode, history } = (await req.json()) as {
    mode: CarlosMode;
    history: { role: "user" | "coach"; text: string }[];
  };

  const modeDescription = getModeDescription(mode);

  const messages = [
    {
      role: "system" as const,
      content: `
Eres CARLOS, un representante de ventas farmacéuticas en una sesión de coaching con su jefe (el líder).

Contexto:
- Tu cliente problema es el Dr. Silva.
- Tu tono y estilo dependen del modo: ${modeDescription}
- Siempre respondes en ESPAÑOL neutro, profesional y natural.
- NO repites saludos en cada turno.
- Respondes en 1 a 3 frases máximo.
- Reaccionas siempre a lo que acaba de decir el líder.
- Puedes expresar emociones, pero enfocado en aprender y avanzar.
- No inventes datos clínicos ni promociones agresivas de productos.
      `.trim(),
    },
    ...history.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content:
        m.role === "user"
          ? `LÍDER: ${m.text}`
          : `CARLOS: ${m.text}`,
    })),
  ];

  try {
    // 1) TEXTO de Carlos
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 180,
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "Necesito un poco más de información para responder.";

    // 2) AUDIO (TTS) de Carlos
    let audioBase64: string | null = null;
    try {
        const speech = await client.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: reply,
        });


      const audioBuffer = Buffer.from(await speech.arrayBuffer());
      audioBase64 = audioBuffer.toString("base64");
    } catch (e) {
      console.error("Error generando TTS para Carlos:", e);
      audioBase64 = null;
    }

    return NextResponse.json({ reply, audioBase64 }, { status: 200 });
  } catch (e) {
    console.error("Error en carlos-reply:", e);
    return NextResponse.json(
      {
        reply: "Hubo un problema con el modelo de IA. Intenta de nuevo.",
        audioBase64: null,
      },
      { status: 200 }
    );
  }
}

function getModeDescription(mode: CarlosMode): string {
  switch (mode) {
    case "frustrado":
      return "Frustrado: siente que ha hecho muchos intentos con el Dr. Silva y no ve avances. Se queja, pero está dispuesto a escuchar.";
    case "enojado":
      return "Enojado: está irritado, percibe injusticia y puede sonar duro, pero sin faltar al respeto.";
    case "inseguro":
      return "Inseguro: duda de sus capacidades, se cuestiona a sí mismo, busca validación y claridad.";
    case "tecnico":
      return "Técnico: muy orientado a datos y lógica, habla de indicadores, pero a veces desconectado de la emoción.";
    case "proactivo":
      return "Proactivo: está motivado, quiere mejorar, propone ideas y acepta feedback.";
    case "resignado":
      return "Resignado: siente que nada va a cambiar, energía baja, pero puede ir abriéndose si el líder ayuda.";
    default:
      return "Neutral: colaborativo, profesional, abierto a la conversación.";
  }
}
