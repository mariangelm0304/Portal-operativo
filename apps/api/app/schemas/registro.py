from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.models.enums import Actividad, EstadoRegistro, SyncEstado


class RegistroIn(BaseModel):
    """Lo que manda el operario al guardar su semana. `datos` son los campos propios de
    la actividad (cierre %, bodega, unidades, novedad, fecha...) — se valida su forma en
    el service, no aquí, porque cambia según `actividad` (igual que ACTS en el original)."""

    estado: EstadoRegistro
    datos: dict[str, Any] = {}


class RegistroOut(BaseModel):
    id: int
    actividad: Actividad
    tienda_id: int
    semana: int
    estado: EstadoRegistro
    datos: dict[str, Any]
    reportado_por: str
    reportado_rol: str
    sync_estado: SyncEstado
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}
