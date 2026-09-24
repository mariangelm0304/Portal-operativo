def _crear_registro(client, tienda_id, token):
    r = client.post(
        f"/api/v1/registros/{tienda_id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 100}},
        headers={"Authorization": f"Bearer {token}"},
    )
    return r.json()["id"]


def test_subir_listar_y_borrar_evidencia(client, tienda_principal, token_coordinador):
    registro_id = _crear_registro(client, tienda_principal.id, token_coordinador)

    subida = client.post(
        f"/api/v1/evidencias/{registro_id}/conteo",
        headers={"Authorization": f"Bearer {token_coordinador}"},
        files={"archivo": ("conteo.xlsx", b"contenido-de-prueba", "application/octet-stream")},
    )
    assert subida.status_code == 200
    evidencia = subida.json()
    assert evidencia["ranura"] == "conteo"
    assert evidencia["sync_estado"] == "pendiente"  # sin credenciales de Google configuradas

    listado = client.get("/api/v1/evidencias", headers={"Authorization": f"Bearer {token_coordinador}"})
    assert len(listado.json()) == 1

    descarga = client.get(
        f"/api/v1/evidencias/{evidencia['id']}/archivo", headers={"Authorization": f"Bearer {token_coordinador}"}
    )
    assert descarga.content == b"contenido-de-prueba"

    borrado = client.delete(
        f"/api/v1/evidencias/{evidencia['id']}", headers={"Authorization": f"Bearer {token_coordinador}"}
    )
    assert borrado.status_code == 204


def test_subir_a_ranura_invalida_falla(client, tienda_principal, token_coordinador):
    registro_id = _crear_registro(client, tienda_principal.id, token_coordinador)
    r = client.post(
        f"/api/v1/evidencias/{registro_id}/ranura-que-no-existe",
        headers={"Authorization": f"Bearer {token_coordinador}"},
        files={"archivo": ("x.jpg", b"x", "image/jpeg")},
    )
    assert r.status_code == 400


def test_otra_tienda_no_puede_subir_evidencia_a_registro_ajeno(client, tienda_principal, token_coordinador, db_session):
    from app.core.security import hash_pin
    from app.models.tienda import Tienda

    registro_id = _crear_registro(client, tienda_principal.id, token_coordinador)

    otra = Tienda(ag="99", nombre="OTRA", slug="OTRA", zona="Z", nombre_pistoleo="OTRA", pin_hash=hash_pin("1234"))
    db_session.add(otra)
    db_session.commit()

    login_otra = client.post("/api/v1/auth/login", json={"slug": "OTRA", "rol": "auxiliar", "nombre": "Quien sea", "pin": "1234"})
    token_otra = login_otra.json()["access_token"]

    r = client.post(
        f"/api/v1/evidencias/{registro_id}/conteo",
        headers={"Authorization": f"Bearer {token_otra}"},
        files={"archivo": ("x.jpg", b"x", "image/jpeg")},
    )
    assert r.status_code == 403
