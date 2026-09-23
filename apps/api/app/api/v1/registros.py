from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import Claims, obtener_claims, verificar_tienda
from app.db.session import get_db
from app.models.enums import Rol
from app.models.registro import Registro
from app.models.tienda import Tienda
from app.models.traza import Traza
from app.schemas.registro import RegistroIn, RegistroOut
from app.services.actividades import ACTS
from app.services.calendario import semana_vigente

router = APIRouter()


@router.get("", response_model=list[RegistroOut])
def listar_registros(
    actividad: str | None = None,
    tienda_id: int | None = None,
    semana: int | None = None,
    claims: Claims = Depends(obtener_claims),
    db: Session = Depends(get_db),
) -> list[Registro]:
    q = db.query(Registro)
    if actividad:
        q = q.filter(Registro.actividad == actividad)
    if semana:
        q = q.filter(Registro.semana == semana)
    if claims.rol == Rol.admin:
        if tienda_id:
            q = q.filter(Registro.tienda_id == tienda_id)
    else:
        q = q.filter(Registro.tienda_id == claims.tienda_id)
    return q.order_by(Registro.semana.desc()).all()


@router.get("/semanas-abiertas")
def semanas_abiertas(
    actividad: str,
    tienda_id: int | None = None,
    claims: Claims = Depends(obtener_claims),
    db: Session = Depends(get_db),
) -> list[int]:
    """Semana vigente + hasta 3 anteriores que sigan sin registro (equivalente a
    semanasAbiertas() en legacy/index-original.html, líneas ~595-603)."""
    objetivo_tienda = tienda_id if claims.rol == Rol.admin and tienda_id else claims.tienda_id
    if objetivo_tienda is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Falta tienda_id")

    hoy_semana = semana_vigente()
    abiertas = [hoy_semana]
    for sem in range(hoy_semana - 1, max(0, hoy_semana - 4), -1):
        r = (
            db.query(Registro)
            .filter(Registro.actividad == actividad, Registro.tienda_id == objetivo_tienda, Registro.semana == sem)
            .first()
        )
        if r is None or r.estado.value in ("PENDIENTE", "SIN_DATO"):
            abiertas.append(sem)
    return abiertas


@router.post("/{tienda_id}/{actividad}/{semana}", response_model=RegistroOut)
def guardar_registro(
    tienda_id: int,
    actividad: str,
    semana: int,
    datos: RegistroIn,
    claims: Claims = Depends(obtener_claims),
    db: Session = Depends(get_db),
) -> Registro:
    if actividad not in ACTS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Actividad desconocida")
    puede_reportar = claims.rol == Rol.admin or ACTS[actividad].rol == claims.rol
    if not puede_reportar:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu rol no reporta esta actividad")
    verificar_tienda(claims, tienda_id)

    tienda = db.get(Tienda, tienda_id)
    if tienda is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tienda no encontrada")

    registro = (
        db.query(Registro)
        .filter(Registro.actividad == actividad, Registro.tienda_id == tienda_id, Registro.semana == semana)
        .first()
    )
    if registro is None:
        registro = Registro(
            actividad=actividad,
            tienda_id=tienda_id,
            semana=semana,
            reportado_por=claims.nombre,
            reportado_rol=claims.rol.value,
        )
        db.add(registro)

    registro.estado = datos.estado
    registro.datos = datos.datos
    registro.reportado_por = claims.nombre
    registro.reportado_rol = claims.rol.value
    db.flush()

    # La traza la escribe el servidor a partir del actor autenticado, no el cliente
    # (a diferencia del original) — ver CLAUDE.md, sección seguridad.
    db.add(
        Traza(
            actividad=actividad,
            tienda_id=tienda_id,
            tienda_nombre=tienda.nombre,
            semana=semana,
            estado=datos.estado.value,
            por=claims.nombre,
            rol=claims.rol.value,
        )
    )
    db.commit()
    db.refresh(registro)
    return registro
