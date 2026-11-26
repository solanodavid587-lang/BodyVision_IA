# Despliegue de BodyVision con expedientes privados

## Preparar el entorno

Usar una instancia de PostgreSQL nueva. El blueprint render.yaml existente configura la demostración. Mantener entornos y bases separados. Para una instalación previa con datos, obtener una copia, restaurarla en otra base y revisar su esquema y titularidad antes de migrarla. Los expedientes antiguos sin propietario requieren asignación verificada.

Registrar una aplicación web pública de tipo SPA en el proveedor OIDC con Authorization Code y PKCE. Autorizar el origen HTTPS exacto del frontend, el retorno /auth/callback y el retorno de cierre de sesión /. Configurar tokens de acceso JWT RS256 para la audiencia de la API. El proveedor debe asignar org_id desde su directorio y permisos bodyvision:read y bodyvision:write según el rol. El permiso adicional bodyvision:admin permite acceso entre propietarios dentro de la organización. Configurar MFA y una cuenta de prueba en cada organización.

| Servicio | Variable | Valor |
| --- | --- | --- |
| Render | DEMO_MODE | false |
| Render | DATABASE_URL | Conexión privada de PostgreSQL desde el gestor de secretos |
| Render | CORS_ORIGINS | Origen HTTPS exacto de Vercel |
| Render | OIDC_ISSUER | Emisor HTTPS tal como aparece en el token |
| Render | OIDC_JWKS_URL | jwks_uri publicado por el emisor |
| Render | OIDC_AUDIENCE | Audiencia registrada para la API |
| Vercel | VITE_ENTERPRISE | true |
| Vercel | VITE_API_URL | Origen HTTPS del backend, sin /api/v1 |
| Vercel | VITE_OIDC_ISSUER | Mismo emisor que en Render |
| Vercel | VITE_OIDC_CLIENT_ID | ID público de la SPA |
| Vercel | VITE_OIDC_AUDIENCE | Misma audiencia que en Render |

En Render usar el directorio backend y su Dockerfile. Ejecutar alembic upgrade head una vez como paso previo a la puesta en línea de cada revisión. Si el plan carece de ese paso, ejecutar la migración desde un trabajo autorizado con las mismas variables y acceso privado. Configurar /api/v1/ready como comprobación de disponibilidad. En Vercel usar la raíz del repositorio y vercel.json. Reconstruir después de cambiar las variables VITE. Registrar únicamente valores públicos en esas variables.

## Aceptación en el dominio definitivo

1. Verificar que /api/v1/health devuelve demo_mode false y que /api/v1/ready responde 200. Abrir un enlace directo a un expediente en una sesión privada y comprobar que se pide iniciar sesión.
2. Crear un expediente sintético. Con una cuenta de otra organización, comprobar el rechazo de su identificador directo. Registrar y revocar autorizaciones diferenciadas de mediciones, rostro y captura corporal. El operador registra la decisión de la persona.
3. Con una foto autorizada de prueba, introducir altura y peso, cargar la foto frontal, verificar la detección de cuerpo completo y cambiar los parámetros del simulador. Probar la cámara en los navegadores de destino, incluida la denegación de permisos. La fotografía y la malla residen en memoria. Las mediciones guardadas en el formulario del expediente persisten en la API.
4. Comparar los perímetros estimados con mediciones de referencia y documentar el error por postura, ropa y encuadre. El simulador produce una transformación geométrica. Una predicción fisiológica requiere validación con resultados observados.
5. Asignar responsable de alertas por indisponibilidad y errores, habilitar copias cifradas y ensayar la restauración en una base distinta. Verificar conteos y titularidad con datos sintéticos y acordar ventanas de recuperación, retención y eliminación con el responsable del servicio. Revisar los textos de consentimiento, licencias de modelos y la descarga de modelos MediaPipe desde Google antes de admitir usuarios reales.
6. Para revertir una publicación, detener escrituras y comprobar compatibilidad de la versión anterior con el esquema. Realizar la recuperación en una base separada y validar antes de cambiar la conexión.
