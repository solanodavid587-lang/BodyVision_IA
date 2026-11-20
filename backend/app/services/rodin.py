from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.core.config import settings


class RodinError(Exception):
    pass


def _headers() -> dict[str, str]:
    if not settings.rodin_api_key:
        raise RodinError('El proveedor 3D no está configurado. Añade RODIN_API_KEY al entorno del backend.')
    return {'Authorization': f'Bearer {settings.rodin_api_key}'}


def _json_response(response: httpx.Response) -> dict:
    try:
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise RodinError('Rodin no pudo completar la solicitud. Verifica la configuración y vuelve a intentar.') from error
    if not isinstance(payload, dict):
        raise RodinError('Rodin devolvió una respuesta inválida.')
    return payload


def submit_generation(image: bytes, filename: str, content_type: str) -> tuple[str, str]:
    try:
        with httpx.Client(timeout=120) as client:
            response = client.post(
                f'{settings.rodin_api_base_url.rstrip("/")}/rodin',
                headers=_headers(),
                files={'images': (filename, image, content_type)},
                data={'tier': settings.rodin_tier, 'mesh_mode': 'Raw', 'quality': 'medium', 'geometry_file_format': 'glb'},
            )
        payload = _json_response(response)
    except httpx.HTTPError as error:
        raise RodinError('No se pudo conectar con Rodin. Inténtalo más tarde.') from error

    task_uuid = payload.get('uuid')
    subscription_key = (payload.get('jobs') or {}).get('subscription_key')
    if payload.get('error') or not task_uuid or not subscription_key:
        raise RodinError('Rodin rechazó la generación. Revisa el formato de imagen, el acceso API y el saldo.')
    return str(task_uuid), str(subscription_key)


def get_generation_status(subscription_key: str) -> list[str]:
    try:
        with httpx.Client(timeout=30) as client:
            response = client.post(
                f'{settings.rodin_api_base_url.rstrip("/")}/status',
                headers=_headers(),
                json={'subscription_key': subscription_key},
            )
        payload = _json_response(response)
    except httpx.HTTPError as error:
        raise RodinError('No se pudo consultar el estado en Rodin.') from error

    jobs = payload.get('jobs')
    if not isinstance(jobs, list) or not jobs:
        raise RodinError('Rodin devolvió un estado de generación inválido.')
    return [str(job.get('status', '')) for job in jobs if isinstance(job, dict)]


def download_generation(task_uuid: str, generation_id: str) -> str:
    try:
        with httpx.Client(timeout=60) as client:
            response = client.post(
                f'{settings.rodin_api_base_url.rstrip("/")}/download',
                headers=_headers(),
                json={'task_uuid': task_uuid},
            )
            payload = _json_response(response)
            files = payload.get('list')
            model = next(
                (item for item in files or [] if isinstance(item, dict) and str(item.get('name', '')).lower().endswith('.glb')),
                None,
            )
            if not model or not model.get('url'):
                raise RodinError('Rodin terminó, pero no entregó un modelo GLB.')
            model_url = str(model['url'])
            if urlparse(model_url).scheme != 'https':
                raise RodinError('Rodin devolvió una URL de descarga no segura.')
            asset = client.get(model_url)
            asset.raise_for_status()
            if asset.url.scheme != 'https':
                raise RodinError('La descarga del modelo dejó de usar HTTPS.')
            if not asset.content.startswith(b'glTF'):
                raise RodinError('El archivo recibido no es un modelo GLB válido.')
    except httpx.HTTPError as error:
        raise RodinError('No se pudo descargar el modelo generado por Rodin.') from error

    storage = Path(settings.rodin_storage_dir).resolve()
    storage.mkdir(parents=True, exist_ok=True)
    filename = f'{generation_id}.glb'
    target = storage / filename
    target.write_bytes(asset.content)
    return filename
