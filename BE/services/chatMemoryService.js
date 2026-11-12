const { MemoriaChat } = require('../models');

function redactForTraining(content) {
  return String(content)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL_REDACTADO]')
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[TELEFONO_REDACTADO]');
}

async function saveMessage({ organizacionId, conversationId, role, content, structuredData = null, model = null, consentToTraining = false, metadata = null }) {
  if (!organizacionId) throw new Error('La conversación debe pertenecer a una organización autenticada.');
  const consent = Boolean(consentToTraining);
  return MemoriaChat.create({
    organizacionId,
    conversationId,
    role,
    content: String(content),
    trainingContent: consent ? redactForTraining(content) : null,
    structuredData,
    model,
    consentToTraining: consent,
    trainingEligible: consent,
    metadata,
  });
}

async function getConversation(conversationId, limit = 24, organizacionId) {
  const rows = await MemoriaChat.findAll({
    where: { conversationId, organizacionId },
    order: [['createdAt', 'ASC']],
    limit: Math.min(Number(limit) || 24, 100),
  });
  return rows;
}

async function getTrainingRows(limit = 100, organizacionId) {
  return MemoriaChat.findAll({
    where: { trainingEligible: true, organizacionId },
    order: [['createdAt', 'ASC']],
    limit: Math.min(Number(limit) || 100, 1000),
    attributes: ['id', 'conversationId', 'role', 'trainingContent', 'structuredData', 'model', 'createdAt'],
  });
}

module.exports = { saveMessage, getConversation, getTrainingRows, redactForTraining };
