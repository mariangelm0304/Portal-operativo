import pytest

from app.models.enums import Actividad, EstadoRegistro
from app.services.registros import DatosInvalidos, validar_datos


def test_cierre_obligatorio_y_en_rango():
    limpio = validar_datos(Actividad.inventario, EstadoRegistro.REPORTADO, {"cierre": 80, "bodega": "LLENA"})
    assert limpio == {"cierre": 80.0, "bodega": "LLENA"}

    with pytest.raises(DatosInvalidos):
        validar_datos(Actividad.inventario, EstadoRegistro.REPORTADO, {"cierre": 150})

    with pytest.raises(DatosInvalidos):
        validar_datos(Actividad.inventario, EstadoRegistro.REPORTADO, {})


def test_bodega_pct_solo_si_bodega_disponible():
    limpio = validar_datos(
        Actividad.inventario, EstadoRegistro.REPORTADO, {"cierre": 100, "bodega": "DISPONIBLE", "bodegaPct": 40}
    )
    assert limpio["bodegaPct"] == 40.0

    # Si la bodega no está "DISPONIBLE", bodegaPct se ignora aunque venga en el payload.
    limpio2 = validar_datos(
        Actividad.inventario, EstadoRegistro.REPORTADO, {"cierre": 100, "bodega": "LLENA", "bodegaPct": 40}
    )
    assert "bodegaPct" not in limpio2


def test_conteo_obligatorio_en_pistoleo_registrado():
    limpio = validar_datos(Actividad.pistoleo, EstadoRegistro.REGISTRADO, {"conteo": 191})
    assert limpio == {"conteo": 191.0}

    with pytest.raises(DatosInvalidos):
        validar_datos(Actividad.pistoleo, EstadoRegistro.REGISTRADO, {})

    with pytest.raises(DatosInvalidos):
        validar_datos(Actividad.pistoleo, EstadoRegistro.REGISTRADO, {"conteo": -1})


def test_motivo_obligatorio_en_ausencia_y_valido():
    limpio = validar_datos(Actividad.calidad, EstadoRegistro.AUSENCIA, {"motivo": "Vacaciones"})
    assert limpio == {"motivo": "Vacaciones", "nov": "Vacaciones"}

    limpio2 = validar_datos(Actividad.calidad, EstadoRegistro.AUSENCIA, {"motivo": "Otro", "nov": "cita médica"})
    assert limpio2["nov"] == "Otro · cita médica"

    with pytest.raises(DatosInvalidos):
        validar_datos(Actividad.calidad, EstadoRegistro.AUSENCIA, {})

    with pytest.raises(DatosInvalidos):
        validar_datos(Actividad.calidad, EstadoRegistro.AUSENCIA, {"motivo": "no es una opción válida"})


def test_novedad_libre_se_conserva_fuera_de_ausencia():
    limpio = validar_datos(Actividad.calidad, EstadoRegistro.ENVIADA, {"nov": "  todo listo  "})
    assert limpio["nov"] == "todo listo"


def test_link_se_conserva_si_viene():
    limpio = validar_datos(Actividad.calidad, EstadoRegistro.ENVIADA, {"link": " https://drive.example/x "})
    assert limpio["link"] == "https://drive.example/x"
