from urllib.parse import urlsplit

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def https_endpoint(value: str, *, origin: bool = False) -> bool:
    url = urlsplit(value)
    return bool(url.scheme == 'https' and url.hostname and not url.username and not url.password
                and not url.query and not url.fragment and '*' not in value
                and (not origin or not url.path))


class Settings(BaseSettings):
    database_url: str = 'sqlite:///./bodyvision.db'
    cors_origins: str = 'http://localhost:5173'
    demo_mode: bool = True

    oidc_issuer: str = ''
    oidc_audience: str = ''
    oidc_jwks_url: str = ''

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    @model_validator(mode='after')
    def validate_runtime(self) -> 'Settings':
        for prefix in ('postgres://', 'postgresql://'):
            if self.database_url.startswith(prefix):
                self.database_url = 'postgresql+psycopg://' + self.database_url[len(prefix):]
        if not self.demo_mode:
            if not https_endpoint(self.oidc_issuer) or not https_endpoint(self.oidc_jwks_url) or not self.oidc_audience:
                raise ValueError('DEMO_MODE=false requiere OIDC_ISSUER, OIDC_JWKS_URL HTTPS y OIDC_AUDIENCE.')
            if not self.database_url.startswith(('postgresql://','postgresql+psycopg://')):
                raise ValueError('Configura PostgreSQL persistente.')
            if not self.cors_origin_list or any(not https_endpoint(origin, origin=True) for origin in self.cors_origin_list):
                raise ValueError('Configura los orígenes HTTPS del frontend.')
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]


settings = Settings()
