"""Puerto de EST y tono() del portal original (líneas ~491-502 y ~653-657): qué significa
cada estado, si cuenta como cumplimiento, y qué color de semáforo le corresponde."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from app.models.enums import Actividad, EstadoRegistro

Cuenta = Literal["cumple", "incumple", "excluye"]
Tono = Literal["ok", "medio", "falla", "ausen", "pend"]


@dataclass(frozen=True)
class InfoEstado:
    tono: Tono
    etiqueta: str
    cuenta: Cuenta


EST: dict[EstadoRegistro, InfoEstado] = {
    EstadoRegistro.REPORTADO: InfoEstado("ok", "Reportado", "cumple"),
    EstadoRegistro.SIN_REPORTE: InfoEstado("falla", "Sin reporte", "incumple"),
    EstadoRegistro.ENVIADA: InfoEstado("ok", "Enviada", "cumple"),
    EstadoRegistro.NO_ENVIADA: InfoEstado("falla", "No enviada", "incumple"),
    EstadoRegistro.SIN_TECNICO: InfoEstado("falla", "Sin técnico asignado", "excluye"),
    EstadoRegistro.REGISTRADO: InfoEstado("ok", "Registrado", "cumple"),
    EstadoRegistro.NO_REALIZADO: InfoEstado("falla", "No realizado", "incumple"),
    EstadoRegistro.AUSENCIA: InfoEstado("ausen", "Ausencia justificada", "excluye"),
    EstadoRegistro.PENDIENTE: InfoEstado("pend", "Pendiente", "excluye"),
    EstadoRegistro.SIN_DATO: InfoEstado("pend", "Sin dato", "excluye"),
}


def tono(actividad: Actividad, estado: EstadoRegistro | None, datos: dict[str, Any] | None = None) -> Tono:
    if estado is None:
        return "pend"
    if actividad == Actividad.inventario and estado == EstadoRegistro.REPORTADO:
        cierre = (datos or {}).get("cierre")
        if cierre is not None and cierre < 100:
            return "medio"
    return EST[estado].tono
