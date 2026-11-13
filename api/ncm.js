// Asistente NCM con IA (opcional). Corre como Edge Function en Vercel.
// - Sin GEMINI_API_KEY responde 503 y la web usa el buscador local del nomenclador (gratis, siempre funciona).
// - Con la clave, le pide a Gemini una clasificación orientativa en JSON. La web verifica que el código exista en ncm.json.
// - Límite: 10 consultas por día por IP. Con UPSTASH_REDIS_REST_URL/TOKEN el contador es global;
//   sin Upstash es por instancia (aproximado), suficiente para empezar.
export const config = { runtime: 'edge' };

const LIMIT = Number(process.env.NCM_LIMITE_DIARIO || 10);
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const mem = new Map();

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });

async function hit(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `ncm:${day}:${ip}`;
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      const r = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([['INCR', key], ['EXPIRE', key, '90000']]),
      });
      const j = await r.json();
      return Number(j?.[0]?.result || 0);
    } catch (e) { /* si Upstash falla, seguimos con el contador en memoria */ }
  }
  const n = (mem.get(key) || 0) + 1;
  mem.set(key, n);
  if (mem.size > 5000) mem.clear();
  return n;
}

const SYSTEM = `Sos un clasificador arancelario experto en la Nomenclatura Común del Mercosur (NCM) y en la operatoria de comercio exterior de Argentina.
Clasificá la mercadería que describe el usuario aplicando las Reglas Generales Interpretativas (RGI) del Sistema Armonizado.
Respondé SOLO un JSON con esta forma:
{"ncm":"0000.00.00","explicacion":"una o dos oraciones sobre por qué","rgi":["paso 1","paso 2","paso 3"],"intervenciones":["organismo: motivo"],"alternativas":["0000.00.00"],"confianza":"alta|media|baja"}
Reglas: el código NCM tiene 8 dígitos con el formato 0000.00.00. No inventes la apertura SIM ni la letra de control.
"rgi" explica paso a paso, en español rioplatense simple y con fines educativos, qué reglas aplicaste (RGI 1 con capítulo y partida, RGI 3 si hubo duda entre partidas, RGI 6 para la subpartida).
"intervenciones" lista posibles intervenciones de organismos argentinos (ANMAT, SENASA, INAL, INV, ENACOM, seguridad eléctrica, RENPRE, etc.) solo si aplican de verdad.
Si la descripción es ambigua, elegí la posición más probable, bajá la confianza y poné las otras en "alternativas".
No respondas nada que no sea clasificación arancelaria.`;

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Usá POST' }, 405);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ modo: 'local' }, 503);

  let q = '';
  try { q = String((await req.json()).q || '').trim().slice(0, 400); } catch (e) {}
  if (q.length < 3) return json({ error: 'Describí la mercadería' }, 400);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'anon';
  const n = await hit(ip);
  if (n > LIMIT) return json({ error: 'limite', limite: LIMIT }, 429);

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: 'Mercadería: ' + q }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 1200 },
      }),
    });
    if (!r.ok) return json({ modo: 'local', error: 'ia' }, 502);
    const j = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    const out = JSON.parse(text);
    if (!/^\d{4}\.?\d{2}\.?\d{2}$/.test(String(out.ncm || ''))) return json({ modo: 'local', error: 'formato' }, 502);
    const clean = a => (Array.isArray(a) ? a.slice(0, 6).map(x => String(x).slice(0, 400)) : []);
    return json({
      ncm: String(out.ncm),
      explicacion: String(out.explicacion || '').slice(0, 600),
      rgi: clean(out.rgi),
      intervenciones: clean(out.intervenciones),
      alternativas: clean(out.alternativas),
      confianza: ['alta', 'media', 'baja'].includes(out.confianza) ? out.confianza : 'media',
      restantes: Math.max(0, LIMIT - n),
    });
  } catch (e) {
    return json({ modo: 'local', error: 'ia' }, 502);
  }
}
