module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('facturas', 'imagen_original', {
      type: Sequelize.BLOB('long'),
      allowNull: true,
    });
    await queryInterface.addColumn('facturas', 'imagen_mime_type', {
      type: Sequelize.STRING(80),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('facturas', 'imagen_mime_type');
    await queryInterface.removeColumn('facturas', 'imagen_original');
  },
};

