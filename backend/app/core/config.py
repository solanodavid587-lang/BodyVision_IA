from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = 'sqlite:///./bodyvision.db'
    cors_origins: str = 'http://localhost:5173'
    max_upload_mb: int = 10
    rodin_api_key: str = ''
    rodin_api_base_url: str = 'https://api.hyper3d.com/api/v2'
    rodin_tier: str = 'Gen-2.5-Medium'
    rodin_storage_dir: str = './model_storage'

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]


settings = Settings()
