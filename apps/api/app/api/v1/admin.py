from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import Claims, requiere_admin
from app.core.security import hash_pin, verificar_pin
from app.db.session import get_db
from app.models.admin_config import AdminConfig
from app.models.enums import Actividad
from app.models.registro import Registro
from app.models.tienda import Tienda
from app.schemas.admin import (
    AdminConfigIn,
    AdminConfigOut,
    CambiarPinAdminIn,
    CambiarPinTiendaIn,
    ResumenKPI,
)
from app.services.alertas import ALERTAS_MIGRACION
from app.services.archivos import purgar_evidencias_antiguas, resumen_evidencias
from app.services.calendario import semana_vigente
from app.services.cumplimiento import EST
from app.storage import get_storage

router = APIRouter()


@router.get("/alertas")
def alertas(claims: Claims = Depends(requiere_admin)) -> list[str]:
    return ALERTAS_MIGRACION


@router.get("/evidencias/resumen")
def evidencias_resumen(claims: Claims = Depends(requiere_admin), db: Session = Depends(get_db)) -> dict:
    return resumen_evidencias(db)


@router.post("/evidencias/purgar")
def evidencias_purgar(claims: Claims = Depends(requiere_admin), db: Session = Depends(get_db)) -> dict:
    config = _config(db)
    semana_limite = semana_vigente() - config.retencion_semanas
    borradas = purgar_evidencias_antiguas(db, get_storage(), semana_limite)
    return {"borradas": borradas, "semana_limite": semana_limite}


def _config(db: Session) -> AdminConfig:
    config = db.query(AdminConfig).filter(AdminConfig.id == 1).first()
    if config is None:
        config = AdminConfig(id=1, admin_pin_hash=hash_pin("JAMAR2026"), retencion_semanas=3)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.get("/config", response_model=AdminConfigOut)
def obtener_config(claims: Claims = Depends(requiere_admin), db: Session = Depends(get_db)) -> AdminConfig:
    return _config(db)


@router.put("/config", response_model=AdminConfigOut)
def actualizar_config(
    datos: AdminConfigIn, claims: Claims = Depends(requiere_admin), db: Session = Depends(get_db)
) -> AdminConfig:
    config = _config(db)
    config.retencion_semanas = datos.retencion_semanas
    db.commit()
    db.refresh(config)
    return config


@router.post("/pin-admin", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_pin_admin(
    datos: CambiarPinAdminIn, claims: Claims = Depends(requiere_admin), db: Session = Depends(get_db)
) -> None:
    config = _config(db)
    if not verificar_pin(datos.pin_actual, config.admin_pin_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "El PIN actual no coincide")
    config.admin_pin_hash = hash_pin(datos.pin_nuevo)
    db.commit()


@router.post("/pin-tienda", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_pin_tienda(
    datos: CambiarPinTiendaIn, claims: Claims = Depends(requiere_admin), db: Session = Depends(get_db)
) -> None:
    tienda = db.query(Tienda).filter(Tienda.slug == datos.slug).first()
    if tienda is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tienda no encontrada")
    tienda.pin_hash = hash_pin(datos.pin_nuevo)
    db.commit()


@router.get("/resumen", response_model=list[ResumenKPI])
def resumen(
    semana: int | None = None,
    zona: str | None = None,
    claims: Claims = Depends(requiere_admin),
    db: Session = Depends(get_db),
) -> list[ResumenKPI]:
    """KPIs de cumplimiento por actividad para una semana — puerto de la lógica de conteo
    del tab Resumen del original (EST[estado].cuenta en cumplimiento.py)."""
    semana_objetivo = semana or semana_vigente()
    total_tiendas = db.query(Tienda)
    if zona:
        total_tiendas = total_tiendas.filter(Tienda.zona == zona)
    tienda_ids = [t.id for t in total_tiendas.all()]

    salida: list[ResumenKPI] = []
    for actividad in Actividad:
        registros = (
            db.query(Registro)
            .filter(Registro.actividad == actividad, Registro.semana == semana_objetivo, Registro.tienda_id.in_(tienda_ids))
            .all()
        )
        por_slug = {r.tienda_id: r for r in registros}
        cumple = incumple = excluye = 0
        for tienda_id in tienda_ids:
            registro = por_slug.get(tienda_id)
            estado = registro.estado if registro else None
            cuenta = EST[estado].cuenta if estado is not None else "excluye"
            if cuenta == "cumple":
                cumple += 1
            elif cuenta == "incumple":
                incumple += 1
            else:
                excluye += 1
        total = len(tienda_ids)
        base_pct = cumple + incumple
        pct = round((cumple / base_pct) * 1000) / 10 if base_pct else 0.0
        salida.append(
            ResumenKPI(
                actividad=actividad.value,
                cumplen=cumple,
                incumplen=incumple,
                excluyen=excluye,
                total=total,
                porcentaje_cumplimiento=pct,
            )
        )
    return salida
