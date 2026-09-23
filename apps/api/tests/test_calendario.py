from datetime import date

from app.services.calendario import semana_de_fecha, semana_info


def test_semana_1_arranca_en_el_ancla():
    info = semana_info(1)
    assert info.lunes == date(2026, 5, 4)
    assert info.domingo == date(2026, 5, 10)


def test_la_semana_del_20_de_julio_queda_fuera_de_la_numeracion():
    # legacy/index-original.html: CAL.saltos incluye 2026-07-20 porque no se trabajó esa
    # semana; la semana 12 del programa cae entonces la siguiente, el 27 de julio.
    info = semana_info(12)
    assert info.lunes == date(2026, 7, 27)


def test_semana_de_fecha_es_inversa_de_semana_info():
    for n in (1, 5, 12, 20):
        info = semana_info(n)
        assert semana_de_fecha(info.lunes.isoformat()) == n
