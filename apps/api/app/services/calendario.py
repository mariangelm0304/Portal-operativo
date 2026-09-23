"""Puerto directo del calendario del portal original (CAL/semanaInfo/semanaDeFecha en
legacy/index-original.html, líneas ~523-568). La semana del programa es la semana
calendario de Colombia (lunes a domingo); S1 arranca el lunes 4 de mayo de 2026 y la
semana del 20 de julio de 2026 no se trabajó y quedó fuera de la numeración."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path

ANCLA = date(2026, 5, 4)
SALTOS = {date(2026, 7, 20)}

_FESTIVOS_PATH = Path(__file__).resolve().parent.parent.parent / "scripts" / "data" / "festivos.json"

MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]


@lru_cache
def _festivos() -> dict[str, str]:
    with open(_FESTIVOS_PATH, encoding="utf-8") as f:
        return json.load(f)


@dataclass
class Festivo:
    fecha: str
    nombre: str


@dataclass
class SemanaInfo:
    n: int
    lunes: date
    domingo: date
    mes: str
    festivos: list[Festivo] = field(default_factory=list)


@lru_cache
def semana_info(n: int) -> SemanaInfo:
    d = ANCLA
    i = 1
    while True:
        if d not in SALTOS:
            if i == n:
                break
            i += 1
        d = d + timedelta(days=7)
    domingo = d + timedelta(days=6)
    jueves = d + timedelta(days=3)
    festivos_mapa = _festivos()
    festivos = []
    for k in range(7):
        fecha = d + timedelta(days=k)
        iso = fecha.isoformat()
        if iso in festivos_mapa:
            festivos.append(Festivo(fecha=iso, nombre=festivos_mapa[iso]))
    return SemanaInfo(
        n=n,
        lunes=d,
        domingo=domingo,
        mes=f"{MESES[jueves.month - 1]} {jueves.year}",
        festivos=festivos,
    )


def semana_de_fecha(iso: str) -> int | None:
    objetivo = date.fromisoformat(iso)
    d = ANCLA
    i = 1
    for _ in range(520):
        if d not in SALTOS:
            if d <= objetivo <= d + timedelta(days=6):
                return i
            i += 1
        d = d + timedelta(days=7)
    return None


def semana_vigente(hoy: date | None = None) -> int:
    hoy = hoy or date.today()
    return semana_de_fecha(hoy.isoformat()) or 1
