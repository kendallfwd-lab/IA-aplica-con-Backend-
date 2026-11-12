const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeInvoice, validateInvoice } = require('../services/invoiceService');

test('normaliza moneda e importes sin usar floats en el contrato', () => {
  const invoice = normalizeInvoice({ moneda: 'crc', total: '1234.50' });
  assert.equal(invoice.moneda, 'CRC');
  assert.equal(invoice.total, '1234.50');
});

test('rechaza inconsistencias entre líneas, subtotal e impuestos', () => {
  const invoice = normalizeInvoice({
    moneda: 'CRC', subtotal: 100, impuestos: 13, total: 120,
    items: [{ descripcion: 'Servicio', cantidad: 1, precio_unitario: 100 }],
  });
  const result = validateInvoice(invoice);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('total')));
});

test('permite extracción incompleta como pendiente para revisión', () => {
  const invoice = normalizeInvoice({ moneda: 'CRC', total: 50 });
  const result = validateInvoice(invoice);
  assert.equal(result.valid, true);
  assert.equal(result.detailed, false);
});
