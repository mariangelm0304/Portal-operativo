def _token_coordinador(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"slug": "PRINCIPAL", "rol": "coordinador", "nombre": "Mariano Lozano", "pin": "1234"},
    )
    return r.json()["access_token"]


def _token_tecnico(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"slug": "PRINCIPAL", "rol": "tecnico", "nombre": "Carlos Gonzalez", "pin": "1234"},
    )
    return r.json()["access_token"]


def test_coordinador_guarda_su_inventario(client, tienda_principal):
    token = _token_coordinador(client)
    r = client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 100, "bodega": "DISPONIBLE"}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["estado"] == "REPORTADO"
    assert body["datos"]["cierre"] == 100

    # Reportar de nuevo la misma semana actualiza, no duplica (uq_registro_semana).
    r2 = client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 80}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r2.status_code == 200
    listado = client.get(
        "/api/v1/registros", params={"actividad": "inventario"}, headers={"Authorization": f"Bearer {token}"}
    ).json()
    assert len(listado) == 1
    assert listado[0]["datos"]["cierre"] == 80


def test_tecnico_no_puede_reportar_inventario(client, tienda_principal):
    token = _token_tecnico(client)
    r = client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_no_puede_reportar_para_otra_tienda(client, tienda_principal):
    token = _token_coordinador(client)
    r = client.post(
        "/api/v1/registros/999/inventario/1",
        json={"estado": "REPORTADO", "datos": {}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_guardar_registro_deja_traza(client, tienda_principal):
    token = _token_coordinador(client)
    client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {}},
        headers={"Authorization": f"Bearer {token}"},
    )
    admin_token = client.post("/api/v1/auth/login-admin", json={"pin": "JAMAR2026"}).json()["access_token"]
    trazas = client.get("/api/v1/trazas", headers={"Authorization": f"Bearer {admin_token}"}).json()
    assert len(trazas) == 1
    assert trazas[0]["por"] == "Mariano Lozano"


def test_semanas_abiertas_no_revienta_sin_registros(client, tienda_principal, token_coordinador):
    # Regresión: Registro.estado es un str plano en el modelo SQLAlchemy (no un Enum de
    # Python), así que comparar con `.value` acá rompía con AttributeError — se detectó
    # probando contra Postgres real, no con estos tests (sqlite), porque ningún test
    # cubría este endpoint todavía.
    r = client.get(
        "/api/v1/registros/semanas-abiertas",
        params={"actividad": "inventario", "tienda_id": tienda_principal.id},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    )
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_semanas_abiertas_excluye_una_semana_anterior_ya_reportada(client, tienda_principal, token_coordinador):
    from app.services.calendario import semana_vigente

    hoy = semana_vigente()
    if hoy < 2:
        return  # nada que probar en la semana 1 del programa

    semana_anterior = hoy - 1
    client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/{semana_anterior}",
        json={"estado": "REPORTADO", "datos": {}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    )
    r = client.get(
        "/api/v1/registros/semanas-abiertas",
        params={"actividad": "inventario", "tienda_id": tienda_principal.id},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    )
    abiertas = r.json()
    assert hoy in abiertas  # la semana vigente siempre queda disponible para corregir
    assert semana_anterior not in abiertas  # ya tiene un registro REPORTADO, no cuenta como abierta
