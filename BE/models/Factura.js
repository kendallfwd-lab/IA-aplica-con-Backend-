module.exports = (sequelize, DataTypes) => {
  const Factura = sequelize.define('Factura', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
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
  }, {
    tableName: 'facturas',
  });

  return Factura;
};
