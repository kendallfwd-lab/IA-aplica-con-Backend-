# SistemaVision AI 2.0

Plataforma de gestión inteligente de facturas con React + Vite, Node.js + Express, MySQL 8 y Sequelize.

## Estado de esta fase

Implementado en P0:

- Migraciones incrementales para organizaciones, usuarios, sesiones revocables, auditoría y flujo de revisión.
- Login con bcrypt, JWT de corta duración, refresh token HttpOnly, CSRF para renovación y bloqueo por intentos.
- CORS por allowlist, Helmet, rate limiting, límites de cuerpo y errores sanitizados.
- Aislamiento de facturas y memoria por organización.
- Validación determinística de importes, estados `PENDIENTE_REVISION`, duplicados y aprobación humana.
- Validación de firma real para JPEG, PNG y WebP; se eliminó la lectura de URLs/rutas locales.
- Eliminación persistida de conversaciones.
- Frontend React conectado al login y a endpoints protegidos.
- Pruebas unitarias y de API básicas.

Implementado en Etapa 2 de negocio:

- Clientes y contactos con aislamiento por organización, búsqueda, paginación y archivado.
- Catálogo de servicios con precio de referencia.
- Cotizaciones con líneas, snapshots del servicio, estados, cálculo determinista e `Idempotency-Key`.
- Aceptación explícita y conversión única de cotización aceptada a factura pendiente de revisión.
- Tareas de seguimiento vinculables a cliente, cotización o factura.
- Tabla de membresías y solicitudes de acción para preparar acciones confirmables.

P1/P2 pendientes: interfaz visual dedicada para clientes, servicios, cotizaciones y tareas; cola de workers, PDF, documentos/versiones, cuentas por pagar, reportes avanzados, exportación Excel, dashboard visual completo, herramientas empresariales del chat, OpenAPI formal y E2E Playwright.

## Inicio en Windows

```powershell
cd "C:\Users\DELL1\Desktop\Nueva carpeta (4)\BE"
Copy-Item .env.example .env
notepad .env
npm install
npm run db:migrate

$env:ADMIN_NAME="Administrador"
$env:ADMIN_EMAIL="admin@tuempresa.com"
$env:ADMIN_PASSWORD="Una contraseña de al menos 12 caracteres"
npm run admin:bootstrap
npm run dev
```

En otra terminal:

```powershell
cd "C:\Users\DELL1\Desktop\Nueva carpeta (4)\FE"
Copy-Item .env.example .env
npm install
npm run dev
```

No subas `BE/.env`. Usa marcadores en `.env.example` y rota cualquier clave que haya sido expuesta anteriormente.

## MySQL

La base por defecto es `sistemavision`. Las migraciones son incrementales y no ejecutan `DROP DATABASE` ni `sync({ force: true })`. Para un entorno nuevo se puede usar:

```powershell
docker compose up -d mysql
```

Consulta [DATABASE.md](DATABASE.md) para credenciales locales y respaldo.

## Documentación

- [API.md](API.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DATABASE.md](DATABASE.md)
- [SECURITY.md](SECURITY.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [Hoja de ruta de producto](docs/PRODUCT-ROADMAP.md)
