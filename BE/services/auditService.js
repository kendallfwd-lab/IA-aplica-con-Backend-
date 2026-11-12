const { AuditLog } = require('../models');

async function audit(req, data) {
  try {
    await AuditLog.create({
      usuarioId: req.user?.sub || null,
      organizacionId: req.user?.organizacionId || null,
      accion: data.accion,
      entidad: data.entidad,
      entidadId: data.entidadId == null ? null : String(data.entidadId),
      antes: data.antes || null,
      despues: data.despues || null,
      ip: req.ip,
      userAgent: (req.get('user-agent') || '').slice(0, 255),
    });
  } catch (error) {
    console.error('audit_write_failed', error.message);
  }
}

module.exports = { audit };
