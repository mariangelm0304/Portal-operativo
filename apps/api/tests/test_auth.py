def test_login_correcto_devuelve_token(client, tienda_principal):
    r = client.post(
        "/api/v1/auth/login",
        json={"slug": "PRINCIPAL", "rol": "coordinador", "nombre": "Mariano Lozano", "pin": "1234"},
    )
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_login_con_pin_incorrecto_falla(client, tienda_principal):
    r = client.post(
        "/api/v1/auth/login",
        json={"slug": "PRINCIPAL", "rol": "coordinador", "nombre": "Mariano Lozano", "pin": "0000"},
    )
    assert r.status_code == 401


def test_login_con_nombre_que_no_es_el_responsable_falla(client, tienda_principal):
    # El PIN identifica la tienda, no a la persona: el rol/nombre se valida aparte contra
    # el maestro (Tienda.coordinador/tecnico) o contra Persona — ver app/api/v1/auth.py.
    r = client.post(
        "/api/v1/auth/login",
        json={"slug": "PRINCIPAL", "rol": "coordinador", "nombre": "Alguien Inventado", "pin": "1234"},
    )
    assert r.status_code == 403


def test_login_auxiliar_no_requiere_estar_en_el_maestro(client, tienda_principal):
    r = client.post(
        "/api/v1/auth/login",
        json={"slug": "PRINCIPAL", "rol": "auxiliar", "nombre": "Cualquiera", "pin": "1234"},
    )
    assert r.status_code == 200


def test_login_admin_correcto(client, tienda_principal):
    r = client.post("/api/v1/auth/login-admin", json={"pin": "JAMAR2026"})
    assert r.status_code == 200
    assert r.json()["rol"] == "admin"


def test_jwt_de_operario_no_puede_entrar_a_endpoints_de_admin(client, tienda_principal):
    login = client.post(
        "/api/v1/auth/login",
        json={"slug": "PRINCIPAL", "rol": "coordinador", "nombre": "Mariano Lozano", "pin": "1234"},
    )
    token = login.json()["access_token"]
    r = client.get("/api/v1/admin/resumen", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_sin_token_devuelve_401(client, tienda_principal):
    r = client.get("/api/v1/admin/resumen")
    assert r.status_code == 401
