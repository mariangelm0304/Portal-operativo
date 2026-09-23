from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import Actividad, EstadoRegistro, SyncEstado

if TYPE_CHECKING:
    from app.models.evidencia import Evidencia
    from app.models.tienda import Tienda


class Registro(Base):
    """Un reporte semanal de una actividad para una tienda. Equivale a una entrada de
    overlay[act][slug].semanas[sem] en el portal original, ya fusionada (aquí no hay
    'base histórica' aparte: todo vive en esta tabla desde la importación inicial)."""

    __tablename__ = "registros"
    __table_args__ = (UniqueConstraint("actividad", "tienda_id", "semana", name="uq_registro_semana"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    actividad: Mapped[Actividad] = mapped_column(String(20), index=True)
    tienda_id: Mapped[int] = mapped_column(ForeignKey("tiendas.id"), index=True)
    semana: Mapped[int] = mapped_column(index=True)
    estado: Mapped[EstadoRegistro] = mapped_column(String(20))

    # Campos propios de cada actividad (cierre %, estado de bodega, unidades pistoleadas,
    # novedad, fecha del conteo, etc.) — su forma varía por actividad, igual que en el
    # original; se valida por schema Pydantic según `actividad`, no aquí.
    datos: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    reportado_por: Mapped[str] = mapped_column(String(120))
    reportado_rol: Mapped[str] = mapped_column(String(20))

    sync_estado: Mapped[SyncEstado] = mapped_column(String(20), default=SyncEstado.PENDIENTE)
    sync_error: Mapped[str | None] = mapped_column(String(500), nullable=True)

    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    tienda: Mapped["Tienda"] = relationship(back_populates="registros")
    evidencias: Mapped[list["Evidencia"]] = relationship(back_populates="registro", cascade="all, delete-orphan")
