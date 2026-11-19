from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "BODYVISION AI API"
    database_url: str
    cors_origins: str = "http://localhost:5173"
    auth_secret_key: str = "development-only-change-before-deploy"
    session_cookie_secure: bool = False
    initial_admin_dni: str | None = None
    initial_admin_password: str | None = None
    initial_admin_name: str = "Administración BODYVISION"
    environment: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

    def validate_runtime_configuration(self) -> None:
        if self.environment.lower() not in {"production", "prod"}:
            return
        if (
            self.auth_secret_key
            in {
                "development-only-change-before-deploy",
                "local-only-change-this-secret-before-deploy-32chars",
            }
            or len(self.auth_secret_key) < 32
        ):
            raise RuntimeError("Production requires a strong AUTH_SECRET_KEY.")
        if not self.session_cookie_secure:
            raise RuntimeError("Production requires SESSION_COOKIE_SECURE=true.")
        if (
            self.initial_admin_dni == "12345678"
            or self.initial_admin_password == "ChangeMe_LocalOnly_2026!"
        ):
            raise RuntimeError("Replace the local demonstration administrator credentials.")


settings = Settings()
