from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import Claims, requiere_admin
from app.db.session import get_db
from app.models.traza import Traza
from app.schemas.traza import TrazaOut
from app.services.trazabilidad import enriquecer_trazas, resumen_trazas, top_personas

router = APIRouter()


@router.get("", response_model=list[TrazaOut])
def listar_trazas(
    limite: int = 200, claims: Claims = Depends(requiere_admin), db: Session = Depends(get_db)
) -> list[dict]:
    trazas = db.query(Traza).order_by(Traza.en.desc()).limit(min(limite, 1000)).all()
    return enriquecer_trazas(db, trazas)


@router.get("/resumen")
def trazas_resumen(claims: Claims = Depends(requiere_admin), db: Session = Depends(get_db)) -> dict:
    return resumen_trazas(db)


@router.get("/top-personas")
def trazas_top_personas(claims: Claims = Depends(requiere_admin), db: Session = Depends(get_db)) -> list[dict]:
    return top_personas(db)
