from pydantic import BaseModel, Field

from app.models.enums import Rol


class LoginTiendaRequest(BaseModel):
    slug: str
    rol: Rol
    nombre: str = Field(min_length=2, max_length=120)
    pin: str = Field(min_length=4, max_length=8)


class LoginAdminRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=32)


class AltaPersonaRequest(BaseModel):
    slug: str
    pin: str
    rol: Rol
    nombre: str = Field(min_length=4, max_length=120)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str
    nombre: str
    tienda_slug: str | None = None
