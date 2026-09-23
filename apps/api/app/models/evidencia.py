from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import SyncEstado

if TYPE_CHECKING:
    from app.models.registro import Registro


class Evidencia(Base):
    """Un archivo adjunto a un Registro (foto, PDF, Excel...). El contenido en sí no vive
    en Postgres: `ruta_almacenamiento` es la clave que entiende app/storage (disco local en
    desarrollo, objeto S3/R2 en producción)."""

    __tablename__ = "evidencias"

    id: Mapped[int] = mapped_column(primary_key=True)
    registro_id: Mapped[int] = mapped_column(ForeignKey("registros.id"), index=True)

    # 'conteo', 'acta', 'bodega-1'...'bodega-12', etc. — ver ACTS/RANURAS del original.
    ranura: Mapped[str] = mapped_column(String(40))
    etiqueta: Mapped[str] = mapped_column(String(120))

    nombre_original: Mapped[str] = mapped_column(String(255))
    ruta_almacenamiento: Mapped[str] = mapped_column(String(500))
    tipo_mime: Mapped[str] = mapped_column(String(120))
    tamano_bytes: Mapped[int] = mapped_column(BigInteger)

    subido_por: Mapped[str] = mapped_column(String(120))
    subido_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sync_estado: Mapped[SyncEstado] = mapped_column(String(20), default=SyncEstado.PENDIENTE)
    sync_error: Mapped[str | None] = mapped_column(String(500), nullable=True)

    registro: Mapped["Registro"] = relationship(back_populates="evidencias")
