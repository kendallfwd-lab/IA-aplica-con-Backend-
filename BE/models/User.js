module.exports = (sequelize, DataTypes) => sequelize.define('User', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  organizacionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'organizacion_id' },
  nombre: { type: DataTypes.STRING(160), allowNull: false },
  email: { type: DataTypes.STRING(190), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  rol: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'LECTOR' },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  intentosFallidos: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'intentos_fallidos' },
  bloqueadoHasta: { type: DataTypes.DATE, allowNull: true, field: 'bloqueado_hasta' },
  ultimoAcceso: { type: DataTypes.DATE, allowNull: true, field: 'ultimo_acceso' },
}, { tableName: 'usuarios', defaultScope: { attributes: { exclude: ['passwordHash'] } } });
