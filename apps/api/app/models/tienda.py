from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.persona import Persona
    from app.models.registro import Registro


class Tienda(Base):
    __tablename__ = "tiendas"

    id: Mapped[int] = mapped_column(primary_key=True)
    ag: Mapped[str] = mapped_column(String(4), unique=True, index=True)  # llave contra SAP/Tableau
    nombre: Mapped[str] = mapped_column(String(80))
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    zona: Mapped[str] = mapped_column(String(60))
    nombre_pistoleo: Mapped[str] = mapped_column(String(80))
    verificar: Mapped[bool] = mapped_column(Boolean, default=False)

    # Maestro por defecto (coordinador/técnico/auxiliar de cada tienda). Una Persona con el
    # mismo rol en esta tienda tiene prioridad sobre estos campos — ver app/models/persona.py.
    coordinador: Mapped[str | None] = mapped_column(String(120), nullable=True)
    estado_coordinador: Mapped[str] = mapped_column(String(20), default="SIN_ASIGNAR")
    tecnico: Mapped[str | None] = mapped_column(String(120), nullable=True)
    estado_tecnico: Mapped[str] = mapped_column(String(20), default="SIN_ASIGNAR")
    auxiliar: Mapped[str | None] = mapped_column(String(120), nullable=True)
    estado_auxiliar: Mapped[str] = mapped_column(String(20), default="SIN_ASIGNAR")

    # El PIN identifica quién registra, no es una credencial fuerte — se conserva ese modelo
    # de negocio, pero ahora se guarda hasheado (nunca en texto plano, nunca se devuelve).
    pin_hash: Mapped[str] = mapped_column(String(120))

    personas: Mapped[list["Persona"]] = relationship(back_populates="tienda")
    registros: Mapped[list["Registro"]] = relationship(back_populates="tienda")
