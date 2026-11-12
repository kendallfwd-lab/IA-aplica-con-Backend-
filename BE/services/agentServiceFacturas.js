const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { Factura } = require('../models');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const conversations = new Map();
const MAX_MEMORY_MESSAGES = 8;

const extractionPrompt = 'Extrae la factura. Si la imagen está borrosa o no permite leer campos importantes, responde exactamente REQUIERE_MAYOR_DETALLE. Si es legible, llama a guardar_factura con los campos disponibles. No inventes datos.';

function resolverImagen(input, mimeType = 'image/jpeg') {
  if (Buffer.isBuffer(input)) return `data:${mimeType};base64,${input.toString('base64')}`;
  if (typeof input !== 'string' || !input.trim()) throw new Error('Se requiere una imagen válida.');
  const value = input.trim();
  if (/^(https?:\/\/|data:)/.test(value)) return value;
  const file = path.resolve(value);
  const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[path.extname(file).toLowerCase()] || mimeType;
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

function getMemory(conversationId) {
  return conversations.get(conversationId) || [];
}

function remember(conversationId, message) {
  const history = [...getMemory(conversationId), message].slice(-MAX_MEMORY_MESSAGES);
  conversations.set(conversationId, history);
}

async function guardarFactura(args, conversationId, imageBuffer = null, imageMimeType = null) {
  const data = args || {};
  const factura = await Factura.create({
    conversationId,
    numeroFactura: data.numero_factura ?? null,
    fechaEmision: data.fecha_emision ?? null,
    moneda: data.moneda ?? null,
    subtotal: data.subtotal ?? null,
    impuestos: data.impuestos ?? null,
    total: data.total ?? null,
    emisor: data.emisor ?? null,
    receptor: data.receptor ?? null,
    items: data.items ?? [],
    datosEstructurados: data,
    imagenOriginal: imageBuffer,
    imagenMimeType: imageMimeType,
  });
  return { id: factura.id, conversationId, saved: true };
}

const tools = [{
  type: 'function',
  function: {
    name: 'guardar_factura',
    description: 'Guarda los datos extraídos de una factura en MySQL.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        emisor: { type: ['object', 'null'] },
        receptor: { type: ['object', 'null'] },
        numero_factura: { type: ['string', 'null'] },
        fecha_emision: { type: ['string', 'null'] },
        moneda: { type: ['string', 'null'] },
        subtotal: { type: ['number', 'null'] },
        impuestos: { type: ['number', 'null'] },
        total: { type: ['number', 'null'] },
        items: { type: 'array', items: { type: 'object' } },
      },
      required: ['emisor', 'receptor', 'numero_factura', 'fecha_emision', 'moneda', 'subtotal', 'impuestos', 'total', 'items'],
    },
  },
}];

async function pedirVision(image, conversationId, detail, prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Falta configurar OPENAI_API_KEY en BE/.env');
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
      temperature: 0,
      tools,
      tool_choice: 'auto',
      messages: [
        { role: 'system', content: 'Eres un agente especialista en análisis y extracción visual de facturas. Usa la herramienta guardar_factura cuando la imagen sea legible.' },
        ...getMemory(conversationId),
        { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: image, detail } }] },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Error de OpenAI (${response.status}): ${await response.text()}`);
  return response.json();
}

async function analizarFactura(imagenInput, opciones = {}) {
  const conversationId = opciones.conversationId || 'default';
  const image = resolverImagen(imagenInput, opciones.mimeType);
  const initialDetail = opciones.detail || 'low';
  let detail = initialDetail;
  let attempts = 0;
  let data;

  while (attempts < 2) {
    attempts += 1;
    data = await pedirVision(image, conversationId, detail, opciones.prompt || extractionPrompt);
    const message = data?.choices?.[0]?.message;
    const text = message?.content || '';
    if (text.includes('REQUIERE_MAYOR_DETALLE') && detail !== 'high') {
      detail = 'high';
      continue;
    }
    break;
  }

  const message = data?.choices?.[0]?.message;
  if (!message) throw new Error('OpenAI no devolvió una respuesta válida.');
  if (message.content) remember(conversationId, { role: 'assistant', content: message.content });

  let saved = null;
  const call = message.tool_calls?.find((item) => item.function?.name === 'guardar_factura');
  if (call && opciones.guardar !== false) {
    const args = JSON.parse(call.function.arguments || '{}');
    saved = await guardarFactura(args, conversationId, opciones.imageBuffer, opciones.mimeType);
    remember(conversationId, { role: 'user', content: `Factura guardada con id ${saved.id}.` });
    return { data: args, saved, conversationId, attempts, detail };
  }

  if (message.content?.includes('REQUIERE_MAYOR_DETALLE')) {
    throw new Error('La imagen no permite leer la factura después de reintentar con detalle alto.');
  }

  return { data: message.content || null, saved, conversationId, attempts, detail };
}

module.exports = { analizarFactura, guardarFactura };
