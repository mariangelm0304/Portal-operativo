from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Traza(Base):
    """Bitácora de auditoría, insert-only. A diferencia del original (donde el propio
    navegador armaba la traza y por tanto era falsificable), aquí se escribe desde el
    servidor a partir del actor autenticado en el JWT — ver app/api/v1/registros.py."""

    __tablename__ = "trazas"

    id: Mapped[int] = mapped_column(primary_key=True)
    actividad: Mapped[str] = mapped_column(String(20))
    tienda_id: Mapped[int] = mapped_column(ForeignKey("tiendas.id"))
    tienda_nombre: Mapped[str] = mapped_column(String(80))  # desnormalizado a propósito: es historial
    semana: Mapped[int] = mapped_column()
    estado: Mapped[str] = mapped_column(String(20))
    por: Mapped[str] = mapped_column(String(120))
    rol: Mapped[str] = mapped_column(String(20))
    en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
