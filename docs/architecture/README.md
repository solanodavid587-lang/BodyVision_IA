# Arquitectura inicial

## Propósito y límites

BODYVISION AI administra expedientes y datos corporales observados, guía capturas y podrá presentar resultados visuales y escenarios hipotéticos. No es un dispositivo médico, sistema de diagnóstico ni fuente de mediciones clínicas a partir de fotografías.

La UI debe diferenciar explícitamente:

- **Observación:** valor manual o instrumental con unidad, método, fecha y responsable.
- **Estimación visual:** inferencia de un modelo, siempre con versión, calidad y limitaciones.
- **Reconstrucción 3D:** geometría aproximada con procedencia y licencia.
- **Simulación:** escenario hipotético separado de los registros observados.

## Vista lógica

```text
Navegador (React / TypeScript)
        │ HTTP, mismo origen /api
        ▼
API (FastAPI) ───── PostgreSQL
        │
        ├── almacenamiento privado de objetos (pendiente)
        ├── workers de tareas asíncronas (pendiente)
        └── esqueleto GLB educativo → visor web (integrado; validar licencia antes de distribución)
```

El backend es la frontera de confianza. El navegador no se conecta directamente a PostgreSQL ni al almacenamiento privado. Cada ruta de negocio futura debe validar autenticación, autorización sobre el recurso y consentimiento cuando aplique.

## Componentes presentes en el MVP

- **Frontend:** React, TypeScript y Vite. Incluye landing, login DNI/contraseña, panel administrativo y atlas 3D.
- **API:** FastAPI con OpenAPI, health check, inicio/cierre de sesión, consulta del usuario actual y CRUD básico de usuarios protegido por rol.
- **Persistencia:** PostgreSQL en Docker Compose y SQLAlchemy. El MVP crea la tabla de usuarios al iniciar; todavía requiere migraciones Alembic antes de producción.
- **Autenticación:** hashes PBKDF2 y cookie de sesión `HttpOnly`, firmada; el administrador local inicial se configura con variables de entorno.
- **Visor 3D:** modelo de esqueleto del repositorio indicado, con controles de cámara y atribución. No es un modelo clínico.
- **Entorno local:** Docker Compose, servicio PostgreSQL con health check, API y frontend detrás de proxy de desarrollo.

## Límites de confianza y protección

1. La red del navegador es no confiable; no exponer credenciales de base de datos ni acceso privado a objetos.
2. Toda consulta futura debe limitarse por organización y permisos del usuario, no solo por el ID recibido en la URL.
3. El consentimiento debe identificar finalidad y versión de política; su revocación debe detener nuevos procesamientos sujetos a esa finalidad.
4. Los medios deben permanecer privados, validarse por contenido real y tener reglas de retención y borrado.
5. Logs, errores, nombres de archivo y URLs no deben filtrar datos personales.
6. Usar solo datos ficticios: la identidad básica no sustituye aislamiento multi-tenant, auditoría, consentimiento ni almacenamiento seguro.

## Evolución propuesta

1. Cerrar decisiones de producto, identidad, tenant y retención.
2. Fortalecer identidad: rate limiting, recuperación, rotación de secretos, auditoría y aislamiento por organización/perfil.
3. Añadir expedientes, consentimiento y mediciones auditables.
4. Incorporar almacenamiento privado y captura validada.
5. Añadir worker/versionado de IA y revisión de calidad.
6. Revisar licencia del activo 3D incluido y ampliar el visor, analítica, reportes y simulación.
7. Completar hardening, observabilidad, backups y aprobación de producción.

Los criterios de salida y dependencias están en [roadmap.md](../roadmap.md). Las alternativas aún sin decisión están en [decisions.md](decisions.md).
