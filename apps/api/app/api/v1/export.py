import csv
import io
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import Claims, requiere_admin
from app.db.session import get_db
from app.models.registro import Registro
from app.models.tienda import Tienda

router = APIRouter()


@router.get("/csv")
def exportar_csv(claims: Claims = Depends(requiere_admin), db: Session = Depends(get_db)) -> StreamingResponse:
    """Una fila por tienda/actividad/semana, igual que exportar('csv') en el original
    (legacy/index-original.html, línea ~1754) — reemplaza la descarga manual."""
    tiendas_por_id = {t.id: t for t in db.query(Tienda).all()}
    registros = db.query(Registro).order_by(Registro.tienda_id, Registro.actividad, Registro.semana).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["tienda", "zona", "actividad", "semana", "estado", "reportado_por", "reportado_rol", "actualizado_en"])
    for r in registros:
        tienda = tiendas_por_id.get(r.tienda_id)
        writer.writerow(
            [
                tienda.nombre if tienda else r.tienda_id,
                tienda.zona if tienda else "",
                r.actividad.value,
                r.semana,
                r.estado.value,
                r.reportado_por,
                r.reportado_rol,
                r.actualizado_en.isoformat(),
            ]
        )
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=portal-operativo.csv"},
    )


@router.get("/json")
def exportar_json(claims: Claims = Depends(requiere_admin), db: Session = Depends(get_db)) -> StreamingResponse:
    tiendas = db.query(Tienda).all()
    registros = db.query(Registro).all()
    payload = {
        "tiendas": [
            {"ag": t.ag, "nombre": t.nombre, "slug": t.slug, "zona": t.zona} for t in tiendas
        ],
        "registros": [
            {
                "tienda_id": r.tienda_id,
                "actividad": r.actividad.value,
                "semana": r.semana,
                "estado": r.estado.value,
                "datos": r.datos,
                "reportado_por": r.reportado_por,
                "reportado_rol": r.reportado_rol,
                "actualizado_en": r.actualizado_en.isoformat(),
            }
            for r in registros
        ],
    }
    contenido = json.dumps(payload, ensure_ascii=False, indent=2)
    return StreamingResponse(
        iter([contenido]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=portal-operativo.json"},
    )
