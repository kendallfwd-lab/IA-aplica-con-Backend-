const DEFAULT_LOCALE = process.env.INVOICE_LOCALE || 'es-CR';

function escapeXml(value) {
  return String(value ?? '').replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char]));
}

function hasValue(value) { return value !== null && value !== undefined && value !== ''; }

function formatMoney(value, currency = 'CRC') {
  if (!hasValue(value)) return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency, currencyDisplay: 'code', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(value) {
  if (!hasValue(value)) return '—';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : escapeXml(value);
}

function wrapText(value, maxChars = 44) {
  const text = String(value ?? '').trim();
  if (!text) return ['—'];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (word.length > maxChars) {
      if (current) { lines.push(current); current = ''; }
      for (let index = 0; index < word.length; index += maxChars) lines.push(word.slice(index, index + maxChars));
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) { lines.push(current); current = word; } else current = candidate;
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['—'];
}

function textBlock({ x, y, lines, className = 'value', lineHeight = 19 }) {
  return `<text x="${x}" y="${y}" class="${className}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join('')}</text>`;
}

function renderParty(party, x, y, width) {
  if (!party) return '';
  const name = party.nombre || party.name;
  const details = [party.nif_rfc || party.identificacion || party.identification, party.direccion || party.address, party.email, party.telefono || party.phone].filter(hasValue);
  if (!hasValue(name) && details.length === 0) return '';
  let output = `<text x="${x}" y="${y}" class="label">${x < 400 ? 'EMITIDA POR' : 'FACTURAR A'}</text>`;
  let currentY = y + 25;
  if (hasValue(name)) { output += textBlock({ x, y: currentY, lines: wrapText(name, Math.floor(width / 10)), className: 'partyName', lineHeight: 19 }); currentY += wrapText(name, Math.floor(width / 10)).length * 19 + 4; }
  for (const detail of details) { output += textBlock({ x, y: currentY, lines: wrapText(detail, Math.floor(width / 9)), className: 'muted', lineHeight: 16 }); currentY += wrapText(detail, Math.floor(width / 9)).length * 16 + 2; }
  return output;
}

function invoiceSvg(invoice = {}) {
  const currency = invoice.moneda || invoice.currency || 'CRC';
  const issuer = invoice.emisor || invoice.issuer || {};
  const recipient = invoice.receptor || invoice.recipient || {};
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const number = invoice.numero_factura || invoice.numeroFactura || `F-${invoice.id || ''}`;
  const detailRows = items.length ? items : [{ descripcion: 'Sin líneas registradas', cantidad: null, precio_unitario: null, importe: null }];
  const rowData = detailRows.map((item) => ({
    description: wrapText(item.descripcion || item.concepto || item.description || 'Servicio', 52),
    quantity: hasValue(item.cantidad ?? item.quantity) ? String(item.cantidad ?? item.quantity) : '—',
    unit: formatMoney(item.precio_unitario ?? item.precioUnitario ?? item.unitPrice, currency),
    amount: formatMoney(item.importe ?? item.amount ?? item.total, currency),
  }));
  const detailHeight = rowData.reduce((height, row) => height + Math.max(row.description.length, 1) * 22 + 12, 0);
  const tableTop = 380;
  const tableBottom = tableTop + detailHeight + 36;
  const summaryRows = [
    ['Subtotal', invoice.subtotal],
    [hasValue(invoice.descuento) ? 'Descuento' : null, invoice.descuento],
    ['Impuestos', invoice.impuestos],
  ].filter(([label]) => label);
  const summaryTop = tableBottom + 32;
  const footerNotes = [invoice.notas || invoice.notes, invoice.condiciones_pago || invoice.paymentTerms, invoice.referencia || invoice.reference].filter(hasValue);
  const footerHeight = footerNotes.length ? 90 : 0;
  const height = summaryTop + 150 + footerHeight;
  let rows = ''; let rowY = tableTop + 56;
  for (const row of rowData) {
    rows += textBlock({ x: 70, y: rowY, lines: row.description, className: 'row', lineHeight: 20 });
    rows += `<text x="455" y="${rowY}" class="row number">${escapeXml(row.quantity)}</text><text x="555" y="${rowY}" class="row number">${escapeXml(row.unit)}</text><text x="700" y="${rowY}" class="row number">${escapeXml(row.amount)}</text>`;
    rowY += Math.max(row.description.length, 1) * 22 + 12;
  }
  let summary = ''; let summaryY = summaryTop + 20;
  for (const [label, value] of summaryRows) { summary += `<text x="545" y="${summaryY}" class="summaryLabel">${label}</text><text x="730" y="${summaryY}" class="summaryValue">${escapeXml(formatMoney(value, currency))}</text>`; summaryY += 25; }
  const totalY = summaryY + 8;
  const notes = footerNotes.map((note) => wrapText(note, 95).map((line) => escapeXml(line)).join(' ')).join(' · ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="794" height="${height}" viewBox="0 0 794 ${height}" role="img" aria-label="Factura ${escapeXml(number)}">
  <style>
    .title{font:800 30px Arial,sans-serif;fill:#14263d}.brand{font:800 16px Arial,sans-serif;letter-spacing:2px;fill:#14786f}.label{font:800 11px Arial,sans-serif;letter-spacing:.7px;fill:#668096}.partyName{font:700 15px Arial,sans-serif;fill:#14263d}.value{font:14px Arial,sans-serif;fill:#14263d}.muted{font:12px Arial,sans-serif;fill:#718499}.row{font:13px Arial,sans-serif;fill:#243a50}.number,.summaryValue{font-variant-numeric:tabular-nums;text-anchor:end}.summaryLabel{font:13px Arial,sans-serif;fill:#667d91}.totalLabel{font:800 13px Arial,sans-serif;fill:#31556c}.total{font:800 21px Arial,sans-serif;fill:#087d70;font-variant-numeric:tabular-nums;text-anchor:end}.small{font:11px Arial,sans-serif;fill:#8293a1}.line{stroke:#d8e3e9;stroke-width:1}.soft{fill:#f4f8fa}.accent{fill:#167d73}
  </style>
  <rect width="100%" height="100%" fill="#ffffff"/><rect x="30" y="28" width="734" height="6" rx="3" class="accent"/><text x="60" y="88" class="brand">${escapeXml(issuer.nombre || issuer.name || 'SISTEMAVISION')}</text>${renderParty(issuer, 60, 125, 300)}
  <text x="480" y="86" class="title">FACTURA</text><text x="480" y="115" class="label">NÚMERO</text><text x="480" y="137" class="value">${escapeXml(number)}</text><text x="650" y="115" class="label">EMISIÓN</text><text x="650" y="137" class="value">${escapeXml(formatDate(invoice.fecha_emision || invoice.fechaEmision))}</text>${hasValue(invoice.fecha_vencimiento || invoice.fechaVencimiento) ? `<text x="650" y="165" class="label">VENCIMIENTO</text><text x="650" y="187" class="value">${escapeXml(formatDate(invoice.fecha_vencimiento || invoice.fechaVencimiento))}</text>` : ''}
  <line x1="60" y1="230" x2="734" y2="230" class="line"/>${renderParty(recipient, 60, 270, 310)}
  <rect x="60" y="${tableTop - 32}" width="674" height="36" rx="6" class="soft"/><text x="70" y="${tableTop - 9}" class="label">DESCRIPCIÓN</text><text x="455" y="${tableTop - 9}" class="label" text-anchor="end">CANT.</text><text x="555" y="${tableTop - 9}" class="label" text-anchor="end">PRECIO UNITARIO</text><text x="700" y="${tableTop - 9}" class="label" text-anchor="end">IMPORTE</text>${rows}<line x1="60" y1="${tableBottom}" x2="734" y2="${tableBottom}" class="line"/>
  ${summary}<rect x="500" y="${totalY + 15}" width="234" height="54" rx="8" class="soft"/><text x="520" y="${totalY + 48}" class="totalLabel">TOTAL</text><text x="714" y="${totalY + 48}" class="total">${escapeXml(formatMoney(invoice.total, currency))}</text>${footerNotes.length ? `<line x1="60" y1="${height - 72}" x2="734" y2="${height - 72}" class="line"/><text x="60" y="${height - 48}" class="small">${notes}</text>` : ''}<text x="60" y="${height - 20}" class="small">Documento administrativo. No es un comprobante fiscal autorizado.</text>
  </svg>`;
}

module.exports = { invoiceSvg, formatMoney, formatDate, wrapText };
