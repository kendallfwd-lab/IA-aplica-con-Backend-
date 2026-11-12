const { MemoriaChat } = require('../models');

function redactForTraining(content) {
  return String(content)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL_REDACTADO]')
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[TELEFONO_REDACTADO]');
}

async function saveMessage({ conversationId, role, content, structuredData = null, model = null, consentToTraining = false, metadata = null }) {
  const consent = Boolean(consentToTraining);
  return MemoriaChat.create({
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

async function getConversation(conversationId, limit = 24) {
  const rows = await MemoriaChat.findAll({
    where: { conversationId },
    order: [['createdAt', 'ASC']],
    limit: Math.min(Number(limit) || 24, 100),
  });
  return rows;
}

async function getTrainingRows(limit = 100) {
  return MemoriaChat.findAll({
    where: { trainingEligible: true },
    order: [['createdAt', 'ASC']],
    limit: Math.min(Number(limit) || 100, 1000),
    attributes: ['id', 'conversationId', 'role', 'trainingContent', 'structuredData', 'model', 'createdAt'],
  });
}

module.exports = { saveMessage, getConversation, getTrainingRows, redactForTraining };

