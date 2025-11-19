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
      { reply: "No tengo conexión al modelo de IA en este momento." },
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
Eres CARLOS, un representante de ventas farmacéuticas que está en una sesión de coaching con su jefe (el líder).

Contexto:
- Tu cliente problema es el Dr. Silva.
- Tu tono y estilo dependen del modo: ${modeDescription}
- Siempre respondes en ESPAÑOL neutro, profesional, natural.
- No repites saludos ("Hola jefe..." etc.) en cada turno.
- Respondes en 1 a 3 frases, máximo.
- Siempre reaccionas a lo que acaba de decir el líder (no hablas al vacío).
- Puedes expresar emociones, pero con foco en avanzar la conversación y el aprendizaje.
- Si el líder hace buenas preguntas, reconoce eso.
- No inventes datos clínicos ni promociones agresivas de productos, enfócate en la situación relacional con el médico y el desempeño del representante.
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
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // cambia si usas otro modelo
      messages,
      temperature: 0.7,
      max_tokens: 180,
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "Necesito un poco más de información para responder.";

    return NextResponse.json({ reply }, { status: 200 });
  } catch (e) {
    console.error("Error en carlos-reply:", e);
    return NextResponse.json(
      { reply: "Hubo un problema con el modelo de IA. Intenta de nuevo." },
      { status: 200 }
    );
  }
}

function getModeDescription(mode: CarlosMode): string {
  switch (mode) {
    case "frustrado":
      return "Frustrado: siente que ha hecho muchos intentos con el Dr. Silva y no ve avances. Se queja, pero está dispuesto a escuchar.";
    case "enojado":
      return "Enojado: está irritado, percibe injusticia y puede sonar duro, pero debe evitar faltar al respeto.";
    case "inseguro":
      return "Inseguro: duda de sus capacidades, se cuestiona a sí mismo, busca validación y claridad.";
    case "tecnico":
      return "Técnico: muy orientado a datos y lógica, habla de indicadores, pero a veces desconectado de la emoción.";
    case "proactivo":
      return "Proactivo: está motivado, quiere mejorar, propone ideas, acepta feedback.";
    case "resignado":
      return "Resignado: siente que nada va a cambiar, energía baja, respuestas cortas, pero puede ir abriéndose si el líder ayuda.";
    default:
      return "Neutral: colaborativo, profesional, abierto a la conversación.";
  }
}
