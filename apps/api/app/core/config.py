from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Portal Operativo Jamar"
    environment: str = "development"

    database_url: str = "postgresql+psycopg://portal:portal@localhost:5432/portal_operativo"

    jwt_secret: str = "cambia-esto-en-produccion"
    jwt_algorithm: str = "HS256"
    jwt_expira_minutos: int = 60 * 10  # 10 horas: cubre un turno de tienda

    cors_origins: list[str] = ["http://localhost:5173"]

    # Los archivos se guardan localmente en desarrollo; en producción se cambia
    # la implementación de app/storage por una de objetos (S3/R2), sin tocar routers.
    uploads_dir: str = "./uploads"
    max_archivo_bytes: int = 15 * 1024 * 1024  # 15 MB, igual al límite del portal original

    retencion_semanas_default: int = 3

    pin_admin_default: str = "JAMAR2026"

    google_service_account_json: str | None = None
    google_sheet_id: str | None = None
    google_drive_root_folder_id: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
