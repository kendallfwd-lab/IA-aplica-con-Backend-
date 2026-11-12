const test = require('node:test');
const assert = require('node:assert/strict');
const { invoiceSvg, formatMoney, wrapText } = require('../services/invoiceImageService');

test('renderiza una factura con importes, resumen y altura dinámica', () => {
  const svg = invoiceSvg({ numero_factura: 'FICT-0002', fecha_emision: '2026-11-05', moneda: 'CRC', subtotal: 42000, impuestos: 5460, total: 47460, emisor: { nombre: 'Servicios Digitales Ejemplo' }, receptor: { nombre: 'Cliente Demostración 2' }, items: [{ descripcion: 'Soporte técnico mensual', cantidad: 1, precio_unitario: 42000, importe: 42000 }] });
  assert.match(svg, /FACTURA/);
  assert.match(svg, /Subtotal/);
  assert.match(svg, /Impuestos/);
  assert.match(svg, /FICT-0002/);
  assert.ok(svg.includes('47') && svg.includes('460'));
});

test('escapa contenido dinámico y separa descripciones largas', () => {
  const svg = invoiceSvg({ total: 0, numero_factura: '<script>alert(1)</script>', items: [{ descripcion: 'Servicio '.repeat(20), cantidad: 1, precio_unitario: 0, importe: 0 }] });
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(wrapText('Servicio '.repeat(20), 30).length > 1);
  assert.match(formatMoney(0, 'CRC'), /0/);
});
