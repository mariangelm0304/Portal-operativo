"""Agregaciones del tab Admin → Resumen y de las matrices por actividad — puerto de
metricas()/tabResumen()/matrizHTML()/tabActividad() en legacy/index-original.html
(líneas 1244-1500). Los registros se traen de Postgres ya filtrados por tienda/semana y se
agregan en Python: para 21 tiendas × unas pocas semanas el volumen es trivial, no hace falta
resolverlo con SQL de agregación."""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.models.enums import Actividad
from app.models.registro import Registro
from app.models.tienda import Tienda
from app.services.calendario import periodos_hasta, semana_info
from app.services.cumplimiento import EST
from app.services.cumplimiento import tono as calcular_tono


@dataclass
class Metricas:
    cumple: int = 0
    incumple: int = 0
    ausencia: int = 0
    pendiente: int = 0
    sin_resp: int = 0
    total: int = 0
    conteo: int = 0
    parcial: int = 0

    @property
    def elegibles(self) -> int:
        return self.cumple + self.incumple

    @property
    def pct(self) -> float | None:
        return round(self.cumple / self.elegibles * 1000) / 10 if self.elegibles else None


def _mapa_registros(db: Session, actividad: Actividad, semanas: list[int], tienda_ids: list[int]) -> dict[tuple[int, int], Registro]:
    filas = (
        db.query(Registro)
        .filter(Registro.actividad == actividad, Registro.semana.in_(semanas), Registro.tienda_id.in_(tienda_ids))
        .all()
    )
    return {(r.tienda_id, r.semana): r for r in filas}


def metricas(db: Session, actividad: Actividad, semanas: list[int], tiendas: list[Tienda]) -> Metricas:
    mapa = _mapa_registros(db, actividad, semanas, [t.id for t in tiendas])
    m = Metricas()
    for t in tiendas:
        for s in semanas:
            m.total += 1
            r = mapa.get((t.id, s))
            if r is None:
                m.pendiente += 1
                continue
            if r.estado == "SIN_TECNICO":
                m.sin_resp += 1
                continue
            cuenta = EST[r.estado].cuenta
            if cuenta == "cumple":
                m.cumple += 1
                cierre = r.datos.get("cierre")
                if actividad == Actividad.inventario and cierre is not None and cierre < 100:
                    m.parcial += 1
            elif cuenta == "incumple":
                m.incumple += 1
            elif r.estado == "AUSENCIA":
                m.ausencia += 1
            else:
                m.pendiente += 1
            if r.datos.get("conteo"):
                m.conteo += r.datos["conteo"]
    return m


def tiendas_filtradas(db: Session, zona: str | None) -> list[Tienda]:
    q = db.query(Tienda).order_by(Tienda.zona, Tienda.nombre)
    if zona and zona != "todas":
        q = q.filter(Tienda.zona == zona)
    return q.all()


def resumen_global(db: Session, semanas: list[int], todas_semanas_periodo: list[int], tiendas: list[Tienda]) -> dict:
    m_inv = metricas(db, Actividad.inventario, semanas, tiendas)
    m_cal = metricas(db, Actividad.calidad, semanas, tiendas)
    m_pis = metricas(db, Actividad.pistoleo, semanas, tiendas)

    cumple_g = m_inv.cumple + m_cal.cumple
    elegibles_g = m_inv.elegibles + m_cal.elegibles
    pct_g = round(cumple_g / elegibles_g * 1000) / 10 if elegibles_g else None

    evolucion = []
    for s in todas_semanas_periodo:
        mi = metricas(db, Actividad.inventario, [s], tiendas)
        mc = metricas(db, Actividad.calidad, [s], tiendas)
        el = mi.elegibles + mc.elegibles
        evolucion.append({"semana": s, "pct": round((mi.cumple + mc.cumple) / el * 1000) / 10 if el else None})

    zonas = []
    for zona in sorted({t.zona for t in tiendas}):
        tz = [t for t in tiendas if t.zona == zona]
        mi = metricas(db, Actividad.inventario, semanas, tz)
        mc = metricas(db, Actividad.calidad, semanas, tz)
        el = mi.elegibles + mc.elegibles
        zonas.append(
            {
                "zona": zona,
                "pct": round((mi.cumple + mc.cumple) / el * 1000) / 10 if el else None,
                "cumple": mi.cumple + mc.cumple,
                "elegibles": el,
            }
        )
    zonas.sort(key=lambda z: (z["pct"] is None, -(z["pct"] or 0)))

    rezago = []
    for t in tiendas:
        mi = metricas(db, Actividad.inventario, semanas, [t])
        mc = metricas(db, Actividad.calidad, semanas, [t])
        el = mi.elegibles + mc.elegibles
        pct = round((mi.cumple + mc.cumple) / el * 1000) / 10 if el else None
        fallas = mi.incumple + mc.incumple
        if (pct is not None and pct < 100) or mc.sin_resp > 0:
            rezago.append(
                {
                    "tienda": t.nombre,
                    "ag": t.ag,
                    "zona": t.zona,
                    "pct": pct,
                    "fallas": fallas,
                    "sin_tecnico": mc.sin_resp,
                }
            )
    rezago.sort(key=lambda r: (-(r["fallas"] + r["sin_tecnico"]), r["pct"] if r["pct"] is not None else 101))

    return {
        "cumplimiento_global": {"pct": pct_g, "cumple": cumple_g, "elegibles": elegibles_g},
        "inventario": {"pct": m_inv.pct, "cumple": m_inv.cumple, "elegibles": m_inv.elegibles, "parcial": m_inv.parcial},
        "calidad": {"pct": m_cal.pct, "cumple": m_cal.cumple, "elegibles": m_cal.elegibles, "sin_tecnico": m_cal.sin_resp},
        "pistoleo": {"conteo": m_pis.conteo, "cumple": m_pis.cumple},
        "semanas_por_cerrar": m_inv.pendiente + m_cal.pendiente,
        "tiendas_sin_tecnico": len([t for t in tiendas if not (t.tecnico)]),
        "evolucion": evolucion,
        "zonas": zonas,
        "rezago": rezago[:8],
    }


def matriz_actividad(db: Session, actividad: Actividad, semanas: list[int], todas_semanas_periodo: list[int], tiendas: list[Tienda]) -> dict:
    mapa = _mapa_registros(db, actividad, semanas, [t.id for t in tiendas])

    filas = []
    for t in tiendas:
        celdas = []
        for s in semanas:
            r = mapa.get((t.id, s))
            celdas.append(
                {
                    "semana": s,
                    "estado": r.estado if r else None,
                    "tono": calcular_tono(actividad, r.estado if r else None, r.datos if r else None),
                    "datos": r.datos if r else {},
                    "por": r.reportado_por if r else None,
                    "actualizado_en": r.actualizado_en.isoformat() if r else None,
                }
            )
        m_fila = metricas(db, actividad, semanas, [t])
        filas.append(
            {
                "id": t.id,
                "ag": t.ag,
                "nombre": t.nombre,
                "zona": t.zona,
                "celdas": celdas,
                "conteo": m_fila.conteo,
                "pct": m_fila.pct,
            }
        )

    cumplimiento_semanal = None
    if actividad != Actividad.pistoleo:
        cumplimiento_semanal = []
        for s in semanas:
            m = metricas(db, actividad, [s], tiendas)
            cumplimiento_semanal.append({"semana": s, "pct": m.pct})

    ranking = None
    if actividad == Actividad.pistoleo:
        ranking = sorted(
            [{"tienda": f["nombre"], "ag": f["ag"], "valor": f["conteo"]} for f in filas],
            key=lambda x: -x["valor"],
        )

    evolucion = None
    if actividad != Actividad.pistoleo:
        evolucion = []
        for s in todas_semanas_periodo:
            m = metricas(db, actividad, [s], tiendas)
            evolucion.append({"semana": s, "pct": m.pct})

    return {
        "semanas": [{"n": s, "info": _resumen_semana(s)} for s in semanas],
        "tiendas": filas,
        "cumplimiento_semanal": cumplimiento_semanal,
        "ranking": ranking,
        "evolucion": evolucion,
    }


def _resumen_semana(s: int) -> dict:
    info = semana_info(s)
    return {"lunes": info.lunes.isoformat(), "domingo": info.domingo.isoformat(), "festivos": len(info.festivos) > 0}


def novedades(db: Session, actividad: Actividad | None, semanas: list[int], tiendas: list[Tienda]) -> list[dict]:
    q = db.query(Registro).filter(Registro.semana.in_(semanas), Registro.tienda_id.in_([t.id for t in tiendas]))
    if actividad:
        q = q.filter(Registro.actividad == actividad)
    por_tienda = {t.id: t for t in tiendas}
    salida = []
    for r in q.all():
        nov = r.datos.get("nov")
        if not nov:
            continue
        t = por_tienda[r.tienda_id]
        salida.append(
            {
                "tienda": t.nombre,
                "actividad": r.actividad,
                "semana": r.semana,
                "nov": nov,
                "tono": calcular_tono(r.actividad, r.estado, r.datos),
                "por": r.reportado_por,
            }
        )
    salida.sort(key=lambda x: -x["semana"])
    return salida[:60]


def listar_periodos(sem_max: int) -> list[dict]:
    return [{"nombre": p.nombre, "semanas": p.semanas} for p in periodos_hasta(sem_max)]
