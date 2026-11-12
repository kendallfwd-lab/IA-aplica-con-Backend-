import { useMemo, useState } from 'react';
import './App.css';
import './records.css';

const API = 'http://localhost:3002';

const emptyInvoice = {
  numero_factura: '', fecha_emision: '', moneda: 'CRC', subtotal: '', impuestos: '', total: '',
  emisor: { nombre: '', nif_rfc: '' }, receptor: { nombre: '', nif_rfc: '' },
  items: [{ descripcion: '', cantidad: 1, precio_unitario: '', importe: '' }],
};

function FacturasPanel({ facturas, loading, onRefresh }) {
  const [search, setSearch] = useState('');
  const filtered = facturas.filter((factura) => JSON.stringify(factura).toLowerCase().includes(search.toLowerCase()));
  return <section className="panel records-panel"><div className="panel-heading"><div><span className="eyebrow">BASE DE DATOS</span><h2>Facturas guardadas</h2></div><button className="ghost" onClick={onRefresh}>{loading ? 'Actualizando…' : 'Actualizar'}</button></div><div className="records-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por número, emisor o receptor" aria-label="Buscar facturas" /><span>{filtered.length} registro{filtered.length === 1 ? '' : 's'}</span></div>{loading ? <p className="empty-inline">Cargando facturas…</p> : filtered.length === 0 ? <p className="empty-inline">No hay facturas que mostrar.</p> : <div className="table-wrap"><table className="records-table"><thead><tr><th>Número</th><th>Fecha</th><th>Emisor</th><th>Receptor</th><th>Total</th><th>Acciones</th></tr></thead><tbody>{filtered.map((factura) => <tr key={factura.id}><td><strong>{factura.numeroFactura || factura.numero_factura || `F-${factura.id}`}</strong></td><td>{factura.fechaEmision || factura.fecha_emision || '—'}</td><td>{factura.emisor?.nombre || '—'}</td><td>{factura.receptor?.nombre || '—'}</td><td>{factura.moneda || 'CRC'} {factura.total}</td><td><a href={`${API}/api/facturas/${factura.id}/imagen`} target="_blank" rel="noreferrer">Ver imagen</a><a href={`${API}/api/facturas/${factura.id}/imagen-original`} target="_blank" rel="noreferrer">Original</a></td></tr>)}</tbody></table></div>}</section>;
}

function App() {
  const [mode, setMode] = useState('ai');
  const [showFacturas, setShowFacturas] = useState(false);
  const [facturas, setFacturas] = useState([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [conversationId] = useState(() => `web-${crypto.randomUUID?.() || Date.now()}`);
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hola. Te ayudaré a crear una factura real paso a paso. ¿Cuál es el nombre del emisor?' }]);
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [manual, setManual] = useState(emptyInvoice);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [consentTraining, setConsentTraining] = useState(false);

  const imageUrl = useMemo(() => invoice?.id ? `${API}/api/facturas/${invoice.id}/imagen` : null, [invoice]);

  async function loadFacturas() {
    setLoadingFacturas(true);
    try { const response = await fetch(`${API}/api/facturas?limit=100`); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'No se pudieron cargar las facturas.'); setFacturas(body.data || []); } catch (err) { setError(err.message); } finally { setLoadingFacturas(false); }
  }

  async function sendChat(event) {
    event.preventDefault();
    if ((!message.trim() && !imageFile) || busy) return;
    const text = message.trim();
    setMessage(''); setError(''); setMessages((list) => [...list, { role: 'user', text: text || `Imagen adjunta: ${imageFile.name}` }]); setBusy(true);
    try {
      let options;
      if (imageFile) {
        const form = new FormData(); form.append('factura', imageFile); form.append('conversationId', conversationId); form.append('message', text || 'Analiza esta factura y guárdala.'); form.append('consentToTraining', String(consentTraining));
        options = { method: 'POST', body: form };
      } else {
        options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, message: text, consentToTraining: consentTraining }) };
      }
      const response = await fetch(`${API}${imageFile ? '/api/facturas/chat-imagen' : '/api/facturas/chat'}`, options);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No se pudo contactar al asistente.');
      const result = body.data;
      setMessages((list) => [...list, { role: 'assistant', text: result.reply || 'Factura analizada y guardada en MySQL.' }]);
      if (result.saved?.id) setInvoice({ ...(result.data || {}), id: result.saved.id });
      setImageFile(null);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  function changeManual(field, value) { setManual((current) => ({ ...current, [field]: value })); }
  function changeParty(party, field, value) { setManual((current) => ({ ...current, [party]: { ...current[party], [field]: value } })); }
  function changeItem(index, field, value) { setManual((current) => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, [field]: value } : item) })); }

  async function saveManual(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch(`${API}/api/facturas/manual`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(manual) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'No se pudo guardar la factura.');
      setInvoice(body.data);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  function reset() { setInvoice(null); setManual(emptyInvoice); setMessages([{ role: 'assistant', text: 'Comencemos otra factura. ¿Cuál es el nombre del emisor?' }]); }

  return <main className="shell">
    <header className="topbar"><div><span className="eyebrow">SISTEMAVISION</span><h1>Facturas inteligentes</h1><p>Crea, conversa y comparte facturas con tus datos guardados en MySQL.</p></div><button className="ghost" onClick={reset}>Nueva factura</button></header>
    <nav className="tabs" aria-label="Navegación principal"><button className={!showFacturas && mode === 'ai' ? 'active' : ''} onClick={() => { setShowFacturas(false); setMode('ai'); }}>Asistente IA</button><button className={!showFacturas && mode === 'manual' ? 'active' : ''} onClick={() => { setShowFacturas(false); setMode('manual'); }}>Crear a mano</button><button className={showFacturas ? 'active' : ''} onClick={() => { setShowFacturas(true); loadFacturas(); }}>Facturas</button></nav>
    {!showFacturas && <section className="workspace">
      <div className="panel main-panel">
        {mode === 'ai' ? <>
          <div className="panel-heading"><div><span className="eyebrow">CONVERSACIÓN</span><h2>Tu asistente de facturación</h2></div><span className="status"><i /> En línea</span></div>
          <div className="chat" aria-live="polite">{messages.map((item, index) => <div className={`bubble ${item.role}`} key={`${item.role}-${index}`}><span>{item.role === 'assistant' ? 'IA' : 'Tú'}</span><p>{item.text}</p></div>)}{busy && <div className="bubble assistant"><span>IA</span><p className="typing">Escribiendo…</p></div>}</div>
          <form className="composer-wrap" onSubmit={sendChat}><div className="composer"><label className="attach" title="Adjuntar foto de factura"><input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />📎</label><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={imageFile ? imageFile.name : 'Escribe la respuesta o pide una factura…'} aria-label="Mensaje para el asistente" /><button disabled={busy || (!message.trim() && !imageFile)}>Enviar</button></div><label className="consent"><input type="checkbox" checked={consentTraining} onChange={(event) => setConsentTraining(event.target.checked)} /> Autorizo usar esta conversación, de forma anonimizada, para mejorar el asistente.</label></form>
        </> : <>
          <div className="panel-heading"><div><span className="eyebrow">FORMULARIO</span><h2>Completa tu factura</h2></div></div>
          <form className="invoice-form" onSubmit={saveManual}><div className="form-grid"><label>Número<input value={manual.numero_factura} onChange={(e) => changeManual('numero_factura', e.target.value)} required /></label><label>Fecha<input type="date" value={manual.fecha_emision} onChange={(e) => changeManual('fecha_emision', e.target.value)} required /></label><label>Moneda<select value={manual.moneda} onChange={(e) => changeManual('moneda', e.target.value)}><option>CRC</option><option>USD</option><option>EUR</option></select></label><label>Total<input type="number" step="0.01" value={manual.total} onChange={(e) => changeManual('total', e.target.value)} required /></label></div><div className="two-cols"><fieldset><legend>Emisor</legend><input placeholder="Nombre" value={manual.emisor.nombre} onChange={(e) => changeParty('emisor', 'nombre', e.target.value)} required /><input placeholder="Identificación (opcional)" value={manual.emisor.nif_rfc} onChange={(e) => changeParty('emisor', 'nif_rfc', e.target.value)} /></fieldset><fieldset><legend>Receptor</legend><input placeholder="Nombre" value={manual.receptor.nombre} onChange={(e) => changeParty('receptor', 'nombre', e.target.value)} required /><input placeholder="Identificación (opcional)" value={manual.receptor.nif_rfc} onChange={(e) => changeParty('receptor', 'nif_rfc', e.target.value)} /></fieldset></div><fieldset><legend>Productos o servicios</legend>{manual.items.map((item, index) => <div className="item-row" key={index}><input placeholder="Descripción" value={item.descripcion} onChange={(e) => changeItem(index, 'descripcion', e.target.value)} /><input type="number" placeholder="Cantidad" value={item.cantidad} onChange={(e) => changeItem(index, 'cantidad', e.target.value)} /><input type="number" step="0.01" placeholder="Importe" value={item.importe} onChange={(e) => changeItem(index, 'importe', e.target.value)} /></div>)}<button type="button" className="add-item" onClick={() => setManual((current) => ({ ...current, items: [...current.items, { descripcion: '', cantidad: 1, importe: '' }] }))}>+ Agregar línea</button></fieldset><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar factura'}</button></form>
        </>}
        {error && <p className="error">{error}</p>}
      </div>
      <aside className="panel preview-panel"><div className="panel-heading"><div><span className="eyebrow">RESULTADO</span><h2>Factura lista</h2></div></div>{invoice ? <><div className="invoice-card"><div className="invoice-mark">SV</div><h3>Factura #{invoice.numero_factura || invoice.id}</h3><p>{invoice.emisor?.nombre || 'Emisor'} → {invoice.receptor?.nombre || 'Receptor'}</p><strong>{invoice.moneda} {invoice.total}</strong><small>Guardada en MySQL · ID {invoice.id}</small></div><img className="invoice-image" src={imageUrl} alt="Vista previa de la factura generada" /><div className="actions"><a className="primary link-button" href={imageUrl} target="_blank" rel="noreferrer">Ver imagen</a><a className="secondary link-button" href={imageUrl} download={`factura-${invoice.id}.svg`}>Descargar</a></div></> : <div className="empty"><div className="empty-icon">✦</div><h3>Aquí aparecerá tu factura</h3><p>Conversa con la IA o completa el formulario para crearla y obtener una imagen compartible.</p></div>}</aside>
    </section>}
    {showFacturas && <FacturasPanel facturas={facturas} loading={loadingFacturas} onRefresh={loadFacturas} />}
  </main>;
}

export default App;
