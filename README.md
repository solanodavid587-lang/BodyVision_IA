# BODYVISION AI

Starter técnico para desarrollar BODYVISION AI por fases. Esta entrega proporciona una interfaz React, una API FastAPI, PostgreSQL y un entorno local con Docker Compose.

> **Estado:** fundación técnica. No incluye autenticación, permisos, consentimiento, carga de imágenes, análisis de IA ni visor 3D completos. No usar con datos personales o imágenes reales.

## Requisitos

- Docker y Docker Compose
- Git

## Arranque local

1. Copiar `.env.example` a `.env`.
2. Para desarrollo local, se puede conservar la contraseña de ejemplo; no reutilizarla fuera de ese entorno.
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
- La API y la base de datos de este starter solo exponen una comprobación de salud; aún no hay rutas de negocio.
- El alcance del producto es informativo y de gestión. Una estimación visual no es una medición clínica ni un diagnóstico.

Consultar [la arquitectura](docs/architecture/README.md), [las decisiones pendientes](docs/architecture/decisions.md) y [el roadmap](docs/roadmap.md) antes de ampliar el starter.
