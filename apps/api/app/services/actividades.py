"""Puerto de ACTS/RANURAS del portal original (líneas ~453-486): qué rol reporta cada
actividad y qué adjuntos espera cada una. GET /api/v1/actividades expone esto tal cual
para que el frontend construya el formulario, igual que hacía el JS original."""

from __future__ import annotations

from dataclasses import dataclass

from app.models.enums import Actividad, Rol


@dataclass(frozen=True)
class Adjunto:
    clave: str
    nombre: str
    acepta: str
    pista: str
    multi: bool = False
    maximo: int = 1


@dataclass(frozen=True)
class DefinicionActividad:
    nombre: str
    rol: Rol
    adjuntos: tuple[Adjunto, ...]


AUSENCIAS = ["Vacaciones", "Incapacidad", "Licencia", "Cambio de contrato", "Cargo vacante", "Otro"]

ACTS: dict[Actividad, DefinicionActividad] = {
    Actividad.inventario: DefinicionActividad(
        nombre="Inventario cíclico",
        rol=Rol.coordinador,
        adjuntos=(
            Adjunto("conteo", "Excel del conteo", ".xlsx,.xls,.xlsm,.csv,image/*", "El archivo del conteo cíclico"),
            Adjunto("acta", "Acta del conteo en PDF", ".pdf,.docx,.doc,image/*", "El acta firmada"),
            Adjunto("bodega", "Fotos de la bodega", "image/*", "Fotos de la bodega, hasta 12", multi=True, maximo=12),
        ),
    ),
    Actividad.calidad: DefinicionActividad(
        nombre="Bitácora de calidad",
        rol=Rol.tecnico,
        adjuntos=(
            Adjunto("bitacora", "Presentación o PDF de la bitácora", ".pptx,.ppt,.pdf,.docx,image/*", "La bitácora completa"),
            Adjunto("paginas", "Fotos de la bitácora, página por página", "image/*", "Una foto por página, hasta 20", multi=True, maximo=20),
        ),
    ),
    Actividad.pistoleo: DefinicionActividad(
        nombre="Pistoleo",
        rol=Rol.auxiliar,
        adjuntos=(
            Adjunto("foto", "Foto del pistoleo", "image/*,.pdf", "La foto del pistoleo"),
        ),
    ),
}


def ranuras_de(actividad: Actividad) -> list[str]:
    out: list[str] = []
    for adjunto in ACTS[actividad].adjuntos:
        if adjunto.multi:
            out.extend(f"{adjunto.clave}-{i}" for i in range(1, adjunto.maximo + 1))
        else:
            out.append(adjunto.clave)
    return out


def ranura_valida(actividad: Actividad, ranura: str) -> bool:
    return ranura in ranuras_de(actividad)


def _construir_nombre_ranura() -> dict[str, str]:
    mapa: dict[str, str] = {}
    for actividad, definicion in ACTS.items():
        for adjunto in definicion.adjuntos:
            if adjunto.multi:
                for i in range(1, adjunto.maximo + 1):
                    mapa[f"{actividad.value}.{adjunto.clave}-{i}"] = f"{adjunto.nombre} ({i})"
            else:
                mapa[f"{actividad.value}.{adjunto.clave}"] = adjunto.nombre
    return mapa


NOMBRE_RANURA: dict[str, str] = _construir_nombre_ranura()
