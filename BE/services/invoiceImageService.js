function escapeXml(value) {
  return String(value ?? '').replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char]));
}

function invoiceSvg(invoice) {
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const rows = items.map((item, index) => {
    const y = 330 + index * 28;
    return `<text x="70" y="${y}" class="row">${escapeXml(item.descripcion || item.concepto || 'Producto')}</text><text x="430" y="${y}" class="row">${escapeXml(item.cantidad ?? 1)}</text><text x="520" y="${y}" class="row">${escapeXml(item.precio_unitario ?? '')}</text><text x="650" y="${y}" class="row">${escapeXml(item.importe ?? '')}</text>`;
  }).join('');
  const totalY = 360 + Math.max(items.length, 1) * 28;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${totalY + 150}" viewBox="0 0 800 ${totalY + 150}">
  <style>.title{font:700 28px Arial;fill:#0f172a}.label{font:700 13px Arial;fill:#64748b}.value{font:16px Arial;fill:#0f172a}.row{font:14px Arial;fill:#1e293b}.line{stroke:#cbd5e1;stroke-width:1}.total{font:700 22px Arial;fill:#047857}</style>
  <rect width="100%" height="100%" fill="#ffffff"/><rect x="30" y="30" width="740" height="${totalY + 80}" rx="14" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="70" y="85" class="title">FACTURA</text><text x="570" y="75" class="label">NÚMERO</text><text x="570" y="100" class="value">${escapeXml(invoice.numero_factura || `F-${invoice.id || ''}`)}</text>
  <text x="70" y="135" class="label">EMISOR</text><text x="70" y="158" class="value">${escapeXml(invoice.emisor?.nombre || 'Sin especificar')}</text>
  <text x="400" y="135" class="label">RECEPTOR</text><text x="400" y="158" class="value">${escapeXml(invoice.receptor?.nombre || 'Sin especificar')}</text>
  <text x="70" y="200" class="label">FECHA</text><text x="70" y="223" class="value">${escapeXml(invoice.fecha_emision || '')}</text><text x="400" y="200" class="label">MONEDA</text><text x="400" y="223" class="value">${escapeXml(invoice.moneda || 'CRC')}</text>
  <line x1="70" y1="270" x2="730" y2="270" class="line"/><text x="70" y="300" class="label">DESCRIPCIÓN</text><text x="430" y="300" class="label">CANT.</text><text x="520" y="300" class="label">P. UNIT.</text><text x="650" y="300" class="label">IMPORTE</text>${rows}
  <line x1="500" y1="${totalY + 20}" x2="730" y2="${totalY + 20}" class="line"/><text x="520" y="${totalY + 58}" class="label">TOTAL</text><text x="650" y="${totalY + 58}" class="total">${escapeXml(invoice.moneda || 'CRC')} ${escapeXml(invoice.total)}</text>
  </svg>`;
}

module.exports = { invoiceSvg };

