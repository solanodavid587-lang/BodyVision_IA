# Decisiones de arquitectura y pendientes

## Decisiones iniciales

| Tema | Decisión | Motivo / límite |
|---|---|---|
| Organización del código | Monorepo con `frontend/`, `backend/`, `docs/` e `infra/` | Mantiene coordinados contratos, aplicación y operación. |
| Frontend | React, TypeScript estricto y Vite | Coincide con la arquitectura objetivo de BODYVISION AI. |
| API | FastAPI con contratos OpenAPI | Validación tipada y documentación automática. |
| Datos relacionales | PostgreSQL, acceso mediante SQLAlchemy | Persistencia transaccional y futura evolución con migraciones. |
| Desarrollo local | Docker Compose | Entorno reproducible con dependencias explícitas. |
| Flujo HTTP del navegador | Proxy `/api` mismo origen en desarrollo | Evita configurar una URL de API distinta en el cliente y simplifica CORS local. |
| Alcance actual | Landing, atlas educativo de esqueleto, login DNI y administración básica | MVP local. No usar con datos personales reales ni tratarlo como seguridad productiva. |

## Decisiones que requieren producto/seguridad

| Tema | Resolver antes de | Preguntas |
|---|---|---|
| Identidad | Cualquier dato personal | ¿Proveedor gestionado o identidad propia? ¿MFA y recuperación? |
| Tenant y autorización | Expedientes con usuarios reales | ¿Aislamiento por organización? ¿Cómo se concede y revoca acceso al expediente? |
| Consentimiento | Captura o procesamiento de medios | ¿Finalidades, versiones, evidencia, revocación y excepciones de retención? |
| Object storage | Guardar archivos | ¿Proveedor, cifrado, región, URLs firmadas, límites y borrado de derivados/backups? |
| Worker/cola | Procesamiento de pose/reportes | ¿Qué garantías de reintento, idempotencia, prioridad y retención de tareas se necesitan? |
| Métricas | Analítica | ¿Qué datos serán manuales, instrumentales o estimados? ¿Unidades y rangos permitidos? |
| Activo/modelo 3D | Distribución del visor | ¿Origen, licencia, uso comercial, derivados y nivel de detalle? |
| Simulación | Diseñar el simulador | ¿Qué parámetros modifica realmente un motor validable? No asumir transformación anatómica. |
| Retención y normativa | Datos reales | Validar obligaciones aplicables en Perú con asesoría legal especializada. |

## Credenciales y configuración

`.env.example` contiene credenciales locales de demostración, incluido un usuario administrador inicial. Cambiarlas y nunca usarlas fuera del entorno local. Staging y producción requieren secretos administrados, clave de sesión robusta, cookies `Secure` sobre HTTPS y migraciones.

## Nota de secuenciación

El proyecto tiene login y administración básicos, pero aún carece de controles suficientes para datos reales: auditoría, aislamiento multi-tenant, rate limiting, recuperación de credenciales y consentimiento. Avanzar con datos sintéticos hasta cerrar esas brechas y realizar revisión especializada.
