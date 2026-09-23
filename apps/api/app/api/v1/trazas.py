from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import Claims, requiere_admin
from app.db.session import get_db
from app.models.traza import Traza
from app.schemas.traza import TrazaOut

router = APIRouter()


@router.get("", response_model=list[TrazaOut])
def listar_trazas(
    limite: int = 200, claims: Claims = Depends(requiere_admin), db: Session = Depends(get_db)
) -> list[Traza]:
    return db.query(Traza).order_by(Traza.en.desc()).limit(min(limite, 1000)).all()
