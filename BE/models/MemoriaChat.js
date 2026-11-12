module.exports = (sequelize, DataTypes) => {
  return sequelize.define('MemoriaChat', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    conversationId: { type: DataTypes.STRING(120), allowNull: false, field: 'conversation_id' },
    role: { type: DataTypes.STRING(20), allowNull: false },
    content: { type: DataTypes.TEXT('long'), allowNull: false },
    trainingContent: { type: DataTypes.TEXT('long'), allowNull: true, field: 'training_content' },
    structuredData: { type: DataTypes.JSON, allowNull: true, field: 'structured_data' },
    model: { type: DataTypes.STRING(120), allowNull: true },
    feedback: { type: DataTypes.STRING(30), allowNull: true },
    consentToTraining: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'consent_to_training' },
    trainingEligible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'training_eligible' },
    metadata: { type: DataTypes.JSON, allowNull: true },
  }, {
    tableName: 'memoria_chat',
  });
};

