import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import Claims, obtener_claims, verificar_tienda
from app.core.config import get_settings
from app.db.session import get_db
from app.models.enums import Rol
from app.models.evidencia import Evidencia
from app.models.registro import Registro
from app.schemas.evidencia import EvidenciaOut
from app.services.actividades import NOMBRE_RANURA, ranura_valida
from app.services.sync_google import sincronizar_evidencia
from app.storage import get_storage

router = APIRouter()


@router.post("/{registro_id}/{ranura}", response_model=EvidenciaOut)
def subir_evidencia(
    registro_id: int,
    ranura: str,
    archivo: UploadFile,
    tareas: BackgroundTasks,
    claims: Claims = Depends(obtener_claims),
    db: Session = Depends(get_db),
) -> Evidencia:
    registro = db.get(Registro, registro_id)
    if registro is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registro no encontrado")
    verificar_tienda(claims, registro.tienda_id)
    if not ranura_valida(registro.actividad, ranura):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ranura inválida para esta actividad")

    settings = get_settings()
    contenido = archivo.file.read()
    if len(contenido) > settings.max_archivo_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "El archivo supera los 15 MB")

    extension = Path(archivo.filename or "").suffix
    ruta = f"{registro.tienda_id}/{registro.actividad}/{registro.semana}/{ranura}-{uuid.uuid4().hex}{extension}"
    storage = get_storage()
    storage.guardar(ruta, contenido)

    evidencia = Evidencia(
        registro_id=registro.id,
        ranura=ranura,
        etiqueta=NOMBRE_RANURA.get(f"{registro.actividad}.{ranura}", ranura),
        nombre_original=archivo.filename or ranura,
        ruta_almacenamiento=ruta,
        tipo_mime=archivo.content_type or "application/octet-stream",
        tamano_bytes=len(contenido),
        subido_por=claims.nombre,
    )
    db.add(evidencia)
    db.commit()
    db.refresh(evidencia)

    # Nunca bloquea la respuesta al operario: el registro ya quedó guardado en Postgres.
    tareas.add_task(sincronizar_evidencia, evidencia.id)
    return evidencia


@router.get("", response_model=list[EvidenciaOut])
def listar_evidencias(
    tienda_id: int | None = None,
    actividad: str | None = None,
    semana: int | None = None,
    claims: Claims = Depends(obtener_claims),
    db: Session = Depends(get_db),
) -> list[Evidencia]:
    q = db.query(Evidencia).join(Registro)
    if claims.rol == Rol.admin:
        if tienda_id:
            q = q.filter(Registro.tienda_id == tienda_id)
    else:
        q = q.filter(Registro.tienda_id == claims.tienda_id)
    if actividad:
        q = q.filter(Registro.actividad == actividad)
    if semana:
        q = q.filter(Registro.semana == semana)
    return q.order_by(Evidencia.subido_en.desc()).all()


@router.get("/{evidencia_id}/archivo")
def descargar_evidencia(
    evidencia_id: int, claims: Claims = Depends(obtener_claims), db: Session = Depends(get_db)
) -> Response:
    evidencia = db.get(Evidencia, evidencia_id)
    if evidencia is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidencia no encontrada")
    verificar_tienda(claims, evidencia.registro.tienda_id)
    contenido = get_storage().leer(evidencia.ruta_almacenamiento)
    return Response(content=contenido, media_type=evidencia.tipo_mime)


@router.delete("/{evidencia_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_evidencia(evidencia_id: int, claims: Claims = Depends(obtener_claims), db: Session = Depends(get_db)) -> None:
    evidencia = db.get(Evidencia, evidencia_id)
    if evidencia is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidencia no encontrada")
    verificar_tienda(claims, evidencia.registro.tienda_id)
    get_storage().eliminar(evidencia.ruta_almacenamiento)
    db.delete(evidencia)
    db.commit()
