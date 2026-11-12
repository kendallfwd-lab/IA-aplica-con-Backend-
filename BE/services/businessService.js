const { Op } = require('sequelize');
const { Customer, Contact, Service, Quote, QuoteLine, Task } = require('../models');

function cents(value) { const text = String(value ?? '0').replace(',', '.'); if (!/^\d+(\.\d{1,4})?$/.test(text)) throw new Error('Importe inválido.'); const [whole, fraction = ''] = text.split('.'); return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2)); }
function amount(value) { return (Number(value) / 100).toFixed(2); }
function quantity(value) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) throw new Error('La cantidad debe ser mayor que cero.'); return n; }

async function createQuote(input, organizationId, idempotencyKey) {
  if (!idempotencyKey) throw new Error('Falta Idempotency-Key.');
  const existing = await Quote.findOne({ where: { organizacionId: organizationId, idempotencyKey } });
  if (existing) return existing;
  const customer = await Customer.findOne({ where: { id: input.clienteId, organizacionId: organizationId, estado: 'ACTIVO' } });
  if (!customer) throw new Error('Cliente no encontrado en la empresa activa.');
  if (!Array.isArray(input.lineas) || input.lineas.length === 0) throw new Error('La cotización necesita al menos una línea.');
  const transaction = await Quote.sequelize.transaction();
  try {
    const lines = [];
    let subtotal = 0n; let discount = 0n; let taxes = 0n;
    for (const raw of input.lineas) {
      let service = null;
      if (raw.servicioId) service = await Service.findOne({ where: { id: raw.servicioId, organizacionId: organizationId, activo: true }, transaction });
      if (raw.servicioId && !service) throw new Error('Servicio no encontrado o inactivo.');
      const qty = quantity(raw.cantidad);
      const unit = cents(service ? service.precio : raw.precioUnitario);
      const lineSubtotal = BigInt(Math.round(qty * 1000)) * unit / 1000n;
      const lineDiscount = cents(raw.descuento || 0);
      const lineTax = cents(raw.impuesto || 0);
      const lineTotal = lineSubtotal - lineDiscount + lineTax;
      if (lineTotal < 0n) throw new Error('Una línea no puede tener total negativo.');
      subtotal += lineSubtotal; discount += lineDiscount; taxes += lineTax;
      lines.push({ servicioId: service?.id || null, descripcion: service?.nombre || raw.descripcion, cantidad: qty, precioUnitario: amount(unit), descuento: amount(lineDiscount), impuesto: amount(lineTax), totalLinea: amount(lineTotal), servicioSnapshot: service ? service.toJSON() : null });
    }
    const quote = await Quote.create({ organizacionId: organizationId, clienteId: customer.id, numero: input.numero, estado: 'BORRADOR', moneda: input.moneda || 'CRC', fechaEmision: input.fechaEmision || new Date(), validaHasta: input.validaHasta || null, subtotal: amount(subtotal), descuento: amount(discount), impuestos: amount(taxes), total: amount(subtotal - discount + taxes), idempotencyKey }, { transaction });
    await QuoteLine.bulkCreate(lines.map((line) => ({ ...line, cotizacionId: quote.id })), { transaction });
    await transaction.commit();
    return quote;
  } catch (error) { await transaction.rollback(); throw error; }
}

async function listCustomers(organizationId, search, limit = 50, offset = 0) { const where = { organizacionId, estado: 'ACTIVO' }; if (search) where.nombre = { [Op.like]: `%${search}%` }; return Customer.findAndCountAll({ where, order: [['nombre', 'ASC']], limit: Math.min(Number(limit) || 50, 100), offset: Math.max(Number(offset) || 0, 0) }); }
async function listServices(organizationId) { return Service.findAll({ where: { organizacionId, activo: true }, order: [['nombre', 'ASC']] }); }
async function listQuotes(organizationId, query = {}) { const where = { organizacionId }; if (query.estado) where.estado = query.estado; return Quote.findAll({ where, include: [{ model: Customer, as: 'customer', attributes: ['id', 'nombre', 'email'] }], order: [['createdAt', 'DESC']], limit: Math.min(Number(query.limit) || 50, 100) }); }
async function listTasks(organizationId, status) { const where = { organizacionId }; if (status) where.estado = status; return Task.findAll({ where, order: [['vencimiento', 'ASC'], ['createdAt', 'DESC']] }); }

module.exports = { createQuote, listCustomers, listServices, listQuotes, listTasks };
