module.exports = (sequelize, DataTypes) => sequelize.define('RefreshToken', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  usuarioId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'usuario_id' },
  tokenHash: { type: DataTypes.STRING(128), allowNull: false, unique: true, field: 'token_hash' },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  revokedAt: { type: DataTypes.DATE, allowNull: true, field: 'revoked_at' },
}, { tableName: 'refresh_tokens' });
