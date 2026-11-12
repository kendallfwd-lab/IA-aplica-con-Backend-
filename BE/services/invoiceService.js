const { Factura } = require('../models');

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeInvoice(input = {}, conversationId = null) {
  return {
    conversationId,
    numero_factura: input.numero_factura || input.numeroFactura || null,
    fecha_emision: input.fecha_emision || input.fechaEmision || null,
    moneda: input.moneda || 'CRC',
    subtotal: numberOrNull(input.subtotal),
    impuestos: numberOrNull(input.impuestos),
    total: numberOrNull(input.total),
    emisor: input.emisor || null,
    receptor: input.receptor || null,
    items: Array.isArray(input.items) ? input.items : [],
  };
}

async function saveInvoice(input, conversationId = null) {
  const data = normalizeInvoice(input, conversationId);
  if (!data.total && data.total !== 0) throw new Error('La factura necesita un total.');

  const factura = await Factura.create({
    conversationId: data.conversationId,
    numeroFactura: data.numero_factura,
    fechaEmision: data.fecha_emision,
    moneda: data.moneda,
    subtotal: data.subtotal,
    impuestos: data.impuestos,
    total: data.total,
    emisor: data.emisor,
    receptor: data.receptor,
    items: data.items,
    datosEstructurados: data,
  });

  return { id: factura.id, ...data };
}

async function listInvoices(limit = 50) {
  return Factura.findAll({ order: [['createdAt', 'DESC']], limit: Math.min(Number(limit) || 50, 100) });
}

module.exports = { normalizeInvoice, saveInvoice, listInvoices };

