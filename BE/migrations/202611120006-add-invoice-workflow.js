module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('facturas', 'estado', { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'PENDIENTE_REVISION' });
    await queryInterface.addColumn('facturas', 'revisado_por', { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await queryInterface.addColumn('facturas', 'revisado_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('facturas', 'revision_comentario', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('facturas', 'archivo_sha256', { type: Sequelize.STRING(64), allowNull: true });
    await queryInterface.addConstraint('facturas', { fields: ['revisado_por'], type: 'foreign key', name: 'facturas_revisado_por_fk', references: { table: 'usuarios', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' });
    await queryInterface.addIndex('facturas', ['organizacion_id', 'estado']);
    await queryInterface.addIndex('facturas', ['organizacion_id', 'archivo_sha256']);
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('facturas', ['organizacion_id', 'archivo_sha256']);
    await queryInterface.removeIndex('facturas', ['organizacion_id', 'estado']);
    await queryInterface.removeConstraint('facturas', 'facturas_revisado_por_fk');
    await queryInterface.removeColumn('facturas', 'archivo_sha256');
    await queryInterface.removeColumn('facturas', 'revision_comentario');
    await queryInterface.removeColumn('facturas', 'revisado_at');
    await queryInterface.removeColumn('facturas', 'revisado_por');
    await queryInterface.removeColumn('facturas', 'estado');
  },
};
