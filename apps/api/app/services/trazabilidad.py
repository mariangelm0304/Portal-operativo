"""Agregaciones del tab Admin → Trazabilidad — puerto de tabTrazas() en
legacy/index-original.html (líneas 1505-1564). A diferencia del original (donde `overlay`
solo guardaba el último estado de cada celda), aquí `Traza` es insert-only: cada guardado deja
una fila nueva, así que "registros hechos desde el portal" se cuenta por celda única
(actividad, tienda, semana), no por fila de traza."""

from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.evidencia import Evidencia
from app.models.registro import Registro
from app.models.traza import Traza


def resumen_trazas(db: Session) -> dict:
    celdas_portal = {(t.actividad, t.tienda_id, t.semana) for t in db.query(Traza.actividad, Traza.tienda_id, Traza.semana).distinct()}
    total_registros = db.query(func.count(Registro.id)).scalar() or 0
    personas = db.query(func.count(func.distinct(Traza.por))).scalar() or 0

    con_evidencia = 0
    for actividad, tienda_id, semana in celdas_portal:
        registro = (
            db.query(Registro)
            .filter(Registro.actividad == actividad, Registro.tienda_id == tienda_id, Registro.semana == semana)
            .first()
        )
        if registro is None:
            continue
        tiene_evidencia = db.query(Evidencia.id).filter(Evidencia.registro_id == registro.id).first() is not None
        if tiene_evidencia or registro.datos.get("link"):
            con_evidencia += 1

    return {
        "registros_portal": len(celdas_portal),
        "con_evidencia": con_evidencia,
        "personas": personas,
        "historicos_migrados": max(0, total_registros - len(celdas_portal)),
    }


def top_personas(db: Session, limite: int = 10) -> list[dict]:
    filas = (
        db.query(Traza.por, func.count(Traza.id))
        .group_by(Traza.por)
        .order_by(func.count(Traza.id).desc())
        .limit(limite)
        .all()
    )
    return [{"nombre": nombre, "cantidad": cantidad} for nombre, cantidad in filas]


def enriquecer_trazas(db: Session, trazas: list[Traza]) -> list[dict]:
    """Suma a cada fila de traza la evidencia (o el enlace externo) de la celda que
    describe, tal como está *hoy* esa celda — no una foto histórica de ese guardado
    puntual, porque los archivos no quedan versionados por guardado."""
    salida = []
    for t in trazas:
        registro = (
            db.query(Registro)
            .filter(Registro.actividad == t.actividad, Registro.tienda_id == t.tienda_id, Registro.semana == t.semana)
            .first()
        )
        evidencias = []
        link = None
        if registro is not None:
            evidencias = [
                {"id": e.id, "nombre_original": e.nombre_original}
                for e in db.query(Evidencia).filter(Evidencia.registro_id == registro.id).all()
            ]
            link = registro.datos.get("link")
        salida.append(
            {
                "id": t.id,
                "actividad": t.actividad,
                "tienda_id": t.tienda_id,
                "tienda_nombre": t.tienda_nombre,
                "semana": t.semana,
                "estado": t.estado,
                "por": t.por,
                "rol": t.rol,
                "en": t.en.isoformat(),
                "evidencias": evidencias,
                "link": link,
            }
        )
    return salida
