# Roadmap de arquitectura e implementación

La secuencia puede ajustarse con el equipo, pero ningún paso habilita datos reales si sus controles de privacidad y acceso no están aprobados.

| Fase | Entrega | Criterio de salida / dependencia |
|---|---|---|
| 0. Decisiones y MVP | Alcance, actores, datos, licencias, backlog y criterios de aceptación | Producto y responsables acuerdan qué problema se resuelve primero. |
| 1. Fundación técnica | Monorepo, React/TypeScript, FastAPI, PostgreSQL, Compose, health checks y CI | Una persona puede arrancar y validar el starter siguiendo README. **Starter inicial implementado.** |
| 2. Identidad y aislamiento | Login, sesiones, roles, permisos por recurso/organización y auditoría | Pruebas cruzadas demuestran que los usuarios no acceden a recursos ajenos. Bloquea datos reales. |
| 3. Expedientes y mediciones | CRUD, catálogo/unidades, historial, correcciones no destructivas y API versionada | Validaciones e historial probados; rutas protegidas por Fase 2. |
| 4. Consentimiento y captura | Finalidad versionada, revocación, validación de archivo, storage privado y retención | Solo archivos permitidos se almacenan y procesan; borrado comprobado. |
| 5. Análisis de pose | Worker, estados, modelo/configuración versionados, landmarks y calidad | Pruebas reproducibles y revisión humana de resultados limitados. |
| 6. Visor 3D | Activo autorizado GLB/GLTF, procedencia, capas y fallback móvil | Licencia verificada; rendimiento y wireframe del activo medidos. Puede avanzar con contenido ficticio. |
| 7. Analítica y reportes | Comparaciones compatibles, faltantes, fuentes y exportación | Cálculos reproducibles y procedencia visible. |
| 8. Simulación | Motor, parámetros permitidos, escenarios inmutables y advertencias | No modifica mediciones observadas; no promete resultados anatómicos no validados. |
| 9. Producción | CI/CD, secretos, TLS, observabilidad, backups, recuperación y runbooks | Aprobación de producto, QA, seguridad, privacidad y operaciones. |

## Siguiente incremento recomendado

1. Confirmar las decisiones de la Fase 0 sobre MVP y usuarios.
2. Añadir CI para build frontend y pruebas backend; fijar dependencias con lockfiles.
3. Definir proveedor de identidad y estrategia de organización/acceso.
4. Diseñar modelo de datos y migraciones antes de añadir CRUD persistente.
5. Probar identidad y aislamiento en API antes de habilitar datos reales.

No usar imágenes o expedientes reales en el starter actual.
