# Despliegue

El frontend puede publicarse en Vercel o un servidor estático. Configura `VITE_API_URL` con la URL HTTPS real del backend; nunca uses `localhost` en producción.

El backend requiere un servicio Node persistente, MySQL accesible de forma privada, `CORS_ORIGINS` con el dominio exacto del frontend y las variables de `BE/.env.example`.

Pasos de producción:

1. Crear backup de MySQL.
2. Ejecutar `npm ci` en `BE`.
3. Ejecutar `npm run db:migrate`.
4. Configurar secretos fuera de Git.
5. Ejecutar `npm start`.
6. Construir el frontend con `npm run build`.
7. Verificar `/api/health` y `/api/ready`.
