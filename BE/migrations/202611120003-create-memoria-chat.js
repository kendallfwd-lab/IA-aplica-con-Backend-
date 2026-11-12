module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('memoria_chat', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      conversation_id: { type: Sequelize.STRING(120), allowNull: false },
      role: { type: Sequelize.STRING(20), allowNull: false },
      content: { type: Sequelize.TEXT('long'), allowNull: false },
      training_content: { type: Sequelize.TEXT('long'), allowNull: true },
      structured_data: { type: Sequelize.JSON, allowNull: true },
      model: { type: Sequelize.STRING(120), allowNull: true },
      feedback: { type: Sequelize.STRING(30), allowNull: true },
      consent_to_training: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      training_eligible: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      metadata: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('memoria_chat', ['conversation_id']);
    await queryInterface.addIndex('memoria_chat', ['training_eligible']);
    await queryInterface.addIndex('memoria_chat', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('memoria_chat');
  },
};

