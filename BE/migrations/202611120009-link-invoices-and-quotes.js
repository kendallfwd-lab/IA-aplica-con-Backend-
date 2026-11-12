module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('facturas', 'cliente_id', { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await queryInterface.addColumn('facturas', 'cotizacion_id', { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await queryInterface.addColumn('cotizaciones', 'factura_id', { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await queryInterface.addConstraint('facturas', { fields: ['cliente_id'], type: 'foreign key', name: 'facturas_cliente_fk', references: { table: 'clientes', field: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('facturas', { fields: ['cotizacion_id'], type: 'foreign key', name: 'facturas_cotizacion_fk', references: { table: 'cotizaciones', field: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('cotizaciones', { fields: ['factura_id'], type: 'foreign key', name: 'cotizaciones_factura_fk', references: { table: 'facturas', field: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' });
    await queryInterface.addIndex('facturas', ['organizacion_id', 'cliente_id']);
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('facturas', ['organizacion_id', 'cliente_id']);
    await queryInterface.removeConstraint('cotizaciones', 'cotizaciones_factura_fk');
    await queryInterface.removeConstraint('facturas', 'facturas_cotizacion_fk');
    await queryInterface.removeConstraint('facturas', 'facturas_cliente_fk');
    await queryInterface.removeColumn('cotizaciones', 'factura_id');
    await queryInterface.removeColumn('facturas', 'cotizacion_id');
    await queryInterface.removeColumn('facturas', 'cliente_id');
  },
};
