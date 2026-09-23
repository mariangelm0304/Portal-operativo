from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.core.security import crear_token, hash_pin, verificar_pin
from app.db.session import get_db
from app.models.admin_config import AdminConfig
from app.models.enums import Rol
from app.models.persona import Persona
from app.models.tienda import Tienda
from app.schemas.auth import AltaPersonaRequest, LoginAdminRequest, LoginTiendaRequest, TokenResponse

router = APIRouter()


def _persona_valida(db: Session, tienda: Tienda, rol: Rol, nombre: str) -> bool:
    if rol == Rol.auxiliar:
        return True  # el auxiliar de piso existe en las 21 tiendas aunque no tenga nombre fijo
    if rol == Rol.coordinador and tienda.coordinador == nombre:
        return True
    if rol == Rol.tecnico and tienda.tecnico == nombre:
        return True
    return (
        db.query(Persona)
        .filter(Persona.tienda_id == tienda.id, Persona.rol == rol, Persona.nombre == nombre, Persona.activo.is_(True))
        .first()
        is not None
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, datos: LoginTiendaRequest, db: Session = Depends(get_db)) -> TokenResponse:
    tienda = db.query(Tienda).filter(Tienda.slug == datos.slug).first()
    if tienda is None or not verificar_pin(datos.pin, tienda.pin_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Tienda o PIN incorrecto")
    if not _persona_valida(db, tienda, datos.rol, datos.nombre):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Ese nombre no está registrado para ese rol en esta tienda")

    token = crear_token(
        {"rol": datos.rol.value, "nombre": datos.nombre, "tienda_id": tienda.id, "tienda_slug": tienda.slug}
    )
    return TokenResponse(access_token=token, rol=datos.rol.value, nombre=datos.nombre, tienda_slug=tienda.slug)


@router.post("/alta-persona", response_model=TokenResponse)
@limiter.limit("10/minute")
def alta_persona(request: Request, datos: AltaPersonaRequest, db: Session = Depends(get_db)) -> TokenResponse:
    tienda = db.query(Tienda).filter(Tienda.slug == datos.slug).first()
    if tienda is None or not verificar_pin(datos.pin, tienda.pin_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Tienda o PIN incorrecto")

    persona = Persona(tienda_id=tienda.id, rol=datos.rol, nombre=datos.nombre, activo=True)
    db.add(persona)
    db.commit()

    token = crear_token(
        {"rol": datos.rol.value, "nombre": datos.nombre, "tienda_id": tienda.id, "tienda_slug": tienda.slug}
    )
    return TokenResponse(access_token=token, rol=datos.rol.value, nombre=datos.nombre, tienda_slug=tienda.slug)


@router.post("/login-admin", response_model=TokenResponse)
@limiter.limit("5/minute")
def login_admin(request: Request, datos: LoginAdminRequest, db: Session = Depends(get_db)) -> TokenResponse:
    config = db.query(AdminConfig).filter(AdminConfig.id == 1).first()
    pin_hash = config.admin_pin_hash if config else hash_pin("JAMAR2026")
    if not verificar_pin(datos.pin, pin_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Clave de administrador incorrecta")

    token = crear_token({"rol": Rol.admin.value, "nombre": "Administrador"})
    return TokenResponse(access_token=token, rol=Rol.admin.value, nombre="Administrador")
