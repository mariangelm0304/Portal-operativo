from pydantic import BaseModel


class PersonaOut(BaseModel):
    rol: str
    nombre: str

    model_config = {"from_attributes": True}


class TiendaOut(BaseModel):
    id: int
    ag: str
    nombre: str
    slug: str
    zona: str
    nombre_pistoleo: str
    verificar: bool
    coordinador: str | None
    estado_coordinador: str
    tecnico: str | None
    estado_tecnico: str
    auxiliar: str | None
    estado_auxiliar: str

    model_config = {"from_attributes": True}
