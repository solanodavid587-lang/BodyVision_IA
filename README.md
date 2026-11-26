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

El backend arranca en demostración con expedientes sintéticos de solo lectura. La configuración privada requiere PostgreSQL, un proveedor OIDC y el origen HTTPS del frontend. La API verifica la identidad del operador, limita el acceso por organización y propietario, y registra los cambios en auditoría.

El build empresarial excluye el atlas demostrativo. La carga de una foto frontal y la captura por cámara se procesan en memoria en el navegador.

[Configuración del despliegue privado y pruebas de aceptación](docs/produccion.md)

## Dashboard

El panel muestra datos sintéticos etiquetados como demostración y el atlas 3D local. No representa personas reales ni resultados clínicos.

## Captura y visor 3D local

La captura solicita permiso para usar la cámara, detecta pose y segmenta la silueta con MediaPipe en el navegador. La imagen y el escaneo se conservan solo en memoria durante la sesión y no se envían al backend; el modelo gratuito se descarga desde Google/CDN al usarlo. La malla 3D extruye la silueta frontal con profundidad estimada, y los perímetros usan una sección elíptica supuesta calibrada con la estatura ingresada. Son aproximaciones visuales, no un escaneo volumétrico ni medidas clínicas. Se necesita HTTPS o localhost y conexión a internet para descargar el modelo. Expedientes y mediciones locales se pierden al recargar.

El atlas anatómico sigue siendo genérico y demostrativo. No cargues fotografías de personas reales sin autorización explícita.

## Análisis de pose y escenarios

- **Análisis de pose:** MediaPipe Pose detecta landmarks localmente en el navegador. La imagen no se envía al backend para este análisis; la visibilidad de landmarks no representa la precisión de medidas anatómicas.
- **Mediciones:** peso, estatura, cintura, cadera y porcentajes corporales se registran con unidad y método. Grasa corporal y masa muscular solo deben incluirse cuando provienen de una medición independiente.
- **Escenario objetivo:** el simulador adapta por zonas la silueta capturada o un avatar genérico según peso, altura y perímetros disponibles. El cambio de volumen y su distribución son ilustrativos, no una predicción de cambios físicos individuales.

## Antes de admitir datos reales

El despliegue requiere verificar el acceso con el proveedor de identidad definitivo, probar cámara y fotografías en los navegadores elegidos, ensayar la recuperación de PostgreSQL y acordar retención y eliminación. La precisión de los perímetros y la evolución corporal requieren validaciones independientes. La guía de despliegue describe las pruebas y los responsables que debe asignar el equipo.

## Datos de simulación disponibles

- Tres perfiles sintéticos con historiales independientes de mediciones.
- Dashboard con composición, evolución, escaneo 3D y mapa térmico demostrativos.
- Captura de cámara con segmentación local y malla 3D aproximada; las personas y medidas no se simulan, pero las dimensiones inferidas son estimaciones visuales.
- Analítica y reportes con valores sintéticos, unidades compatibles y procedencia visible.
- Análisis de pose y malla 3D vinculados a la captura local; el mapa de colores ilustra un patrón térmico corporal sintético sobre la silueta y no representa temperaturas medidas ni termografía clínica.
- Simulador con morfología 3D ilustrativa por zonas sobre parámetros objetivo, sin modificar mediciones.
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
