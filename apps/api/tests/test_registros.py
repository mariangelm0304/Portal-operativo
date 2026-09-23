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
