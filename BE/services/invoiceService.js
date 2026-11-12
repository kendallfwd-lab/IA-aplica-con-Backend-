const crypto = require('crypto');
const { Op, Sequelize } = require('sequelize');
const { Factura } = require('../models');

const ALLOWED_CURRENCIES = new Set(['CRC', 'USD', 'EUR']);
const STATES = new Set(['RECIBIDA', 'PROCESANDO', 'PENDIENTE_REVISION', 'APROBADA', 'RECHAZADA', 'ERROR']);

function cents(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim().replace(',', '.');
  if (!/^[-+]?\d+(\.\d{1,4})?$/.test(text)) return null;
  const negative = text.startsWith('-');
  const clean = text.replace(/^[-+]/, '');
  const [whole, fraction = ''] = clean.split('.');
  const result = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  return negative ? -result : result;
}

function amountString(value) { const n = cents(value); return n == null ? null : (Number(n) / 100).toFixed(2); }

function normalizeInvoice(input = {}, conversationId = null) {
  const currency = String(input.moneda || 'CRC').toUpperCase();
  const items = Array.isArray(input.items) ? input.items.map((item) => ({
    descripcion: String(item.descripcion || item.description || '').trim(),
    cantidad: item.cantidad ?? item.quantity ?? null,
    precio_unitario: amountString(item.precio_unitario ?? item.precioUnitario ?? item.unitPrice),
    importe: amountString(item.importe ?? item.amount ?? item.total),
    impuesto: amountString(item.impuesto ?? item.tax),
  })) : [];
  return {
    conversationId,
    organizacionId: input.organizacionId || input.organizationId || null,
    numero_factura: input.numero_factura || input.numeroFactura || null,
    fecha_emision: input.fecha_emision || input.fechaEmision || null,
    moneda: ALLOWED_CURRENCIES.has(currency) ? currency : null,
    subtotal: amountString(input.subtotal),
    impuestos: amountString(input.impuestos ?? input.impuestosTotal),
    total: amountString(input.total),
    emisor: input.emisor || null,
    receptor: input.receptor || null,
    items,
  };
}

function validateInvoice(data) {
  const errors = [];
  if (!data.total) errors.push('La factura necesita un total.');
  if (!data.moneda) errors.push('La moneda debe ser CRC, USD o EUR.');
  if (data.total && cents(data.total) < 0n) errors.push('El total no puede ser negativo.');
  if (data.fecha_emision && !/^\d{4}-\d{2}-\d{2}/.test(String(data.fecha_emision))) errors.push('La fecha de emisión debe usar YYYY-MM-DD.');

  let calculated = null;
  const detailed = data.items.length > 0 && data.items.every((item) => item.cantidad != null && item.precio_unitario != null);
  if (detailed) {
    calculated = data.items.reduce((sum, item) => {
      const quantity = Number(String(item.cantidad).replace(',', '.'));
      if (!Number.isFinite(quantity) || quantity < 0) errors.push('Las cantidades deben ser números no negativos.');
      const unit = cents(item.precio_unitario);
      if (unit == null || unit < 0n) errors.push('Los precios de línea deben ser válidos.');
      const line = unit == null || !Number.isFinite(quantity) ? 0n : BigInt(Math.round(quantity * 1000)) * unit / 1000n;
      return sum + line;
    }, 0n);
    if (data.subtotal && calculated !== cents(data.subtotal)) errors.push('El subtotal no coincide con la suma de las líneas.');
    if (data.total && data.subtotal && data.impuestos && cents(data.total) !== cents(data.subtotal) + cents(data.impuestos)) errors.push('El total no coincide con subtotal más impuestos.');
  }
  return { valid: errors.length === 0, errors, calculated, detailed };
}

async function findPossibleDuplicate(data, organizationId, transaction) {
  if (!organizationId || !data.numero_factura || !data.total) return null;
  return Factura.findOne({ where: { organizacionId: organizationId, numeroFactura: data.numero_factura, total: data.total }, transaction });
}

async function saveInvoice(input, conversationId = null, options = {}) {
  const data = normalizeInvoice(input, conversationId);
  data.organizacionId = options.organizacionId || data.organizacionId;
  const validation = validateInvoice(data);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  if (!data.organizacionId) throw new Error('La factura debe pertenecer a una organización autenticada.');

  const transaction = await Factura.sequelize.transaction();
  try {
    const duplicate = await findPossibleDuplicate(data, data.organizacionId, transaction);
    const factura = await Factura.create({
      organizacionId: data.organizacionId,
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
      imagenOriginal: options.imageBuffer || null,
      imagenMimeType: options.imageMimeType || null,
      archivoSha256: options.imageBuffer ? crypto.createHash('sha256').update(options.imageBuffer).digest('hex') : null,
      estado: options.estado || 'PENDIENTE_REVISION',
      posibleDuplicado: Boolean(duplicate),
      duplicadoRazon: duplicate ? `Coincide con la factura #${duplicate.id} por número y total.` : null,
    }, { transaction });
    await transaction.commit();
    return { id: factura.id, ...data, estado: factura.estado, posibleDuplicado: factura.posibleDuplicado, duplicadoRazon: factura.duplicadoRazon, validacion: validation };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function listInvoices(limit = 50, options = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const where = { organizacionId: options.organizacionId };
  if (options.estado && STATES.has(options.estado)) where.estado = options.estado;
  if (options.search) where[Op.or] = [
    { numeroFactura: { [Op.like]: `%${options.search}%` } },
    Sequelize.where(Sequelize.fn('JSON_UNQUOTE', Sequelize.fn('JSON_EXTRACT', Sequelize.col('emisor'), '$.nombre')), { [Op.like]: `%${options.search}%` }),
    Sequelize.where(Sequelize.fn('JSON_UNQUOTE', Sequelize.fn('JSON_EXTRACT', Sequelize.col('receptor'), '$.nombre')), { [Op.like]: `%${options.search}%` }),
  ];
  return Factura.findAll({ where, order: [['createdAt', 'DESC']], limit: safeLimit });
}

module.exports = { normalizeInvoice, validateInvoice, saveInvoice, listInvoices, STATES };
