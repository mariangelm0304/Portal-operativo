def test_periodos_agrupa_semanas_por_mes(client, tienda_principal, token_admin):
    r = client.get("/api/v1/admin/periodos", headers={"Authorization": f"Bearer {token_admin}"})
    assert r.status_code == 200
    periodos = r.json()
    assert periodos[0]["nombre"] == "Mayo 2026"
    assert periodos[0]["semanas"] == [1, 2, 3, 4]


def test_resumen_global_requiere_admin(client, tienda_principal, token_coordinador):
    r = client.get("/api/v1/admin/resumen/global", headers={"Authorization": f"Bearer {token_coordinador}"})
    assert r.status_code == 403


def test_resumen_global_cuenta_bien(client, tienda_principal, token_coordinador, token_admin):
    client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 100}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    )
    r = client.get("/api/v1/admin/resumen/global", params={"semana": 1}, headers={"Authorization": f"Bearer {token_admin}"})
    assert r.status_code == 200
    body = r.json()
    assert body["inventario"]["cumple"] == 1
    assert body["cumplimiento_global"]["pct"] == 100.0
    assert len(body["evolucion"]) >= 1


def test_matriz_inventario_trae_una_fila_por_tienda(client, tienda_principal, token_coordinador, token_admin):
    client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 80}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    )
    r = client.get("/api/v1/admin/matriz/inventario", params={"semana": 1}, headers={"Authorization": f"Bearer {token_admin}"})
    assert r.status_code == 200
    body = r.json()
    assert len(body["tiendas"]) == 1
    celda = body["tiendas"][0]["celdas"][0]
    assert celda["estado"] == "REPORTADO"
    assert celda["tono"] == "medio"  # cierre < 100
    assert body["ranking"] is None
    assert body["cumplimiento_semanal"] == [{"semana": 1, "pct": 100.0}]


def test_matriz_pistoleo_trae_ranking_no_cumplimiento_semanal(client, tienda_principal, token_coordinador, token_admin):
    # PRINCIPAL no tiene rol pistoleo en el fixture por defecto, entra como auxiliar genérico.
    login = client.post(
        "/api/v1/auth/login", json={"slug": "PRINCIPAL", "rol": "auxiliar", "nombre": "Aux", "pin": "1234"}
    )
    token_aux = login.json()["access_token"]
    client.post(
        f"/api/v1/registros/{tienda_principal.id}/pistoleo/1",
        json={"estado": "REGISTRADO", "datos": {"conteo": 150}},
        headers={"Authorization": f"Bearer {token_aux}"},
    )
    r = client.get("/api/v1/admin/matriz/pistoleo", params={"semana": 1}, headers={"Authorization": f"Bearer {token_admin}"})
    body = r.json()
    assert body["cumplimiento_semanal"] is None
    assert body["ranking"][0]["valor"] == 150


def test_novedades_solo_incluye_registros_con_nov(client, tienda_principal, token_coordinador, token_admin):
    client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 100, "nov": "todo en orden"}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    )
    client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/2",
        json={"estado": "REPORTADO", "datos": {"cierre": 100}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    )
    r = client.get("/api/v1/admin/novedades", headers={"Authorization": f"Bearer {token_admin}"})
    body = r.json()
    assert len(body) == 1
    assert body[0]["nov"] == "todo en orden"
