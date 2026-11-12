require('dotenv').config();

const { saveInvoice } = require('./invoiceService');
const { saveMessage, getConversation } = require('./chatMemoryService');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const sessions = new Map();

const SYSTEM_PROMPT = `Eres un asistente amable para crear facturas reales. Guía al usuario paso a paso y pregunta solo lo que falta.
Debes recopilar: emisor (nombre y identificación opcional), receptor (nombre e identificación opcional), número de factura, fecha de emisión, moneda, subtotal, impuestos, total e items.
No inventes información. Si el usuario no sabe un dato opcional, usa null. Antes de guardar, confirma el resumen y pregunta si desea crear la factura.
Responde SIEMPRE como JSON con esta forma exacta:
{"reply":"mensaje en español","complete":false,"factura":null}
Cuando el usuario confirme y todos los datos obligatorios estén disponibles, usa complete=true y coloca factura con los campos recopilados.`;

async function stateFor(id, organizacionId) {
  const key = `${organizacionId}:${id}`;
  if (!sessions.has(key)) {
    const stored = await getConversation(id, 24, organizacionId);
    sessions.set(key, {
      messages: stored.map((row) => ({ role: row.role, content: row.content })),
      saved: null,
    });
  }
  return sessions.get(key);
}

function parseResponse(text) {
  const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(clean); } catch { throw new Error('La IA devolvió una respuesta no válida.'); }
}

async function respond(conversationId, userMessage, options = {}) {
  if (!userMessage || !userMessage.trim()) throw new Error('Escribe un mensaje para el asistente.');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Falta configurar OPENAI_API_KEY en BE/.env');

  const state = await stateFor(conversationId, options.organizacionId);
  if (state.saved) return { ...state.saved, alreadySaved: true };

  state.messages.push({ role: 'user', content: userMessage.trim() });
  await saveMessage({
    organizacionId: options.organizacionId,
    conversationId,
    role: 'user',
    content: userMessage.trim(),
    model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
    consentToTraining: options.consentToTraining,
  });
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...state.messages.slice(-12)],
    }),
  });
  if (!response.ok) throw new Error(`Error de OpenAI (${response.status}): ${await response.text()}`);

  const payload = await response.json();
  const result = parseResponse(payload?.choices?.[0]?.message?.content || '{}');
  state.messages.push({ role: 'assistant', content: JSON.stringify(result) });
  await saveMessage({
    organizacionId: options.organizacionId,
    conversationId,
    role: 'assistant',
    content: result.reply || JSON.stringify(result),
    structuredData: result.factura || null,
    model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
    consentToTraining: options.consentToTraining,
    metadata: { complete: Boolean(result.complete) },
  });

  if (result.complete && result.factura) {
    const saved = await saveInvoice(result.factura, conversationId, { organizacionId: options.organizacionId });
    state.saved = { reply: `${result.reply}\n\nFactura guardada con el número ${saved.id}.`, complete: true, factura: saved, invoiceId: saved.id };
    return state.saved;
  }

  return { reply: result.reply || '¿Qué dato deseas agregar?', complete: false, factura: result.factura || null, conversationId };
}

function clearConversation(conversationId, organizacionId) {
  sessions.delete(`${organizacionId}:${conversationId}`);
}

module.exports = { respond, clearConversation };
