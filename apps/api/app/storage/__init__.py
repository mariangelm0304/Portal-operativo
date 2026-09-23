from app.storage.base import Storage
from app.storage.local import LocalStorage

__all__ = ["Storage", "LocalStorage", "get_storage"]


def get_storage() -> Storage:
    """Punto único de cambio: para producción se reemplaza por una implementación de
    objetos (S3/R2) que respete la misma interfaz — ver CLAUDE.md, sección storage/."""
    from app.core.config import get_settings

    return LocalStorage(get_settings().uploads_dir)
