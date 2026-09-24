from datetime import datetime

from pydantic import BaseModel


class EvidenciaResumen(BaseModel):
    id: int
    nombre_original: str


class TrazaOut(BaseModel):
    id: int
    actividad: str
    tienda_id: int
    tienda_nombre: str
    semana: int
    estado: str
    por: str
    rol: str
    en: datetime
    evidencias: list[EvidenciaResumen] = []
    link: str | None = None

    model_config = {"from_attributes": True}
