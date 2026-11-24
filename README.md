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

El backend inicia en `DEMO_MODE=true`: presenta perfiles sintéticos de solo lectura y no consulta ni modifica perfiles guardados en la base de datos. La configuración rechaza `DEMO_MODE=false` mientras falten autenticación, permisos por expediente y aislamiento multiusuario. Las imágenes de captura no se envían a la API; MediaPipe analiza la cámara localmente en el navegador.

Los activos 3D demostrativos deben reemplazarse por activos licenciados antes de producción.

El API valida el catálogo y las unidades de las mediciones, exige fechas con zona horaria, conserva las correcciones como nuevos registros y permite consultar/revocar consentimientos. En modo demo, las escrituras devuelven `403 DEMO_READ_ONLY`. Fuera de ese modo, la identidad y los permisos todavía no están implementados; el actor de auditoría es un marcador de desarrollo, no una identidad verificada.

## Dashboard

El panel muestra datos sintéticos etiquetados como demostración y el atlas 3D local. No representa personas reales ni resultados clínicos.

## Captura y visor 3D local

La captura solicita permiso para usar la cámara, detecta pose y segmenta la silueta con MediaPipe en el navegador. La imagen y el escaneo se conservan solo en memoria durante la sesión y no se envían al backend; el modelo gratuito se descarga desde Google/CDN al usarlo. La malla 3D extruye la silueta frontal con profundidad estimada, y los perímetros usan una sección elíptica supuesta calibrada con la estatura ingresada. Son aproximaciones visuales, no un escaneo volumétrico ni medidas clínicas. Se necesita HTTPS o localhost y conexión a internet para descargar el modelo. Expedientes y mediciones locales se pierden al recargar.

El atlas anatómico sigue siendo genérico y demostrativo. No cargues fotografías de personas reales sin autorización explícita.

## Análisis de pose y escenarios

- **Análisis de pose:** MediaPipe Pose detecta landmarks localmente en el navegador. La imagen no se envía al backend para este análisis; la visibilidad de landmarks no representa la precisión de medidas anatómicas.
- **Mediciones:** peso, estatura, cintura, cadera y porcentajes corporales se registran con unidad y método. Grasa corporal y masa muscular solo deben incluirse cuando provienen de una medición independiente.
- **Escenario objetivo:** compara el atlas anatómico 3D genérico en vistas actual y objetivo; la escala horizontal de la vista objetivo se amplifica para hacer visible el cambio ilustrativo según el peso, cintura y cadera. No representa un cuerpo personalizado, no predice cómo una persona real distribuirá grasa o músculo y no altera los datos observados. Los perímetros inferidos de la captura se etiquetan como estimaciones y no se usan como referencia del escenario.

## Criterios pendientes antes de datos reales

- Autenticación, roles, autorización por recurso y pruebas de aislamiento por organización.
- Aplicación del consentimiento a cada procesamiento, identidad verificable en auditoría y política de retención/eliminación.
- Captura segura, validación de archivos y almacenamiento privado; análisis de pose versionado y validado.
- Migraciones, CI/CD, TLS, observabilidad, backups y pruebas de restauración.

Las validaciones, correcciones y revocación por API tienen pruebas de integración; la analítica por unidad y la procedencia por fila están implementadas en la interfaz, pero aún requieren pruebas automatizadas de frontend. Nada de esto sustituye los controles pendientes. El modo de demostración no está autorizado para producción y solo debe contener los fixtures sintéticos definidos por el proyecto.

## Datos de simulación disponibles

- Tres perfiles sintéticos con historiales independientes de mediciones.
- Dashboard con composición, evolución, escaneo 3D y mapa térmico demostrativos.
- Captura de cámara con segmentación local y malla 3D aproximada; las personas y medidas no se simulan, pero las dimensiones inferidas son estimaciones visuales.
- Analítica y reportes con valores sintéticos, unidades compatibles y procedencia visible.
- Pose con landmarks 3D sintéticos y un mapa térmico corporal 3D demostrativo, además de una matriz térmica generada localmente.
- Simulador con valores objetivo sobre el último dato sintético, sin modificar mediciones.
- Administración con usuarios, consentimientos y eventos ilustrativos.

Todos los datos de simulación deben aparecer etiquetados como sintéticos o demo. No representan personas reales, diagnósticos ni temperaturas clínicas.

## Visor anatómico 3D

La opción **Anatomía 3D** presenta vistas paralelas del cuerpo y el esqueleto, con rotación 360° y controles para explorar las capas de piel, huesos, órganos y venas del atlas de [Z-Anatomy](https://www.z-anatomy.com/), derivado de [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/). Los modelos se distribuyen bajo CC BY-SA 4.0; consulta [source/License.txt](source/License.txt) para las atribuciones.

La capa de órganos incluye un modelo de riñón de Lissie Cowley con licencia CC BY-NC 4.0, según el repositorio de referencia. Por ello, este visor se limita a uso demostrativo no comercial; sustituye ese activo por uno con licencia compatible antes de cualquier distribución comercial. El visor no ofrece información clínica ni diagnósticos.

## Despliegue en Render y Vercel

El proyecto se despliega como dos servicios independientes:

1. **Render — API**
   - Importa el repositorio y selecciona el Blueprint `render.yaml`.
   - Render construirá `backend/Dockerfile`.
   - Mantén `DEMO_MODE=true`.
   - Configura `CORS_ORIGINS` con la URL final de Vercel, por ejemplo `https://tu-proyecto.vercel.app`.
   - Render creará una URL HTTPS como `https://bodyvision-api.onrender.com`.
   - No se necesita configurar `DATABASE_URL` para el modo demo; el Blueprint usa SQLite local. Los datos escritos no están habilitados y el disco puede ser efímero.

2. **Vercel — interfaz**
   - Crea el proyecto apuntando al repositorio.
   - El archivo `vercel.json` usa `frontend` como carpeta de compilación.
   - Configura `VITE_API_URL=https://bodyvision-api.onrender.com` en Environment Variables antes del build.
   - Desplegará automáticamente `frontend/dist`.
   - Después del primer despliegue, copia la URL HTTPS de Vercel y actualiza `CORS_ORIGINS` en Render.

Si también usarás el Docker del frontend:

```bash
docker build --build-arg VITE_API_URL=https://bodyvision-api.onrender.com -t bodyvision-web ./frontend
docker run --rm -p 8080:80 bodyvision-web
```

Ejemplo:

```text
VITE_API_URL=https://bodyvision-api.onrender.com
CORS_ORIGINS=https://tu-proyecto.vercel.app
DEMO_MODE=true
```

Para datos reales no basta cambiar variables: primero deben completarse autenticación, autorización por expediente, almacenamiento privado y migraciones persistentes.
