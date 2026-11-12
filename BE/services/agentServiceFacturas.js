require('dotenv').config();

const { saveInvoice } = require('./invoiceService');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const conversations = new Map();
const MAX_MEMORY_MESSAGES = 8;
const extractionPrompt = 'Extrae la factura. Si no puedes leer campos importantes, responde exactamente REQUIERE_MAYOR_DETALLE. Si es legible, llama a guardar_factura con los campos disponibles. No inventes datos.';

function resolverImagen(input, mimeType = 'image/jpeg') {
  if (!Buffer.isBuffer(input)) throw new Error('La imagen debe recibirse como archivo cargado.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw new Error('Tipo de imagen no permitido.');
  return `data:${mimeType};base64,${input.toString('base64')}`;
}

function getMemory(conversationId) { return conversations.get(conversationId) || []; }
function remember(conversationId, message) { conversations.set(conversationId, [...getMemory(conversationId), message].slice(-MAX_MEMORY_MESSAGES)); }

const tools = [{
  type: 'function',
  function: {
    name: 'guardar_factura',
    description: 'Prepara los datos extraídos de una factura para revisión humana. Nunca aprueba ni emite el documento.',
    parameters: {
      type: 'object', additionalProperties: false,
      properties: {
        emisor: { type: ['object', 'null'] }, receptor: { type: ['object', 'null'] },
        numero_factura: { type: ['string', 'null'] }, fecha_emision: { type: ['string', 'null'] }, moneda: { type: ['string', 'null'] },
        subtotal: { type: ['number', 'null'] }, impuestos: { type: ['number', 'null'] }, total: { type: ['number', 'null'] }, items: { type: 'array', items: { type: 'object' } },
      },
      required: ['emisor', 'receptor', 'numero_factura', 'fecha_emision', 'moneda', 'subtotal', 'impuestos', 'total', 'items'],
    },
  },
}];

async function pedirVision(image, conversationId, detail, prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Falta configurar OPENAI_API_KEY en BE/.env');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS || 30000));
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.OPENAI_VISION_MODEL || 'gpt-4o', temperature: 0, tools, tool_choice: 'auto', messages: [
        { role: 'system', content: 'Eres un agente especialista en extracción visual. No inventes datos. Todo resultado queda PENDIENTE_REVISION.' },
        ...getMemory(conversationId), { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: image, detail } }] },
      ] }),
    });
    if (!response.ok) throw new Error(`El proveedor de IA rechazó la solicitud (${response.status}).`);
    return response.json();
  } finally { clearTimeout(timeout); }
}

async function analizarFactura(imagenInput, opciones = {}) {
  const conversationId = opciones.conversationId || 'default';
  const image = resolverImagen(imagenInput, opciones.mimeType);
  let detail = opciones.detail || 'low';
  let attempts = 0;
  let data;
  while (attempts < 2) {
    attempts += 1;
    data = await pedirVision(image, conversationId, detail, opciones.prompt || extractionPrompt);
    const message = data?.choices?.[0]?.message;
    if (message?.content?.includes('REQUIERE_MAYOR_DETALLE') && detail !== 'high') { detail = 'high'; continue; }
    break;
  }
  const message = data?.choices?.[0]?.message;
  if (!message) throw new Error('La IA no devolvió una respuesta válida.');
  if (message.content) remember(conversationId, { role: 'assistant', content: message.content });
  const call = message.tool_calls?.find((item) => item.function?.name === 'guardar_factura');
  if (call && opciones.guardar !== false) {
    let args;
    try { args = JSON.parse(call.function.arguments || '{}'); } catch { throw new Error('La IA devolvió datos estructurados inválidos.'); }
    const saved = await saveInvoice(args, conversationId, { organizacionId: opciones.organizacionId, imageBuffer: opciones.imageBuffer, imageMimeType: opciones.mimeType });
    remember(conversationId, { role: 'user', content: `Factura enviada a revisión con id ${saved.id}.` });
    return { data: args, saved, conversationId, attempts, detail, status: 'PENDIENTE_REVISION' };
  }
  if (message.content?.includes('REQUIERE_MAYOR_DETALLE')) throw new Error('La imagen no permite leer la factura con suficiente detalle.');
  return { data: message.content || null, saved: null, conversationId, attempts, detail, status: 'PENDIENTE_REVISION' };
}

module.exports = { analizarFactura };
