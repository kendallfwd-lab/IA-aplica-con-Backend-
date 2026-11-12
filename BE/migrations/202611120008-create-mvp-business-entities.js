module.exports = {
  async up(queryInterface, Sequelize) {
    const common = { created_at: { type: Sequelize.DATE, allowNull: false }, updated_at: { type: Sequelize.DATE, allowNull: false } };
    await queryInterface.createTable('membresias', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true }, usuario_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }, organizacion_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }, rol: { type: Sequelize.STRING(30), allowNull: false }, activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }, ...common,
    });
    await queryInterface.addConstraint('membresias', { fields: ['usuario_id'], type: 'foreign key', name: 'membresias_usuario_fk', references: { table: 'usuarios', field: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('membresias', { fields: ['organizacion_id'], type: 'foreign key', name: 'membresias_organizacion_fk', references: { table: 'organizaciones', field: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('membresias', { fields: ['usuario_id', 'organizacion_id'], type: 'unique', name: 'membresias_usuario_organizacion_uq' });

    await queryInterface.createTable('clientes', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true }, organizacion_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }, nombre: { type: Sequelize.STRING(180), allowNull: false }, identificacion: { type: Sequelize.STRING(80), allowNull: true }, email: { type: Sequelize.STRING(190), allowNull: true }, telefono: { type: Sequelize.STRING(60), allowNull: true }, direccion: { type: Sequelize.STRING(255), allowNull: true }, notas: { type: Sequelize.TEXT, allowNull: true }, estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVO' }, archivado_at: { type: Sequelize.DATE, allowNull: true }, ...common,
    });
    await queryInterface.createTable('contactos', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true }, cliente_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }, nombre: { type: Sequelize.STRING(160), allowNull: false }, email: { type: Sequelize.STRING(190), allowNull: true }, telefono: { type: Sequelize.STRING(60), allowNull: true }, cargo: { type: Sequelize.STRING(120), allowNull: true }, ...common,
    });
    await queryInterface.createTable('servicios', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true }, organizacion_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }, nombre: { type: Sequelize.STRING(180), allowNull: false }, descripcion: { type: Sequelize.TEXT, allowNull: true }, precio: { type: Sequelize.DECIMAL(15, 2), allowNull: false }, moneda: { type: Sequelize.STRING(3), allowNull: false }, activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }, ...common,
    });
    await queryInterface.createTable('cotizaciones', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true }, organizacion_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }, cliente_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }, numero: { type: Sequelize.STRING(120), allowNull: false }, estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'BORRADOR' }, moneda: { type: Sequelize.STRING(3), allowNull: false }, fecha_emision: { type: Sequelize.DATEONLY, allowNull: false }, valida_hasta: { type: Sequelize.DATEONLY, allowNull: true }, subtotal: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 }, descuento: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 }, impuestos: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 }, total: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 }, version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 }, idempotency_key: { type: Sequelize.STRING(120), allowNull: true }, ...common,
    });
    await queryInterface.createTable('cotizacion_lineas', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true }, cotizacion_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }, servicio_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true }, descripcion: { type: Sequelize.STRING(255), allowNull: false }, cantidad: { type: Sequelize.DECIMAL(15, 3), allowNull: false }, precio_unitario: { type: Sequelize.DECIMAL(15, 2), allowNull: false }, descuento: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 }, impuesto: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 }, total_linea: { type: Sequelize.DECIMAL(15, 2), allowNull: false }, servicio_snapshot: { type: Sequelize.JSON, allowNull: true }, ...common,
    });
    await queryInterface.createTable('tareas', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true }, organizacion_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }, cliente_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true }, cotizacion_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true }, factura_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true }, asignado_a: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true }, titulo: { type: Sequelize.STRING(180), allowNull: false }, descripcion: { type: Sequelize.TEXT, allowNull: true }, vencimiento: { type: Sequelize.DATE, allowNull: true }, prioridad: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'MEDIA' }, estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'PENDIENTE' }, ...common,
    });
    await queryInterface.createTable('solicitudes_accion', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true }, organizacion_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }, usuario_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }, tipo: { type: Sequelize.STRING(60), allowNull: false }, estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'PROPUESTA' }, idempotency_key: { type: Sequelize.STRING(120), allowNull: false }, payload: { type: Sequelize.JSON, allowNull: false }, resultado: { type: Sequelize.JSON, allowNull: true }, confirmado_at: { type: Sequelize.DATE, allowNull: true }, ...common,
    });

    for (const [table, columns, name] of [
      ['clientes', ['organizacion_id'], 'clientes_organizacion_fk'], ['servicios', ['organizacion_id'], 'servicios_organizacion_fk'], ['cotizaciones', ['organizacion_id'], 'cotizaciones_organizacion_fk'], ['tareas', ['organizacion_id'], 'tareas_organizacion_fk'], ['solicitudes_accion', ['organizacion_id'], 'solicitudes_organizacion_fk'],
    ]) await queryInterface.addConstraint(table, { fields: columns, type: 'foreign key', name, references: { table: 'organizaciones', field: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('contactos', { fields: ['cliente_id'], type: 'foreign key', name: 'contactos_cliente_fk', references: { table: 'clientes', field: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('cotizaciones', { fields: ['cliente_id'], type: 'foreign key', name: 'cotizaciones_cliente_fk', references: { table: 'clientes', field: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('cotizacion_lineas', { fields: ['cotizacion_id'], type: 'foreign key', name: 'cotizacion_lineas_cotizacion_fk', references: { table: 'cotizaciones', field: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('cotizacion_lineas', { fields: ['servicio_id'], type: 'foreign key', name: 'cotizacion_lineas_servicio_fk', references: { table: 'servicios', field: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('tareas', { fields: ['cliente_id'], type: 'foreign key', name: 'tareas_cliente_fk', references: { table: 'clientes', field: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('tareas', { fields: ['cotizacion_id'], type: 'foreign key', name: 'tareas_cotizacion_fk', references: { table: 'cotizaciones', field: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('tareas', { fields: ['factura_id'], type: 'foreign key', name: 'tareas_factura_fk', references: { table: 'facturas', field: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('tareas', { fields: ['asignado_a'], type: 'foreign key', name: 'tareas_asignado_fk', references: { table: 'usuarios', field: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' });
    await queryInterface.addConstraint('solicitudes_accion', { fields: ['usuario_id'], type: 'foreign key', name: 'solicitudes_usuario_fk', references: { table: 'usuarios', field: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
    await queryInterface.addIndex('clientes', ['organizacion_id', 'nombre']);
    await queryInterface.addIndex('servicios', ['organizacion_id', 'activo']);
    await queryInterface.addIndex('cotizaciones', ['organizacion_id', 'estado', 'fecha_emision']);
    await queryInterface.addConstraint('cotizaciones', { fields: ['organizacion_id', 'idempotency_key'], type: 'unique', name: 'cotizaciones_idempotencia_uq' });
    await queryInterface.addIndex('tareas', ['organizacion_id', 'estado', 'vencimiento']);
    await queryInterface.addConstraint('solicitudes_accion', { fields: ['organizacion_id', 'idempotency_key'], type: 'unique', name: 'solicitudes_idempotencia_uq' });
  },
  async down(queryInterface) {
    for (const table of ['solicitudes_accion', 'tareas', 'cotizacion_lineas', 'cotizaciones', 'servicios', 'contactos', 'clientes', 'membresias']) await queryInterface.dropTable(table);
  },
};
