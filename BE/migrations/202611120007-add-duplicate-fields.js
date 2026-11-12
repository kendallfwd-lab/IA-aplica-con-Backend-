module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('facturas', 'posible_duplicado', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('facturas', 'duplicado_razon', { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.addIndex('facturas', ['organizacion_id', 'posible_duplicado']);
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('facturas', ['organizacion_id', 'posible_duplicado']);
    await queryInterface.removeColumn('facturas', 'duplicado_razon');
    await queryInterface.removeColumn('facturas', 'posible_duplicado');
  },
};
