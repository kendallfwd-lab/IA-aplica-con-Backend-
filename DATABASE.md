# Base de datos

Nombre por defecto: `sistemavision`.

Migraciones añadidas:

- `202611120005-create-security-and-organizations.js`: organizaciones, usuarios, refresh tokens, auditoría y pertenencia organizacional.
- `202611120006-add-invoice-workflow.js`: estado, revisión humana, hash de archivo.
- `202611120007-add-duplicate-fields.js`: detección de posible duplicado.
- `202611120008-create-mvp-business-entities.js`: membresías, clientes, contactos, servicios, cotizaciones, líneas, tareas y solicitudes de acción.
- `202611120009-link-invoices-and-quotes.js`: relaciones opcionales entre factura, cliente y cotización.

Ejecutar sin borrar datos:

```powershell
cd BE
npm run db:migrate
```

Antes de migrar producción, realizar un backup:

```powershell
mysqldump -u root -p sistemavision > sistemavision-backup.sql
```

Nunca usar `npm run db:undo` en producción sin una revisión y backup.
