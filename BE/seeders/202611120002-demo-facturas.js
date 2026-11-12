module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const [organizations] = await queryInterface.sequelize.query("SELECT id FROM organizaciones WHERE slug = 'sistemavision' LIMIT 1");
    const organizacionId = organizations[0]?.id;
    if (!organizacionId) throw new Error('Debe ejecutarse la migración de organizaciones antes del seeder.');

    await queryInterface.bulkInsert('facturas', [
      {
        organizacion_id: organizacionId,
        conversation_id: 'demo-cliente-001',
        numero_factura: 'FICT-0001',
        fecha_emision: '2026-11-01',
        moneda: 'CRC',
        subtotal: 25000.00,
        impuestos: 3250.00,
        total: 28250.00,
        emisor: JSON.stringify({ nombre: 'Comercial La Montaña Ficticia', nif_rfc: '3-101-000001' }),
        receptor: JSON.stringify({ nombre: 'Cliente Demostración 1', nif_rfc: '1-1111-1111' }),
        items: JSON.stringify([
          { descripcion: 'Teclado inalámbrico', cantidad: 1, precio_unitario: 15000, importe: 15000 },
          { descripcion: 'Mouse óptico', cantidad: 2, precio_unitario: 5000, importe: 10000 },
        ]),
        datos_estructurados: JSON.stringify({ demo: true, origen: 'seeder' }),
        created_at: now,
        updated_at: now,
        estado: 'PENDIENTE_REVISION',
      },
      {
        organizacion_id: organizacionId,
        conversation_id: 'demo-cliente-002',
        numero_factura: 'FICT-0002',
        fecha_emision: '2026-11-05',
        moneda: 'CRC',
        subtotal: 42000.00,
        impuestos: 5460.00,
        total: 47460.00,
        emisor: JSON.stringify({ nombre: 'Servicios Digitales Ejemplo', nif_rfc: '3-102-000002' }),
        receptor: JSON.stringify({ nombre: 'Cliente Demostración 2', nif_rfc: '2-2222-2222' }),
        items: JSON.stringify([
          { descripcion: 'Soporte técnico mensual', cantidad: 1, precio_unitario: 42000, importe: 42000 },
        ]),
        datos_estructurados: JSON.stringify({ demo: true, origen: 'seeder' }),
        created_at: now,
        updated_at: now,
        estado: 'PENDIENTE_REVISION',
      },
      {
        organizacion_id: organizacionId,
        conversation_id: 'demo-cliente-003',
        numero_factura: 'FICT-0003',
        fecha_emision: '2026-11-10',
        moneda: 'USD',
        subtotal: 125.00,
        impuestos: 16.25,
        total: 141.25,
        emisor: JSON.stringify({ nombre: 'Consultoría Ficticia Internacional', nif_rfc: '3-103-000003' }),
        receptor: JSON.stringify({ nombre: 'Cliente Demostración 3', nif_rfc: '3-3333-3333' }),
        items: JSON.stringify([
          { descripcion: 'Consultoría de procesos', cantidad: 5, precio_unitario: 25, importe: 125 },
        ]),
        datos_estructurados: JSON.stringify({ demo: true, origen: 'seeder' }),
        created_at: now,
        updated_at: now,
        estado: 'PENDIENTE_REVISION',
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('facturas', {
      numero_factura: ['FICT-0001', 'FICT-0002', 'FICT-0003'],
    });
  },
};
