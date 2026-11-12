# Seguridad

- `.env` está excluido de Git; nunca colocar claves reales en commits.
- `JWT_SECRET` debe tener al menos 32 caracteres aleatorios.
- El access token expira rápido; el refresh token es aleatorio, se guarda hasheado y se rota/revoca.
- Las cargas aceptan solo JPEG, PNG y WebP con firma binaria válida y máximo 15 MB.
- La IA no aprueba facturas: los resultados quedan pendientes de revisión humana.
- Las consultas filtran por `organizacion_id`.
- La memoria de entrenamiento exige consentimiento y queda limitada a administradores.
- Las imágenes y SVG se sirven con autenticación y el SVG escapa texto dinámico.

Antes de producción se debe configurar HTTPS, secretos del gestor de credenciales, backups, monitoreo y revisión de dependencias (`npm audit`).
