from datetime import datetime

from pydantic import BaseModel


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

    model_config = {"from_attributes": True}
