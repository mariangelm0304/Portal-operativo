"""Validación de la forma de `datos` según actividad/estado — puerto de las reglas que el
original validaba en enviarRegistro() (legacy/index-original.html, líneas 1165-1219) antes de
guardar. El schema Pydantic (RegistroIn) solo valida que `datos` sea un dict; estas reglas de
negocio dependen de la actividad y el estado, así que viven acá, no en el schema."""

from __future__ import annotations

from typing import Any

from app.models.enums import Actividad, EstadoRegistro
from app.services.actividades import AUSENCIAS


class DatosInvalidos(ValueError):
    pass


def validar_datos(actividad: Actividad, estado: EstadoRegistro, datos: dict[str, Any]) -> dict[str, Any]:
    limpio: dict[str, Any] = {}

    if estado == EstadoRegistro.AUSENCIA:
        motivo = datos.get("motivo")
        if not motivo:
            raise DatosInvalidos("Indica el motivo de la ausencia.")
        if motivo not in AUSENCIAS:
            raise DatosInvalidos(f"Motivo de ausencia inválido: {motivo!r}")
        limpio["motivo"] = motivo
        nov = str(datos.get("nov") or "").strip()
        limpio["nov"] = f"{motivo} · {nov}" if nov else motivo
    else:
        nov = str(datos.get("nov") or "").strip()
        if nov:
            limpio["nov"] = nov

    if actividad == Actividad.inventario and estado == EstadoRegistro.REPORTADO:
        cierre = datos.get("cierre")
        try:
            cierre = float(cierre)
        except (TypeError, ValueError):
            raise DatosInvalidos("El cierre del conteo es obligatorio.") from None
        if not (0 <= cierre <= 100):
            raise DatosInvalidos("El cierre debe ir entre 0 y 100.")
        limpio["cierre"] = cierre

        bodega = datos.get("bodega")
        if bodega:
            limpio["bodega"] = bodega
            if bodega == "DISPONIBLE" and datos.get("bodegaPct") not in (None, ""):
                try:
                    bodega_pct = float(datos["bodegaPct"])
                except (TypeError, ValueError):
                    raise DatosInvalidos("El espacio disponible debe ser un número.") from None
                if not (0 <= bodega_pct <= 100):
                    raise DatosInvalidos("El espacio disponible debe ir entre 0 y 100.")
                limpio["bodegaPct"] = bodega_pct

    if actividad == Actividad.pistoleo and estado == EstadoRegistro.REGISTRADO:
        conteo = datos.get("conteo")
        try:
            conteo = float(conteo)
        except (TypeError, ValueError):
            raise DatosInvalidos("Escribe cuántas unidades pistoleaste.") from None
        if conteo < 0:
            raise DatosInvalidos("Escribe cuántas unidades pistoleaste.")
        limpio["conteo"] = conteo

    link = str(datos.get("link") or "").strip()
    if link:
        limpio["link"] = link

    return limpio
