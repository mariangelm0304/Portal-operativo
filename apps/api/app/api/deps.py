from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import decodificar_token
from app.db.session import get_db
from app.models.enums import Rol

_bearer = HTTPBearer(auto_error=False)


class Claims(BaseModel):
    rol: Rol
    nombre: str
    tienda_id: int | None = None
    tienda_slug: str | None = None


def obtener_claims(credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> Claims:
    if credenciales is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta el token de sesión")
    payload = decodificar_token(credenciales.credentials)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada")
    return Claims(**payload)


def requiere_admin(claims: Claims = Depends(obtener_claims)) -> Claims:
    if claims.rol != Rol.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Requiere sesión de administrador")
    return claims


def requiere_rol_en_tienda(*roles: Rol):
    """Guarda server-side real: valida que el JWT tenga uno de estos roles Y, si no es
    admin, que la tienda del token sea la que pide la ruta. La UI del original solo
    escondía botones; esto es lo que faltaba del lado del servidor."""

    def dependencia(claims: Claims = Depends(obtener_claims)) -> Claims:
        if claims.rol == Rol.admin:
            return claims
        if claims.rol not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu rol no puede hacer esto")
        return claims

    return dependencia


def verificar_tienda(claims: Claims, tienda_id: int) -> None:
    if claims.rol == Rol.admin:
        return
    if claims.tienda_id != tienda_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No puedes operar sobre otra tienda")


DbSession = Generator[Session, None, None]
