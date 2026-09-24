def test_alertas_requiere_admin(client, tienda_principal, token_coordinador):
    r = client.get("/api/v1/admin/alertas", headers={"Authorization": f"Bearer {token_coordinador}"})
    assert r.status_code == 403


def test_alertas_devuelve_las_notas_de_migracion(client, tienda_principal, token_admin):
    r = client.get("/api/v1/admin/alertas", headers={"Authorization": f"Bearer {token_admin}"})
    assert r.status_code == 200
    alertas = r.json()
    assert len(alertas) == 8
    assert any("TRINITARIAS" in a for a in alertas)


def test_cambiar_pin_tienda_y_loguear_con_el_nuevo(client, tienda_principal, token_admin):
    r = client.post(
        "/api/v1/admin/pin-tienda",
        json={"slug": "PRINCIPAL", "pin_nuevo": "9999"},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert r.status_code == 204

    viejo = client.post(
        "/api/v1/auth/login",
        json={"slug": "PRINCIPAL", "rol": "coordinador", "nombre": "Mariano Lozano", "pin": "1234"},
    )
    assert viejo.status_code == 401

    nuevo = client.post(
        "/api/v1/auth/login",
        json={"slug": "PRINCIPAL", "rol": "coordinador", "nombre": "Mariano Lozano", "pin": "9999"},
    )
    assert nuevo.status_code == 200


def test_cambiar_pin_admin_requiere_el_actual(client, tienda_principal, token_admin):
    r = client.post(
        "/api/v1/admin/pin-admin",
        json={"pin_actual": "no-es-el-pin", "pin_nuevo": "OTRACLAVE"},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert r.status_code == 401

    r2 = client.post(
        "/api/v1/admin/pin-admin",
        json={"pin_actual": "JAMAR2026", "pin_nuevo": "OTRACLAVE"},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert r2.status_code == 204

    login_viejo = client.post("/api/v1/auth/login-admin", json={"pin": "JAMAR2026"})
    assert login_viejo.status_code == 401
    login_nuevo = client.post("/api/v1/auth/login-admin", json={"pin": "OTRACLAVE"})
    assert login_nuevo.status_code == 200


def test_evidencias_resumen(client, tienda_principal, token_coordinador, token_admin):
    registro = client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 100}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    ).json()
    client.post(
        f"/api/v1/evidencias/{registro['id']}/conteo",
        headers={"Authorization": f"Bearer {token_coordinador}"},
        files={"archivo": ("conteo.xlsx", b"doce-bytes!!", "application/octet-stream")},
    )

    r = client.get("/api/v1/admin/evidencias/resumen", headers={"Authorization": f"Bearer {token_admin}"})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["bytes_totales"] == 12
    assert body["ultima_actualizacion"] is not None


def test_purgar_evidencias_antiguas(client, tienda_principal, token_coordinador, token_admin):
    from app.services.calendario import semana_vigente

    hoy = semana_vigente()
    if hoy < 5:
        return  # necesitamos una semana bien vieja para probar la purga con retención=3

    semana_vieja = 1
    semana_reciente = hoy

    reg_viejo = client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/{semana_vieja}",
        json={"estado": "REPORTADO", "datos": {"cierre": 100}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    ).json()
    reg_reciente = client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/{semana_reciente}",
        json={"estado": "REPORTADO", "datos": {"cierre": 100}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    ).json()
    ev_vieja = client.post(
        f"/api/v1/evidencias/{reg_viejo['id']}/conteo",
        headers={"Authorization": f"Bearer {token_coordinador}"},
        files={"archivo": ("viejo.xlsx", b"x", "application/octet-stream")},
    ).json()
    ev_reciente = client.post(
        f"/api/v1/evidencias/{reg_reciente['id']}/conteo",
        headers={"Authorization": f"Bearer {token_coordinador}"},
        files={"archivo": ("reciente.xlsx", b"x", "application/octet-stream")},
    ).json()

    r = client.post("/api/v1/admin/evidencias/purgar", headers={"Authorization": f"Bearer {token_admin}"})
    assert r.status_code == 200
    assert r.json()["borradas"] == 1

    listado = client.get("/api/v1/evidencias", headers={"Authorization": f"Bearer {token_coordinador}"}).json()
    ids = {e["id"] for e in listado}
    assert ev_vieja["id"] not in ids
    assert ev_reciente["id"] in ids


def test_actualizar_config_retencion(client, tienda_principal, token_admin):
    r = client.put(
        "/api/v1/admin/config", json={"retencion_semanas": 6}, headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert r.status_code == 200
    assert r.json()["retencion_semanas"] == 6

    r2 = client.get("/api/v1/admin/config", headers={"Authorization": f"Bearer {token_admin}"})
    assert r2.json()["retencion_semanas"] == 6
