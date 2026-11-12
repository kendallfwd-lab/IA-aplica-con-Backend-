# Arquitectura

El backend mantiene compatibilidad con las rutas `/api/*` y usa Express, Sequelize y MySQL. La autenticación se resuelve en `BE/services/authService.js` y `BE/middlewares/auth.js`; las operaciones de facturas se validan en `BE/services/invoiceService.js`; la IA solo extrae datos y crea facturas en `PENDIENTE_REVISION`.

El frontend mantiene React + Vite. `VITE_API_URL` configura el backend. El access token vive únicamente en memoria del navegador y el refresh token se almacena en cookie HttpOnly.

Flujo principal:

```text
Usuario → Login → JWT en memoria → API protegida → organización del usuario → MySQL
                                      └→ IA extrae → validación determinística → revisión humana
```

Las migraciones no destruyen datos existentes. Los registros históricos se asignan a la organización inicial `sistemavision` durante la migración.
