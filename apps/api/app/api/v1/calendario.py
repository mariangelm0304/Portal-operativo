from fastapi import APIRouter

from app.services.calendario import semana_info, semana_vigente

router = APIRouter()


@router.get("/vigente")
def vigente() -> dict:
    return {"semana": semana_vigente()}


@router.get("/{semana}")
def info(semana: int) -> dict:
    # Público: son solo fechas/festivos derivados de una regla fija, no datos de negocio.
    info = semana_info(semana)
    return {
        "n": info.n,
        "lunes": info.lunes.isoformat(),
        "domingo": info.domingo.isoformat(),
        "mes": info.mes,
        "festivos": [{"fecha": f.fecha, "nombre": f.nombre} for f in info.festivos],
    }
