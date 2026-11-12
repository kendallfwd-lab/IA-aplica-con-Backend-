module.exports = (sequelize, DataTypes) => {
  const Factura = sequelize.define('Factura', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    organizacionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'organizacion_id' },
    clienteId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'cliente_id' },
    cotizacionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'cotizacion_id' },
    conversationId: { type: DataTypes.STRING(120), allowNull: true, field: 'conversation_id' },
    numeroFactura: { type: DataTypes.STRING(120), allowNull: true, field: 'numero_factura' },
    fechaEmision: { type: DataTypes.STRING(40), allowNull: true, field: 'fecha_emision' },
    moneda: { type: DataTypes.STRING(10), allowNull: true },
    subtotal: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    impuestos: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    total: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    emisor: { type: DataTypes.JSON, allowNull: true },
    receptor: { type: DataTypes.JSON, allowNull: true },
    items: { type: DataTypes.JSON, allowNull: true },
    datosEstructurados: { type: DataTypes.JSON, allowNull: false, field: 'datos_estructurados' },
    imagenOriginal: { type: DataTypes.BLOB('long'), allowNull: true, field: 'imagen_original' },
    imagenMimeType: { type: DataTypes.STRING(80), allowNull: true, field: 'imagen_mime_type' },
    estado: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PENDIENTE_REVISION' },
    revisadoPor: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'revisado_por' },
    revisadoAt: { type: DataTypes.DATE, allowNull: true, field: 'revisado_at' },
    revisionComentario: { type: DataTypes.TEXT, allowNull: true, field: 'revision_comentario' },
    archivoSha256: { type: DataTypes.STRING(64), allowNull: true, field: 'archivo_sha256' },
    posibleDuplicado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'posible_duplicado' },
    duplicadoRazon: { type: DataTypes.STRING(255), allowNull: true, field: 'duplicado_razon' },
  }, {
    tableName: 'facturas',
  });

  return Factura;
};
