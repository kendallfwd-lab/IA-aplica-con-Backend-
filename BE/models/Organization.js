module.exports = (sequelize, DataTypes) => sequelize.define('Organization', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(160), allowNull: false },
  slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
}, { tableName: 'organizaciones' });
