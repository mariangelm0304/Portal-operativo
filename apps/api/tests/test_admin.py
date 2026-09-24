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


def test_actualizar_config_retencion(client, tienda_principal, token_admin):
    r = client.put(
        "/api/v1/admin/config", json={"retencion_semanas": 6}, headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert r.status_code == 200
    assert r.json()["retencion_semanas"] == 6

    r2 = client.get("/api/v1/admin/config", headers={"Authorization": f"Bearer {token_admin}"})
    assert r2.json()["retencion_semanas"] == 6
