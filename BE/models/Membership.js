module.exports = (sequelize, DataTypes) => sequelize.define('Membership', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  usuarioId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'usuario_id' },
  organizacionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'organizacion_id' },
  rol: { type: DataTypes.STRING(30), allowNull: false },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'membresias' });
