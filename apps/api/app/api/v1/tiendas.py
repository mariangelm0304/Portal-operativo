from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.persona import Persona
from app.models.tienda import Tienda
from app.schemas.tienda import PersonaOut, TiendaOut

router = APIRouter()


@router.get("", response_model=list[TiendaOut])
def listar_tiendas(db: Session = Depends(get_db)) -> list[Tienda]:
    # Público (sin auth): la pantalla de Ingreso necesita el listado de tiendas/zonas
    # antes de que exista una sesión, igual que el original. No expone pin_hash porque
    # TiendaOut no incluye ese campo.
    return db.query(Tienda).order_by(Tienda.zona, Tienda.nombre).all()


@router.get("/{slug}/personas", response_model=list[PersonaOut])
def listar_personas(slug: str, db: Session = Depends(get_db)) -> list[Persona]:
    # También público: son solo nombres/roles para armar el selector de Ingreso, igual
    # que el maestro (Tienda.coordinador/tecnico) que ya es público en /tiendas.
    tienda = db.query(Tienda).filter(Tienda.slug == slug).first()
    if tienda is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tienda no encontrada")
    return db.query(Persona).filter(Persona.tienda_id == tienda.id, Persona.activo.is_(True)).all()
