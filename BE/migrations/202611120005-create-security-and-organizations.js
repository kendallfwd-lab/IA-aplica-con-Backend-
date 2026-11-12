module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.createTable('organizaciones', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      nombre: { type: Sequelize.STRING(160), allowNull: false },
      slug: { type: Sequelize.STRING(180), allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.bulkInsert('organizaciones', [{ nombre: 'SistemaVision', slug: 'sistemavision', created_at: now, updated_at: now }]);

    await queryInterface.createTable('usuarios', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      organizacion_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      nombre: { type: Sequelize.STRING(160), allowNull: false },
      email: { type: Sequelize.STRING(190), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      rol: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'LECTOR' },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      intentos_fallidos: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      bloqueado_hasta: { type: Sequelize.DATE, allowNull: true },
      ultimo_acceso: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('usuarios', { fields: ['organizacion_id'], type: 'foreign key', name: 'usuarios_organizacion_fk', references: { table: 'organizaciones', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' });
    await queryInterface.addIndex('usuarios', ['organizacion_id']);

    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      usuario_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      token_hash: { type: Sequelize.STRING(128), allowNull: false, unique: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('refresh_tokens', { fields: ['usuario_id'], type: 'foreign key', name: 'refresh_tokens_usuario_fk', references: { table: 'usuarios', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' });
    await queryInterface.addIndex('refresh_tokens', ['usuario_id']);

    await queryInterface.createTable('auditoria', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      usuario_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      organizacion_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      accion: { type: Sequelize.STRING(80), allowNull: false },
      entidad: { type: Sequelize.STRING(80), allowNull: false },
      entidad_id: { type: Sequelize.STRING(80), allowNull: true },
      antes: { type: Sequelize.JSON, allowNull: true },
      despues: { type: Sequelize.JSON, allowNull: true },
      ip: { type: Sequelize.STRING(64), allowNull: true },
      user_agent: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('auditoria', { fields: ['usuario_id'], type: 'foreign key', name: 'auditoria_usuario_fk', references: { table: 'usuarios', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' });
    await queryInterface.addConstraint('auditoria', { fields: ['organizacion_id'], type: 'foreign key', name: 'auditoria_organizacion_fk', references: { table: 'organizaciones', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' });
    await queryInterface.addIndex('auditoria', ['organizacion_id', 'created_at']);
    await queryInterface.addIndex('auditoria', ['entidad', 'entidad_id']);

    await queryInterface.addColumn('facturas', 'organizacion_id', { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await queryInterface.sequelize.query("UPDATE facturas SET organizacion_id = (SELECT id FROM organizaciones WHERE slug = 'sistemavision' LIMIT 1) WHERE organizacion_id IS NULL");
    await queryInterface.changeColumn('facturas', 'organizacion_id', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false });
    await queryInterface.addConstraint('facturas', { fields: ['organizacion_id'], type: 'foreign key', name: 'facturas_organizacion_fk', references: { table: 'organizaciones', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' });
    await queryInterface.addIndex('facturas', ['organizacion_id', 'created_at']);

    await queryInterface.addColumn('memoria_chat', 'organizacion_id', { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await queryInterface.sequelize.query("UPDATE memoria_chat SET organizacion_id = (SELECT id FROM organizaciones WHERE slug = 'sistemavision' LIMIT 1) WHERE organizacion_id IS NULL");
    await queryInterface.changeColumn('memoria_chat', 'organizacion_id', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false });
    await queryInterface.addConstraint('memoria_chat', { fields: ['organizacion_id'], type: 'foreign key', name: 'memoria_chat_organizacion_fk', references: { table: 'organizaciones', field: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' });
    await queryInterface.addIndex('memoria_chat', ['organizacion_id', 'conversation_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('memoria_chat', 'organizacion_id');
    await queryInterface.removeColumn('facturas', 'organizacion_id');
    await queryInterface.dropTable('auditoria');
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('usuarios');
    await queryInterface.dropTable('organizaciones');
  },
};
