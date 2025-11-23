import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const body = await req.json();
  const { transcriptUser, transcriptAvatar } = body;

  const prompt = `
Eres un evaluador experto en entrenamiento comercial con avatares de IA.
Analiza la interacción entre el REPRESENTANTE (usuario) y el AVATAR de entrenamiento.

Objetivo:
Evaluar habilidades del representante en una práctica real con un avatar corporativo farmacéutico.

Evalúa según:
- Claridad al comunicar ideas
- Estructura comercial
- Escucha activa
- Capacidad de adaptación a las respuestas del avatar
- Uso de preguntas abiertas
- Profesionalismo y manejo de objeciones
- Cierre y sentido de propósito
- Aprovechamiento del avatar como herramienta de entrenamiento

Devuelve SOLO JSON con esta estructura EXACTA:

{
  "score_global": 0-100,
  "fortalezas": ["", "", ""],
  "areas_mejora": ["", "", ""],
  "recomendacion": "",
  "resumen_publico": ""
}

Donde:
- "resumen_publico" es texto corto (80 palabras) para mostrarse al usuario.
- "recomendacion" es para RH (no se muestra al usuario).

Aquí está la interacción:

USUARIO:
${transcriptUser}

AVATAR:
${transcriptAvatar}
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: "Responde SOLO con JSON válido." },
      { role: "user", content: prompt },
    ],
  });

  let parsed;
  try {
    parsed = JSON.parse(completion.choices[0].message.content || "{}");
  } catch (e) {
    parsed = { error: "JSON inválido generado por Ia", raw: completion };
  }

  return NextResponse.json(parsed);
}
