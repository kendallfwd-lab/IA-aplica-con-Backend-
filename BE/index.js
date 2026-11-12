const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const sequelize = require('./config/database');
const { analizarFactura } = require('./services/agentServiceFacturas');
const { saveInvoice, listInvoices } = require('./services/invoiceService');
const { respond, clearConversation } = require('./services/invoiceChatService');
const { getConversation, getTrainingRows } = require('./services/chatMemoryService');
const { invoiceSvg } = require('./services/invoiceImageService');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG o WebP).'));
  },
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SistemaVision BE' });
});

app.get('/api/health/db', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'mysql' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'mysql', error: error.message });
  }
});

app.get('/api/facturas', async (req, res) => {
  try {
    res.json({ success: true, data: await listInvoices(req.query.limit) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/facturas/:id/imagen', async (req, res) => {
  try {
    const { Factura } = require('./models');
    const factura = await Factura.findByPk(req.params.id);
    if (!factura) return res.status(404).send('Factura no encontrada');
    res.type('image/svg+xml').send(invoiceSvg(factura.toJSON()));
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/api/facturas/:id/imagen-original', async (req, res) => {
  try {
    const { Factura } = require('./models');
    const factura = await Factura.findByPk(req.params.id, { attributes: ['imagenOriginal', 'imagenMimeType'] });
    if (!factura?.imagenOriginal) return res.status(404).send('La factura no tiene imagen original');
    res.type(factura.imagenMimeType || 'application/octet-stream').send(factura.imagenOriginal);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post('/api/facturas/manual', async (req, res) => {
  try {
    const factura = await saveInvoice(req.body, req.body.conversationId || null);
    res.status(201).json({ success: true, data: factura, imageUrl: `/api/facturas/${factura.id}/imagen` });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/facturas/chat', async (req, res) => {
  try {
    const conversationId = req.body.conversationId || req.get('x-conversation-id') || `conversation-${Date.now()}`;
    const result = await respond(conversationId, req.body.message, {
      consentToTraining: req.body.consentToTraining === true,
    });
    res.json({ success: true, data: result, imageUrl: result.invoiceId ? `/api/facturas/${result.invoiceId}/imagen` : null });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/facturas/chat-imagen', upload.single('factura'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Adjunta una imagen en el campo "factura".' });
    const conversationId = req.body.conversationId || req.get('x-conversation-id') || `conversation-${Date.now()}`;
    const result = await analizarFactura(req.file.buffer, {
      mimeType: req.file.mimetype,
      imageBuffer: req.file.buffer,
      conversationId,
      detail: req.body.detail || 'low',
      guardar: true,
      prompt: req.body.message || undefined,
    });
    const { saveMessage } = require('./services/chatMemoryService');
    const consent = req.body.consentToTraining === 'true';
    await saveMessage({ conversationId, role: 'user', content: `[Imagen de factura] ${req.body.message || 'Analiza esta factura.'}`, model: process.env.OPENAI_VISION_MODEL || 'gpt-4o', consentToTraining: consent, metadata: { mimeType: req.file.mimetype, hasImage: true } });
    await saveMessage({ conversationId, role: 'assistant', content: 'Factura analizada y guardada en MySQL.', structuredData: result.data, model: process.env.OPENAI_VISION_MODEL || 'gpt-4o', consentToTraining: consent, metadata: { invoiceId: result.saved?.id, hasImage: true } });
    res.json({ success: true, data: result, imageUrl: result.saved?.id ? `/api/facturas/${result.saved.id}/imagen` : null });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/chats/:conversationId/memoria', async (req, res) => {
  try {
    const rows = await getConversation(req.params.conversationId);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/chats/memoria/entrenamiento', async (req, res) => {
  try {
    const rows = await getTrainingRows(req.query.limit);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/facturas/chat/:conversationId', (req, res) => {
  clearConversation(req.params.conversationId);
  res.status(204).send();
});

app.post('/api/facturas/analizar', upload.single('factura'), async (req, res) => {
  try {
    const imagen = req.file?.buffer || req.body?.imagen || req.body?.url;
    if (!imagen) {
      return res.status(400).json({ error: 'Adjunta una imagen en el campo "factura".' });
    }

    const resultado = await analizarFactura(imagen, {
      mimeType: req.file?.mimetype,
      conversationId: req.body?.conversationId || req.get('x-conversation-id') || 'default',
      detail: req.body?.detail || 'low',
      guardar: req.body?.guardar !== 'false',
    });
    return res.json({ success: true, ...resultado });
  } catch (error) {
    console.error('Error al analizar factura:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});

module.exports = app;
