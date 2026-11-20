# BODYVISION AI

Plataforma web empresarial para expedientes, mediciones, consentimiento, captura de pose y visualización 3D.

## Arquitectura

- `frontend/`: React, TypeScript, Vite, Recharts y React Three Fiber.
- `backend/`: Python, FastAPI, Pydantic y SQLAlchemy.
- `backend/alembic/`: migraciones del modelo.
- `infra/`: infraestructura y despliegue.
- `docs/`: documentación técnica por dominio.
- PostgreSQL para producción y SQLite solo como base local mínima.

## Inicio local

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:8000
- OpenAPI: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health

No usar datos personales reales en el entorno local. Los activos 3D demostrativos deben reemplazarse por activos licenciados antes de producción.

## Generación 3D con Rodin

1. Crea una API key en el [panel de Hyper3D](https://hyper3d.ai/workspace/api-dashboard).
2. Añade `RODIN_API_KEY` a `.env`; nunca se expone al frontend ni se debe subir al repositorio.
3. Reconstruye/inicia la aplicación con `docker compose up --build`.
4. En Captura Corporal, selecciona un expediente, carga una foto JPEG/PNG de cuerpo completo y confirma que cuentas con autorización para enviarla a Hyper3D.

La integración envía la imagen directamente al backend, crea una tarea asíncrona con Rodin Gen-2.5 y guarda el GLB devuelto en el volumen `model_data`. Rodin indica una retención de 7 días para datos de entrada y salida de API. El volumen local requiere una política de retención propia.

Una única foto no proporciona geometría completa verificable ni medidas corporales clínicas. Rodin crea una aproximación 3D visual; no es análisis de composición corporal ni diagnóstico. Para mediciones fiables se requiere captura calibrada desde varias vistas y un método validado.

## Análisis de pose y escenarios

- **Análisis de pose:** MediaPipe Pose detecta landmarks localmente en el navegador. La imagen no se envía al backend para este análisis; la visibilidad de landmarks no representa la precisión de medidas anatómicas.
- **Mediciones:** peso, estatura, cintura, cadera y porcentajes corporales se registran con unidad y método. Grasa corporal y masa muscular solo deben incluirse cuando provienen de una medición independiente.
- **Escenario objetivo:** el avatar paramétrico cambia de forma ilustrativa con el peso, cintura y cadera objetivo. No predice cómo una persona real distribuirá grasa o músculo y no altera los datos observados.
