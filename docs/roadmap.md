# Roadmap de arquitectura e implementación

La secuencia puede ajustarse con el equipo, pero ningún paso habilita datos reales si sus controles de privacidad y acceso no están aprobados.

| Fase | Entrega | Criterio de salida / dependencia |
|---|---|---|
| 0. Decisiones y MVP | Alcance, actores, datos, licencias, backlog y criterios de aceptación | Producto y responsables acuerdan qué problema se resuelve primero. |
| 1. Fundación técnica | Monorepo, React/TypeScript, FastAPI, PostgreSQL, Compose, health checks y CI | Una persona puede arrancar y validar el starter siguiendo README. **Starter inicial implementado.** |
| 2. Identidad y aislamiento | **MVP parcial:** login DNI/contraseña, sesión HttpOnly, roles básicos y administración de usuarios. Pendientes: aislamiento por organización, auditoría, rate limiting, recuperación y pruebas completas. | La implementación actual es solo para desarrollo; no habilita datos reales. |
| 3. Expedientes y mediciones | CRUD, catálogo/unidades, historial, correcciones no destructivas y API versionada | Validaciones e historial probados; rutas protegidas por Fase 2. |
| 4. Consentimiento y captura | Finalidad versionada, revocación, validación de archivo, storage privado y retención | Solo archivos permitidos se almacenan y procesan; borrado comprobado. |
| 5. Análisis de pose | Worker, estados, modelo/configuración versionados, landmarks y calidad | Pruebas reproducibles y revisión humana de resultados limitados. |
| 6. Visor 3D | **Demo inicial:** atlas educativo con esqueleto GLB, controles de órbita y atribución. Pendientes: capas, wireframe, fallback y mediciones de rendimiento/licencia. | Revisar CC BY-SA 4.0 y restricciones de activos derivados antes de distribuir. Puede avanzar con contenido ficticio. |
| 7. Analítica y reportes | Comparaciones compatibles, faltantes, fuentes y exportación | Cálculos reproducibles y procedencia visible. |
| 8. Simulación | Motor, parámetros permitidos, escenarios inmutables y advertencias | No modifica mediciones observadas; no promete resultados anatómicos no validados. |
| 9. Producción | CI/CD, secretos, TLS, observabilidad, backups, recuperación y runbooks | Aprobación de producto, QA, seguridad, privacidad y operaciones. |

## Siguiente incremento recomendado

1. Confirmar las decisiones de la Fase 0 sobre MVP y usuarios.
2. Añadir CI y ampliar pruebas de seguridad; probar frontend, API y Docker Compose.
3. Definir aislamiento por organización, auditoría y recuperación de credenciales.
4. Incorporar migraciones Alembic y política de despliegue de secretos/cookies.
5. Completar consentimiento y autorización antes de almacenar cualquier dato real.

No usar imágenes o expedientes reales en el starter actual.
