module.exports = (sequelize, DataTypes) => sequelize.define('AuditLog', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  usuarioId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'usuario_id' },
  organizacionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'organizacion_id' },
  accion: { type: DataTypes.STRING(80), allowNull: false },
  entidad: { type: DataTypes.STRING(80), allowNull: false },
  entidadId: { type: DataTypes.STRING(80), allowNull: true, field: 'entidad_id' },
  antes: { type: DataTypes.JSON, allowNull: true },
  despues: { type: DataTypes.JSON, allowNull: true },
  ip: { type: DataTypes.STRING(64), allowNull: true },
  userAgent: { type: DataTypes.STRING(255), allowNull: true, field: 'user_agent' },
}, { tableName: 'auditoria' });
