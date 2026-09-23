from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AdminConfig(Base):
    """Tabla singleton (siempre id=1) — equivalente a `cfg` en el portal original,
    sin los PIN por tienda (esos viven en Tienda.pin_hash)."""

    __tablename__ = "admin_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    admin_pin_hash: Mapped[str] = mapped_column(String(120))
    retencion_semanas: Mapped[int] = mapped_column(Integer, default=3)
