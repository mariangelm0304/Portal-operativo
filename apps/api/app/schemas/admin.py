from pydantic import BaseModel, Field


class AdminConfigOut(BaseModel):
    retencion_semanas: int

    model_config = {"from_attributes": True}


class AdminConfigIn(BaseModel):
    retencion_semanas: int = Field(ge=1, le=52)


class CambiarPinAdminIn(BaseModel):
    pin_actual: str
    pin_nuevo: str = Field(min_length=4, max_length=32)


class CambiarPinTiendaIn(BaseModel):
    slug: str
    pin_nuevo: str = Field(min_length=4, max_length=8)


class ResumenKPI(BaseModel):
    actividad: str
    cumplen: int
    incumplen: int
    excluyen: int
    total: int
    porcentaje_cumplimiento: float
