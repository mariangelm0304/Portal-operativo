"""Importa a Postgres, una sola vez, el histórico que traía embebido el portal original
(window.__BASE__ en legacy/index-original.html). Uso:

    python scripts/seed_from_base.py

Es idempotente: si una tienda o un registro ya existe (por slug, o por
actividad+tienda+semana), lo actualiza en vez de duplicarlo.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.security import hash_pin
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.admin_config import AdminConfig
from app.models.registro import Registro
from app.models.tienda import Tienda

DATA_DIR = Path(__file__).resolve().parent / "data"
PIN_TIENDA_DEFECTO = "1234"
PIN_ADMIN_DEFECTO = "JAMAR2026"

# Campos que ya tienen su propia columna en Registro; el resto de cada entrada semanal
# queda en `datos` (cierre, bodega, conteo, novedad, fecha...) igual que en el original.
CAMPOS_PROPIOS = {"estado", "por", "rol", "origen"}


def cargar_json(nombre: str) -> dict:
    with open(DATA_DIR / nombre, encoding="utf-8") as f:
        return json.load(f)


def sembrar_tiendas(db, base: dict) -> dict[str, Tienda]:
    por_slug: dict[str, Tienda] = {}
    for t in base["tiendas"]:
        tienda = db.query(Tienda).filter(Tienda.slug == t["slug"]).first()
        if tienda is None:
            tienda = Tienda(slug=t["slug"], pin_hash=hash_pin(PIN_TIENDA_DEFECTO))
            db.add(tienda)
        tienda.ag = t["ag"]
        tienda.nombre = t["nombre"]
        tienda.zona = t["zona"]
        tienda.nombre_pistoleo = t["nombrePistoleo"]
        tienda.verificar = t["verificar"]
        tienda.coordinador = t["coordinador"]
        tienda.estado_coordinador = t["estadoCoord"]
        tienda.tecnico = t["tecnico"]
        tienda.estado_tecnico = t["estadoTec"]
        tienda.auxiliar = t["auxiliar"]
        tienda.estado_auxiliar = t["estadoAux"]
        por_slug[t["slug"]] = tienda
    db.flush()
    print(f"tiendas: {len(por_slug)}")
    return por_slug


def sembrar_registros(db, base: dict, tiendas_por_slug: dict[str, Tienda]) -> None:
    total = 0
    for actividad in ("inventario", "calidad", "pistoleo"):
        bloque = base.get(actividad, {})
        for slug, datos_tienda in bloque.items():
            tienda = tiendas_por_slug.get(slug)
            if tienda is None:
                print(f"  ! {actividad}/{slug}: tienda no está en el maestro, se omite")
                continue
            responsable_defecto = datos_tienda.get("responsable") or "Auxiliar de piso"
            rol_defecto = datos_tienda.get("rol") or "auxiliar"
            for sem_str, r in datos_tienda.get("semanas", {}).items():
                semana = int(sem_str)
                registro = (
                    db.query(Registro)
                    .filter(Registro.actividad == actividad, Registro.tienda_id == tienda.id, Registro.semana == semana)
                    .first()
                )
                if registro is None:
                    registro = Registro(actividad=actividad, tienda_id=tienda.id, semana=semana)
                    db.add(registro)
                registro.estado = r["estado"]
                registro.datos = {k: v for k, v in r.items() if k not in CAMPOS_PROPIOS}
                registro.reportado_por = r.get("por") or responsable_defecto
                registro.reportado_rol = r.get("rol") or rol_defecto
                total += 1
    db.flush()
    print(f"registros: {total}")


def sembrar_admin_config(db) -> None:
    config = db.query(AdminConfig).filter(AdminConfig.id == 1).first()
    if config is None:
        config = AdminConfig(id=1, admin_pin_hash=hash_pin(PIN_ADMIN_DEFECTO), retencion_semanas=3)
        db.add(config)
        print("admin_config: creado (PIN por defecto, cambialo en Admin > Maestro)")


def main() -> None:
    Base.metadata.create_all(bind=engine)  # red de seguridad si alguien corre esto antes de `alembic upgrade head`

    base = cargar_json("base.json")
    db = SessionLocal()
    try:
        tiendas_por_slug = sembrar_tiendas(db, base)
        sembrar_registros(db, base, tiendas_por_slug)
        sembrar_admin_config(db)
        db.commit()
        print("Listo.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
