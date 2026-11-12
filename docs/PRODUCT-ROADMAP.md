# Hoja de ruta: inteligencia operativa para pymes de servicios

## Completado

### Facturas administrativas

- Problema: documentos difíciles de leer y comparar.
- Beneficiario: administración y contabilidad.
- Implementación: SVG dinámico, moneda y fechas formateadas, detalle de servicios, subtotal, impuestos, total y bloques opcionales.
- Aceptación: texto largo, datos ausentes, cero, caracteres especiales y múltiples líneas no desbordan el documento.

### Identidad y núcleo comercial

- Problema: datos y acciones sin aislamiento ni trazabilidad.
- Implementación: organizaciones, membresías, roles, clientes, servicios, cotizaciones, tareas, auditoría e idempotencia.
- Riesgo controlado: permisos del lado del servidor y revisión humana.

## Siguiente etapa priorizada

1. Expediente único de cliente con historial de cotizaciones, facturas, tareas y documentos.
2. Versiones de cotización y órdenes de servicio después de aceptación.
3. Pagos, saldos y reversiones con auditoría.
4. Centro de pendientes con alertas verificables y deduplicadas.
5. Chat con contexto visible y herramientas de solo lectura; toda escritura requiere propuesta y confirmación backend.

## Etapas posteriores

- Documentos privados con versiones y extracción de texto citables.
- Importación CSV con vista previa, errores y duplicados.
- Automatizaciones configurables con simulación, límites e idempotencia.
- Integraciones externas con permisos mínimos y fuente de verdad explícita.
- Evaluación versionada del asistente, cuotas y métricas sin texto sensible.

No se presentan las etapas pendientes como funciones disponibles en la interfaz.
