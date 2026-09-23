def test_export_csv(client, tienda_principal, token_coordinador, token_admin):
    client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 100}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    )
    r = client.get("/api/v1/export/csv", headers={"Authorization": f"Bearer {token_admin}"})
    assert r.status_code == 200
    assert "PRINCIPAL" in r.text
    assert "inventario" in r.text


def test_export_json(client, tienda_principal, token_coordinador, token_admin):
    client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 100}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    )
    r = client.get("/api/v1/export/json", headers={"Authorization": f"Bearer {token_admin}"})
    assert r.status_code == 200
    body = r.json()
    assert body["registros"][0]["actividad"] == "inventario"
    assert body["registros"][0]["estado"] == "REPORTADO"


def test_export_requiere_admin(client, tienda_principal, token_coordinador):
    r = client.get("/api/v1/export/csv", headers={"Authorization": f"Bearer {token_coordinador}"})
    assert r.status_code == 403
