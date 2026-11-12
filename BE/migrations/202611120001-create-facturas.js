module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('facturas', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      conversation_id: { type: Sequelize.STRING(120), allowNull: true },
      numero_factura: { type: Sequelize.STRING(120), allowNull: true },
      fecha_emision: { type: Sequelize.STRING(40), allowNull: true },
      moneda: { type: Sequelize.STRING(10), allowNull: true },
      subtotal: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      impuestos: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      total: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      emisor: { type: Sequelize.JSON, allowNull: true },
      receptor: { type: Sequelize.JSON, allowNull: true },
      items: { type: Sequelize.JSON, allowNull: true },
      datos_estructurados: { type: Sequelize.JSON, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('facturas', ['conversation_id']);
    await queryInterface.addIndex('facturas', ['numero_factura']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('facturas');
  },
};

