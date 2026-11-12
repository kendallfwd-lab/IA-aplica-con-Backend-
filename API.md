# API principal

Todas las rutas privadas requieren `Authorization: Bearer <accessToken>`.

## Públicas

- `GET /api/health`
- `GET /api/ready`
- `POST /api/auth/login` con `{ email, password }`
- `POST /api/auth/refresh` con cookie de refresh y header `x-csrf-token`

## Autenticadas

- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/facturas?limit=50&estado=PENDIENTE_REVISION&search=texto`
- `GET /api/dashboard/resumen`
- `POST /api/facturas/manual`
- `POST /api/facturas/chat`
- `POST /api/facturas/chat-imagen`
- `POST /api/facturas/analizar`
- `GET /api/facturas/:id/imagen`
- `GET /api/facturas/:id/imagen-original`
- `PATCH /api/facturas/:id`
- `POST /api/facturas/:id/aprobar`
- `POST /api/facturas/:id/rechazar`
- `GET /api/chats/:conversationId/memoria`
- `DELETE /api/facturas/chat/:conversationId`

Las rutas de entrenamiento están restringidas a `SUPER_ADMIN` y `ADMIN`. Los errores no devuelven stacks ni credenciales.

Las rutas actuales también se pueden consumir bajo `/api/v1/*` como capa de transición.
