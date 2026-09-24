"""Agregaciones y purga del tab Admin → Archivos — puerto de pintarArchivos() y el modal
"Purgar archivos antiguos" del original (legacy/index-original.html, líneas 1696-1726,
1843-1859). Los evidencias en sí se leen/escriben desde app/api/v1/evidencias.py; esto es
la vista administrativa agregada sobre esa misma tabla."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.evidencia import Evidencia
from app.models.registro import Registro
from app.storage.base import Storage


def resumen_evidencias(db: Session) -> dict:
    total, bytes_totales, ultima = (
        db.query(func.count(Evidencia.id), func.coalesce(func.sum(Evidencia.tamano_bytes), 0), func.max(Evidencia.subido_en)).one()
    )
    return {
        "total": total,
        "bytes_totales": int(bytes_totales),
        "ultima_actualizacion": ultima.isoformat() if isinstance(ultima, datetime) else ultima,
    }


def purgar_evidencias_antiguas(db: Session, storage: Storage, semana_limite: int) -> int:
    """Borra del almacenamiento y de Postgres las evidencias de semanas anteriores a
    `semana_limite`. No toca los registros: solo libera espacio de archivos."""
    viejas = db.query(Evidencia).join(Registro).filter(Registro.semana < semana_limite).all()
    borradas = 0
    for evidencia in viejas:
        try:
            storage.eliminar(evidencia.ruta_almacenamiento)
        except OSError:
            pass  # si el archivo ya no está en disco, igual se limpia el registro en DB
        db.delete(evidencia)
        borradas += 1
    db.commit()
    return borradas
