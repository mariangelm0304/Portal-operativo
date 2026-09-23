from fastapi import APIRouter

from app.services.actividades import ACTS

router = APIRouter()


@router.get("")
def listar_actividades() -> dict:
    return {
        act.value: {
            "nombre": definicion.nombre,
            "rol": definicion.rol.value,
            "adjuntos": [
                {
                    "clave": a.clave,
                    "nombre": a.nombre,
                    "acepta": a.acepta,
                    "pista": a.pista,
                    "multi": a.multi,
                    "maximo": a.maximo,
                }
                for a in definicion.adjuntos
            ],
        }
        for act, definicion in ACTS.items()
    }
