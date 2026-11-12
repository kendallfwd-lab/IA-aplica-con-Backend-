require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const sequelize = require('./config/database');
const { Factura, MemoriaChat, Customer, Contact, Service, Quote, Task } = require('./models');
const { analizarFactura } = require('./services/agentServiceFacturas');
const { saveInvoice, listInvoices, normalizeInvoice, validateInvoice } = require('./services/invoiceService');
const { respond, clearConversation } = require('./services/invoiceChatService');
const { getConversation, getTrainingRows } = require('./services/chatMemoryService');
const { invoiceSvg } = require('./services/invoiceImageService');
const { login, refresh, revoke } = require('./services/authService');
const { authenticate, requireRoles } = require('./middlewares/auth');
const { audit } = require('./services/auditService');
const { createQuote, listCustomers, listServices, listQuotes, listTasks } = require('./services/businessService');

async function facturaRecordUpdate(id, updates) { return Factura.update(updates, { where: { id } }); }

const app = express();
const PORT = Number(process.env.PORT) || 3002;
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (origin, callback) => (!origin || allowedOrigins.includes(origin) ? callback(null, true) : callback(new Error('Origen no permitido.'))), credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: process.env.JSON_LIMIT || '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: 'Demasiados intentos. Prueba más tarde.' } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api', apiLimiter);
// Capa de compatibilidad: las rutas actuales /api/* también están disponibles como /api/v1/*.
app.use('/api/v1', (req, _res, next) => { req.url = `/api${req.url}`; next(); });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

function validImageSignature(file) {
  if (!file?.buffer) return false;
  const b = file.buffer;
  return (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    || (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    || (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP');
}

function requireValidImage(req, res, next) {
  if (!req.file || !validImageSignature(req.file)) return res.status(415).json({ success: false, error: 'El archivo no es una imagen JPEG, PNG o WebP válida.' });
  return next();
}

function refreshCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 30 * 86400000, path: '/api/auth' };
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'SistemaVision BE' }));
app.get('/api/ready', async (_req, res) => {
  try { await sequelize.authenticate(); return res.json({ status: 'ok', database: 'mysql' }); }
  catch { return res.status(503).json({ status: 'error', database: 'mysql' }); }
});
app.get('/api/health/db', async (_req, res) => {
  try { await sequelize.authenticate(); return res.json({ status: 'ok', database: 'mysql' }); }
  catch { return res.status(503).json({ status: 'error', database: 'mysql' }); }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const result = await login(req.body.email, req.body.password);
    const csrf = require('crypto').randomBytes(24).toString('hex');
    res.cookie('refresh_token', result.refreshToken, refreshCookieOptions());
    res.cookie('csrf_token', csrf, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 30 * 86400000, path: '/api' });
    await audit(req, { accion: 'LOGIN', entidad: 'usuario', entidadId: result.user.id, despues: { email: result.user.email } });
    return res.json({ success: true, data: { user: result.user, accessToken: result.accessToken, csrfToken: csrf } });
  } catch (error) { return res.status(401).json({ success: false, error: error.message }); }
});

app.post('/api/auth/refresh', authLimiter, async (req, res) => {
  try {
    if (!req.cookies.csrf_token || req.cookies.csrf_token !== req.get('x-csrf-token')) return res.status(403).json({ success: false, error: 'Protección CSRF inválida.' });
    const result = await refresh(req.cookies.refresh_token);
    res.cookie('refresh_token', result.refreshToken, refreshCookieOptions());
    return res.json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
  } catch (error) { return res.status(401).json({ success: false, error: error.message }); }
});

app.post('/api/auth/logout', authenticate, async (req, res) => {
  await revoke(req.cookies.refresh_token);
  res.clearCookie('refresh_token', refreshCookieOptions());
  await audit(req, { accion: 'LOGOUT', entidad: 'usuario', entidadId: req.user.sub });
  return res.status(204).send();
});
app.get('/api/auth/me', authenticate, (req, res) => res.json({ success: true, data: { id: req.user.sub, email: req.user.email, rol: req.user.rol, organizacionId: req.user.organizacionId } }));

app.get('/api/clientes', authenticate, async (req, res) => {
  try { return res.json({ success: true, data: await listCustomers(req.user.organizacionId, req.query.search, req.query.limit, req.query.offset) }); } catch { return res.status(500).json({ success: false, error: 'No se pudieron consultar los clientes.' }); }
});
app.post('/api/clientes', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'CONTADOR', 'OPERADOR'), async (req, res) => {
  try { if (!req.body.nombre) return res.status(422).json({ success: false, error: 'El nombre del cliente es obligatorio.' }); const customer = await Customer.create({ organizacionId: req.user.organizacionId, nombre: req.body.nombre, identificacion: req.body.identificacion || null, email: req.body.email || null, telefono: req.body.telefono || null, direccion: req.body.direccion || null, notas: req.body.notas || null }); await audit(req, { accion: 'CREAR', entidad: 'cliente', entidadId: customer.id, despues: customer.toJSON() }); return res.status(201).json({ success: true, data: customer }); } catch { return res.status(400).json({ success: false, error: 'No se pudo crear el cliente.' }); }
});
app.patch('/api/clientes/:id', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'CONTADOR', 'OPERADOR'), async (req, res) => {
  const customer = await Customer.findOne({ where: { id: req.params.id, organizacionId: req.user.organizacionId } }); if (!customer) return res.status(404).json({ success: false, error: 'Cliente no encontrado.' });
  const before = customer.toJSON(); await customer.update(Object.fromEntries(Object.entries(req.body).filter(([key]) => ['nombre', 'identificacion', 'email', 'telefono', 'direccion', 'notas'].includes(key)))); await audit(req, { accion: 'EDITAR', entidad: 'cliente', entidadId: customer.id, antes: before, despues: customer.toJSON() }); return res.json({ success: true, data: customer });
});
app.post('/api/clientes/:id/archivar', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'CONTADOR'), async (req, res) => { const customer = await Customer.findOne({ where: { id: req.params.id, organizacionId: req.user.organizacionId } }); if (!customer) return res.status(404).json({ success: false, error: 'Cliente no encontrado.' }); await customer.update({ estado: 'ARCHIVADO', archivadoAt: new Date() }); await audit(req, { accion: 'ARCHIVAR', entidad: 'cliente', entidadId: customer.id }); return res.json({ success: true, data: customer }); });
app.get('/api/clientes/:id', authenticate, async (req, res) => { const customer = await Customer.findOne({ where: { id: req.params.id, organizacionId: req.user.organizacionId }, include: [{ model: Contact, as: 'contacts', required: false }] }).catch(() => null); if (!customer) return res.status(404).json({ success: false, error: 'Cliente no encontrado.' }); return res.json({ success: true, data: customer }); });

app.get('/api/servicios', authenticate, async (req, res) => res.json({ success: true, data: await listServices(req.user.organizacionId) }));
app.post('/api/servicios', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'CONTADOR'), async (req, res) => { try { if (!req.body.nombre || req.body.precio == null) return res.status(422).json({ success: false, error: 'Nombre y precio son obligatorios.' }); const service = await Service.create({ organizacionId: req.user.organizacionId, nombre: req.body.nombre, descripcion: req.body.descripcion || null, precio: req.body.precio, moneda: req.body.moneda || 'CRC' }); await audit(req, { accion: 'CREAR', entidad: 'servicio', entidadId: service.id }); return res.status(201).json({ success: true, data: service }); } catch (error) { return res.status(400).json({ success: false, error: error.message }); } });

app.get('/api/cotizaciones', authenticate, async (req, res) => { try { return res.json({ success: true, data: await listQuotes(req.user.organizacionId, req.query) }); } catch { return res.status(500).json({ success: false, error: 'No se pudieron consultar las cotizaciones.' }); } });
app.post('/api/cotizaciones', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'CONTADOR', 'OPERADOR'), async (req, res) => { try { const quote = await createQuote(req.body, req.user.organizacionId, req.get('Idempotency-Key')); await audit(req, { accion: 'CREAR', entidad: 'cotizacion', entidadId: quote.id, despues: { total: quote.total } }); return res.status(201).json({ success: true, data: quote }); } catch (error) { return res.status(400).json({ success: false, error: error.message }); } });
app.post('/api/cotizaciones/:id/aceptar', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'CONTADOR'), async (req, res) => { const quote = await Quote.findOne({ where: { id: req.params.id, organizacionId: req.user.organizacionId } }); if (!quote) return res.status(404).json({ success: false, error: 'Cotización no encontrada.' }); if (quote.estado !== 'BORRADOR' && quote.estado !== 'ENVIADA') return res.status(409).json({ success: false, error: 'La cotización no está disponible para aceptación.' }); await quote.update({ estado: 'ACEPTADA', version: quote.version + 1 }); await audit(req, { accion: 'ACEPTAR', entidad: 'cotizacion', entidadId: quote.id }); return res.json({ success: true, data: quote }); });
app.post('/api/cotizaciones/:id/convertir-factura', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'CONTADOR'), async (req, res) => {
  const quote = await Quote.findOne({ where: { id: req.params.id, organizacionId: req.user.organizacionId } }); if (!quote) return res.status(404).json({ success: false, error: 'Cotización no encontrada.' }); if (quote.estado !== 'ACEPTADA') return res.status(409).json({ success: false, error: 'Solo una cotización aceptada puede convertirse.' }); if (quote.facturaId) return res.status(409).json({ success: false, error: `Ya fue convertida en la factura #${quote.facturaId}.` });
  const lines = await require('./models').QuoteLine.findAll({ where: { cotizacionId: quote.id } });
  try { const factura = await saveInvoice({ numero_factura: req.body.numero_factura, fecha_emision: req.body.fecha_emision, moneda: quote.moneda, subtotal: quote.subtotal, impuestos: quote.impuestos, total: quote.total, items: lines.map((line) => ({ descripcion: line.descripcion, cantidad: line.cantidad, precio_unitario: line.precioUnitario, importe: line.totalLinea })) }, `quote-${quote.id}`, { organizacionId: req.user.organizacionId }); await facturaRecordUpdate(factura.id, { clienteId: quote.clienteId, cotizacionId: quote.id }); await quote.update({ facturaId: factura.id }); await audit(req, { accion: 'CONVERTIR', entidad: 'cotizacion', entidadId: quote.id, despues: { facturaId: factura.id } }); return res.status(201).json({ success: true, data: factura }); } catch (error) { return res.status(400).json({ success: false, error: error.message }); }
});

app.get('/api/tareas', authenticate, async (req, res) => res.json({ success: true, data: await listTasks(req.user.organizacionId, req.query.estado) }));
app.post('/api/tareas', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'CONTADOR', 'OPERADOR'), async (req, res) => { try { if (!req.body.titulo) return res.status(422).json({ success: false, error: 'El título es obligatorio.' }); const task = await Task.create({ organizacionId: req.user.organizacionId, clienteId: req.body.clienteId || null, cotizacionId: req.body.cotizacionId || null, facturaId: req.body.facturaId || null, asignadoA: req.body.asignadoA || null, titulo: req.body.titulo, descripcion: req.body.descripcion || null, vencimiento: req.body.vencimiento || null, prioridad: req.body.prioridad || 'MEDIA' }); await audit(req, { accion: 'CREAR', entidad: 'tarea', entidadId: task.id }); return res.status(201).json({ success: true, data: task }); } catch (error) { return res.status(400).json({ success: false, error: error.message }); } });

app.use('/api/facturas', authenticate);
app.get('/api/facturas', async (req, res) => {
  try { return res.json({ success: true, data: await listInvoices(req.query.limit, { organizacionId: req.user.organizacionId, estado: req.query.estado, search: req.query.search }) }); }
  catch { return res.status(500).json({ success: false, error: 'No se pudieron consultar las facturas.' }); }
});

app.get('/api/dashboard/resumen', authenticate, async (req, res) => {
  try {
    const where = { organizacionId: req.user.organizacionId };
    const [total, pendientes, aprobadas, rechazadas, gastoAprobado] = await Promise.all([
      Factura.count({ where }),
      Factura.count({ where: { ...where, estado: 'PENDIENTE_REVISION' } }),
      Factura.count({ where: { ...where, estado: 'APROBADA' } }),
      Factura.count({ where: { ...where, estado: 'RECHAZADA' } }),
      Factura.sum('total', { where: { ...where, estado: 'APROBADA' } }),
    ]);
    return res.json({ success: true, data: { total, pendientes, aprobadas, rechazadas, gastoAprobado: Number(gastoAprobado || 0) } });
  } catch { return res.status(500).json({ success: false, error: 'No se pudo generar el resumen.' }); }
});

app.get('/api/facturas/:id/imagen', async (req, res) => {
  try {
    const factura = await Factura.findOne({ where: { id: req.params.id, organizacionId: req.user.organizacionId } });
    if (!factura) return res.status(404).json({ success: false, error: 'Factura no encontrada.' });
    res.set('Content-Security-Policy', "default-src 'none'; img-src data:");
    return res.type('image/svg+xml').send(invoiceSvg(factura.toJSON()));
  } catch { return res.status(500).json({ success: false, error: 'No se pudo generar la imagen.' }); }
});

app.get('/api/facturas/:id/imagen-original', async (req, res) => {
  try {
    const factura = await Factura.findOne({ where: { id: req.params.id, organizacionId: req.user.organizacionId }, attributes: ['imagenOriginal', 'imagenMimeType'] });
    if (!factura?.imagenOriginal) return res.status(404).json({ success: false, error: 'La factura no tiene imagen original.' });
    res.set('Content-Disposition', 'inline');
    return res.type(factura.imagenMimeType || 'application/octet-stream').send(factura.imagenOriginal);
  } catch { return res.status(500).json({ success: false, error: 'No se pudo descargar el documento.' }); }
});

app.post('/api/facturas/manual', async (req, res) => {
  try {
    const factura = await saveInvoice(req.body, req.body.conversationId || null, { organizacionId: req.user.organizacionId });
    await audit(req, { accion: 'CREAR', entidad: 'factura', entidadId: factura.id, despues: { estado: factura.estado } });
    return res.status(201).json({ success: true, data: factura, imageUrl: `/api/facturas/${factura.id}/imagen` });
  } catch (error) { return res.status(400).json({ success: false, error: error.message }); }
});

app.post('/api/facturas/chat', async (req, res) => {
  try {
    const conversationId = req.body.conversationId || req.get('x-conversation-id') || `conversation-${Date.now()}`;
    const result = await respond(conversationId, req.body.message, { consentToTraining: req.body.consentToTraining === true, organizacionId: req.user.organizacionId });
    return res.json({ success: true, data: result, imageUrl: result.invoiceId ? `/api/facturas/${result.invoiceId}/imagen` : null });
  } catch (error) { return res.status(400).json({ success: false, error: error.message }); }
});

app.post('/api/facturas/chat-imagen', upload.single('factura'), requireValidImage, async (req, res) => {
  try {
    const conversationId = req.body.conversationId || req.get('x-conversation-id') || `conversation-${Date.now()}`;
    const result = await analizarFactura(req.file.buffer, { mimeType: req.file.mimetype, imageBuffer: req.file.buffer, conversationId, organizacionId: req.user.organizacionId, detail: req.body.detail || 'low', guardar: true, prompt: req.body.message || undefined });
    const { saveMessage } = require('./services/chatMemoryService');
    const consent = req.body.consentToTraining === 'true';
    await saveMessage({ organizacionId: req.user.organizacionId, conversationId, role: 'user', content: '[Imagen de factura]', model: process.env.OPENAI_VISION_MODEL || 'gpt-4o', consentToTraining: consent, metadata: { mimeType: req.file.mimetype, hasImage: true } });
    await saveMessage({ organizacionId: req.user.organizacionId, conversationId, role: 'assistant', content: 'Factura analizada y enviada a revisión humana.', structuredData: result.data, model: process.env.OPENAI_VISION_MODEL || 'gpt-4o', consentToTraining: consent, metadata: { invoiceId: result.saved?.id, hasImage: true } });
    return res.json({ success: true, data: result, imageUrl: result.saved?.id ? `/api/facturas/${result.saved.id}/imagen` : null });
  } catch (error) { return res.status(400).json({ success: false, error: error.message }); }
});

app.post('/api/facturas/analizar', upload.single('factura'), requireValidImage, async (req, res) => {
  try {
    const resultado = await analizarFactura(req.file.buffer, { mimeType: req.file.mimetype, imageBuffer: req.file.buffer, organizacionId: req.user.organizacionId, conversationId: req.body?.conversationId || 'default', detail: req.body?.detail || 'low', guardar: req.body?.guardar !== 'false' });
    return res.json({ success: true, ...resultado });
  } catch (error) { return res.status(400).json({ success: false, error: error.message }); }
});

app.patch('/api/facturas/:id', requireRoles('SUPER_ADMIN', 'ADMIN', 'CONTADOR', 'OPERADOR'), async (req, res) => {
  try {
    const factura = await Factura.findOne({ where: { id: req.params.id, organizacionId: req.user.organizacionId } });
    if (!factura) return res.status(404).json({ success: false, error: 'Factura no encontrada.' });
    if (factura.estado === 'APROBADA') return res.status(409).json({ success: false, error: 'Una factura aprobada no se puede editar.' });
    const before = factura.toJSON();
    const allowed = ['numeroFactura', 'fechaEmision', 'moneda', 'subtotal', 'impuestos', 'total', 'emisor', 'receptor', 'items'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const candidate = normalizeInvoice({ ...factura.toJSON(), ...updates }, factura.conversationId);
    candidate.organizacionId = req.user.organizacionId;
    const validation = validateInvoice(candidate);
    if (!validation.valid) return res.status(422).json({ success: false, error: validation.errors.join(' ') });
    await factura.update({ numeroFactura: candidate.numero_factura, fechaEmision: candidate.fecha_emision, moneda: candidate.moneda, subtotal: candidate.subtotal, impuestos: candidate.impuestos, total: candidate.total, emisor: candidate.emisor, receptor: candidate.receptor, items: candidate.items, datosEstructurados: candidate, revisionComentario: req.body.revisionComentario || null, estado: 'PENDIENTE_REVISION' });
    await audit(req, { accion: 'EDITAR', entidad: 'factura', entidadId: factura.id, antes: before, despues: factura.toJSON() });
    return res.json({ success: true, data: factura });
  } catch (error) { return res.status(400).json({ success: false, error: error.message }); }
});

app.post('/api/facturas/:id/aprobar', requireRoles('SUPER_ADMIN', 'ADMIN', 'CONTADOR'), async (req, res) => {
  const factura = await Factura.findOne({ where: { id: req.params.id, organizacionId: req.user.organizacionId } });
  if (!factura) return res.status(404).json({ success: false, error: 'Factura no encontrada.' });
  if (factura.posibleDuplicado) return res.status(409).json({ success: false, error: 'Revisa el posible duplicado antes de aprobar.' });
  await factura.update({ estado: 'APROBADA', revisadoPor: req.user.sub, revisadoAt: new Date(), revisionComentario: req.body.comentario || null });
  await audit(req, { accion: 'APROBAR', entidad: 'factura', entidadId: factura.id, despues: { estado: 'APROBADA' } });
  return res.json({ success: true, data: factura });
});

app.post('/api/facturas/:id/rechazar', requireRoles('SUPER_ADMIN', 'ADMIN', 'CONTADOR', 'OPERADOR'), async (req, res) => {
  const factura = await Factura.findOne({ where: { id: req.params.id, organizacionId: req.user.organizacionId } });
  if (!factura) return res.status(404).json({ success: false, error: 'Factura no encontrada.' });
  await factura.update({ estado: 'RECHAZADA', revisadoPor: req.user.sub, revisadoAt: new Date(), revisionComentario: req.body.comentario || null });
  await audit(req, { accion: 'RECHAZAR', entidad: 'factura', entidadId: factura.id, despues: { estado: 'RECHAZADA', comentario: req.body.comentario || null } });
  return res.json({ success: true, data: factura });
});

app.get('/api/chats/:conversationId/memoria', authenticate, async (req, res) => {
  try { return res.json({ success: true, data: await getConversation(req.params.conversationId, 24, req.user.organizacionId) }); }
  catch { return res.status(500).json({ success: false, error: 'No se pudo consultar la conversación.' }); }
});
app.get('/api/chats/memoria/entrenamiento', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try { return res.json({ success: true, data: await getTrainingRows(req.query.limit, req.user.organizacionId) }); }
  catch { return res.status(500).json({ success: false, error: 'No se pudo consultar el conjunto autorizado.' }); }
});
app.delete('/api/facturas/chat/:conversationId', authenticate, async (req, res) => {
  await MemoriaChat.destroy({ where: { conversationId: req.params.conversationId, organizacionId: req.user.organizacionId } });
  clearConversation(req.params.conversationId, req.user.organizacionId);
  await audit(req, { accion: 'ELIMINAR', entidad: 'conversacion', entidadId: req.params.conversationId });
  return res.status(204).send();
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ success: false, error: 'El archivo supera el límite permitido o no es válido.' });
  return res.status(400).json({ success: false, error: err.message || 'Solicitud inválida.' });
});

if (require.main === module) app.listen(PORT, () => console.log(`Servidor backend corriendo en http://localhost:${PORT}`));
module.exports = app;
