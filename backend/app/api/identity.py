from dataclasses import dataclass
from functools import lru_cache
from uuid import NAMESPACE_URL, uuid5

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError

from app.core.config import settings

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Actor:
    id: str
    organization: str
    scopes: frozenset[str]


@lru_cache(maxsize=1)
def keys(url: str):
    return PyJWKClient(url, timeout=5)


def identity(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> Actor:
    if settings.demo_mode:
        return Actor('demo', 'demo', frozenset())
    if not credentials:
        raise HTTPException(401, 'Inicia sesión.', headers={'WWW-Authenticate': 'Bearer'})
    try:
        token = credentials.credentials
        key = keys(settings.oidc_jwks_url).get_signing_key_from_jwt(token).key
        claims = jwt.decode(token, key, algorithms=['RS256'], issuer=settings.oidc_issuer,
                            audience=settings.oidc_audience, options={'require': ['exp', 'iat', 'sub']})
        organization = claims.get('org_id')
        if not isinstance(organization, str) or not organization.strip():
            raise HTTPException(403, 'La cuenta requiere una organización asignada.')
        scopes = claims.get('scope', '')
        if not isinstance(scopes, str):
            raise HTTPException(403, 'Permisos inválidos.')
        actor = Actor(str(uuid5(NAMESPACE_URL, settings.oidc_issuer+'#user:'+claims['sub'])),
                      str(uuid5(NAMESPACE_URL, settings.oidc_issuer+'#org:'+organization)), frozenset(scopes.split()))
    except PyJWKClientConnectionError as exc:
        raise HTTPException(503, 'Proveedor de identidad temporalmente inaccesible.') from exc
    except (jwt.PyJWTError, ValueError, TypeError) as exc:
        raise HTTPException(401, 'Sesión inválida o vencida.', headers={'WWW-Authenticate': 'Bearer'}) from exc
    required = 'bodyvision:read' if request.method == 'GET' else 'bodyvision:write'
    if required not in actor.scopes:
        raise HTTPException(403, 'Permiso insuficiente.')
    return actor
