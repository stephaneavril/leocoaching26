import { NextResponse } from "next/server";

type EvalScores = {
  claridad: number; estructura: number; descubrimiento_necesidad: number;
  manejo_objeciones: number; cierre: number; compliance: number;
};

export async function POST(req: Request) {
  const { transcript } = await req.json() as { transcript: string };
  const scores = ruleBasedEval(transcript || "");
  const feedback = buildFeedback(transcript || "", scores);
  return NextResponse.json({ scores, feedback, mode: "rule-based" });
}

function ruleBasedEval(t: string): EvalScores {
  const lower = t.toLowerCase();
  const len = t.split(/\s+/).length;

  const claridad = clamp(Math.round((len > 60 ? 8 : len > 30 ? 7 : 6) + scoreHit(lower, ["claro","beneficio","propósito","objetivo"])), 1, 10);
  const estructura = clamp(Math.round(5 + scoreHit(lower, ["agenda","pasos","plan","siguiente"]) + scoreSeq(lower, ["apertura","diagnóstico","propuesta","cierre"])), 1, 10);
  const descubrimiento_necesidad = clamp(Math.round(4 + scoreHit(lower, ["necesidad","dolor","reto","prioridad","impacto"]) + questionMarks(lower)), 1, 10);
  const manejo_objeciones = clamp(Math.round(3 + scoreHit(lower, ["objeción","preocupación","riesgo","alternativa"]) + scoreHit(lower, ["precio","tiempo","implementación"])), 1, 10);
  const cierre = clamp(Math.round(4 + scoreHit(lower, ["acuerdo","próximo paso","agenda","reunión","piloto","prueba"])), 1, 10);
  const compliance = clamp(Math.round(7 + penalty(lower, ["promesa médica","garantizado","curar"]) - penalty(lower, ["dato sin fuente"])), 1, 10);

  return { claridad, estructura, descubrimiento_necesidad, manejo_objeciones, cierre, compliance };
}

function scoreHit(t: string, keys: string[]) { return Math.min(3, keys.reduce((a,k)=>a+(t.includes(k)?1:0),0)); }
function questionMarks(t: string) { return Math.min(3, (t.match(/\?/g) || []).length >= 2 ? 2 : (t.match(/\?/g)||[]).length); }
function scoreSeq(t: string, seq: string[]) {
  let idx = -1, score = 0;
  for (const key of seq) { const pos = t.indexOf(key); if (pos>idx && pos!=-1) { score+=1; idx=pos; } }
  return Math.min(3, score);
}
function penalty(t: string, keys: string[]) { return Math.min(2, keys.reduce((a,k)=>a+(t.includes(k)?1:0),0)); }
function clamp(n:number,min:number,max:number){ return Math.max(min, Math.min(max, n)); }

function buildFeedback(t: string, s: EvalScores) {
  const tips: string[] = [];
  if (s.descubrimiento_necesidad < 7) tips.push("Profundiza con 2–3 preguntas abiertas sobre necesidad, impacto y prioridad.");
  if (s.estructura < 7) tips.push("Declara una mini-agenda al inicio y confirma próximos pasos al cierre.");
  if (s.manejo_objeciones < 7) tips.push("Anticipa objeciones típicas (tiempo, precio, implementación) y plantea alternativas.");
  if (s.claridad < 7) tips.push("Aterriza beneficios en un resultado medible para el cliente/paciente.");
  if (s.cierre < 7) tips.push("Cierra con un compromiso específico (fecha, responsables, entrega).");
  if (s.compliance < 8) tips.push("Evita promesas absolutas y cita fuentes si mencionas datos.");
  return tips;
}
