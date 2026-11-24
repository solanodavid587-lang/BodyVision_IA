from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = 'sqlite:///./bodyvision.db'
    cors_origins: str = 'http://localhost:5173'
    demo_mode: bool = True

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    @model_validator(mode='after')
    def require_demo_mode_until_authentication_exists(self) -> 'Settings':
        if not self.demo_mode:
            raise ValueError('DEMO_MODE cannot be disabled until authentication and authorization are implemented.')
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]


settings = Settings()
