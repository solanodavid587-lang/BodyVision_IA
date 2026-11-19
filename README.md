# BODYVISION AI

MVP técnico de BODYVISION AI: landing page, dashboard autenticado con navegación global, atlas educativo 3D, acceso por DNI y contraseña, administración básica de usuarios, API FastAPI y PostgreSQL en Docker Compose.

> **Estado y límite:** la autenticación y el CRUD administrativo son una primera versión para desarrollo local, no una aprobación de seguridad productiva. No cargar datos personales, fotografías ni expedientes reales. Aún faltan rate limiting, auditoría, aislamiento por organización, recuperación de credenciales, consentimiento, migraciones y revisión de seguridad.

## Requisitos

- Docker y Docker Compose
- Git

## Arranque local

1. Copiar `.env.example` a `.env`.
2. Cambiar las credenciales locales antes de iniciar. Los valores del ejemplo solo son para desarrollo y no deben reutilizarse fuera de la máquina local.
3. Ejecutar:

   ```bash
   docker compose up --build
   ```

4. Abrir:
   - Aplicación: <http://localhost:5173>
   - API: <http://localhost:8000>
   - OpenAPI: <http://localhost:8000/docs>
   - Salud de API y base de datos: <http://localhost:8000/api/health>

La interfaz muestra el estado real de la API y de PostgreSQL. Si el servicio de base de datos no está disponible, el endpoint de salud responde `503`.

En la primera ejecución se crea el administrador inicial configurado en `.env` (`INITIAL_ADMIN_DNI` y `INITIAL_ADMIN_PASSWORD`). El ejemplo usa DNI `12345678` y contraseña `ChangeMe_LocalOnly_2026!`; reemplázalos inmediatamente. Las cuentas nuevas se crean desde **Administración de usuarios** después de iniciar sesión. Las contraseñas se guardan como hashes PBKDF2 y las sesiones se entregan en una cookie `HttpOnly`.

Después de iniciar sesión se abre un **Dashboard compartido** con una barra lateral para Dashboard, Expedientes, Mediciones, Captura, Análisis de pose, Atlas 3D, Analítica, Simulaciones y Reportes. Los administradores también tienen la pestaña **Usuarios y roles**. Los módulos todavía no conectados muestran su estado pendiente; no generan datos ficticios.

La landing y el atlas son públicos; el listado y los cambios de usuarios requieren el rol de administrador. El atlas integra solo `skeleton.glb` del repositorio indicado y muestra su atribución. No se incluye la capa de órganos, pues el README de origen advierte que contiene un modelo con licencia CC BY-NC 4.0. Antes de redistribuir o comercializar, confirma las licencias y cumple CC BY-SA 4.0 para el activo derivado.

El backend crea las tablas de usuarios al iniciar como comodidad del MVP. Antes de desplegar, reemplazar este mecanismo por migraciones Alembic y configurar `AUTH_SECRET_KEY` fuerte y `SESSION_COOKIE_SECURE=true` detrás de HTTPS.

Para detener los contenedores, ejecutar `docker compose down`. Los datos de PostgreSQL se conservan en el volumen `bodyvision-postgres-data`; para iniciar desde cero, eliminarlo explícitamente con `docker compose down --volumes` (esto borra los datos locales).

## Validación

Frontend:

```bash
cd frontend
npm ci
npm run build
```

Backend (comandos desde la raíz del proyecto):

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
PYTHONPATH=backend pytest backend/tests
```

En Windows, activar el entorno virtual con `.venv\Scripts\activate`.

## Estructura

```text
frontend/                 React, TypeScript y Vite
backend/app/api/          Rutas HTTP y contratos
backend/app/core/         Configuración y componentes transversales
backend/app/db/           Conexión a PostgreSQL
backend/tests/            Pruebas de API
docs/architecture/        Arquitectura y decisiones pendientes
docs/roadmap.md           Secuencia de implementación y dependencias
docker-compose.yml        Entorno local
```

## Arquitectura y límites

- El navegador consume la API; no se conecta directamente a PostgreSQL ni al almacenamiento privado.
- FastAPI es el punto de entrada para validar identidad, permisos, consentimiento y reglas de negocio.
- La API expone comprobación de salud, autenticación y administración básica de usuarios; todavía no hay expedientes ni rutas de mediciones.
- El alcance del producto es informativo y de gestión. Una estimación visual no es una medición clínica ni un diagnóstico.

Consultar [la arquitectura](docs/architecture/README.md), [las decisiones pendientes](docs/architecture/decisions.md) y [el roadmap](docs/roadmap.md) antes de ampliar el starter.
