from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import Rol

if TYPE_CHECKING:
    from app.models.tienda import Tienda


class Persona(Base):
    """Sobreescribe al responsable por defecto del maestro (Tienda.coordinador/tecnico/
    auxiliar) para un rol en una tienda. Se crea cuando alguien entra por 'No estoy en la
    lista...' (ver el flujo original abrirAltaPersona en legacy/index-original.html)."""

    __tablename__ = "personas"

    id: Mapped[int] = mapped_column(primary_key=True)
    tienda_id: Mapped[int] = mapped_column(ForeignKey("tiendas.id"))
    rol: Mapped[Rol] = mapped_column(String(20))
    nombre: Mapped[str] = mapped_column(String(120))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    tienda: Mapped["Tienda"] = relationship(back_populates="personas")
