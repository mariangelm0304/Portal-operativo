def test_trazas_incluye_evidencia_y_link(client, tienda_principal, token_coordinador, token_admin):
    registro = client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 100, "link": "https://drive.example/x"}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    ).json()
    client.post(
        f"/api/v1/evidencias/{registro['id']}/conteo",
        headers={"Authorization": f"Bearer {token_coordinador}"},
        files={"archivo": ("conteo.xlsx", b"x", "application/octet-stream")},
    )

    r = client.get("/api/v1/trazas", headers={"Authorization": f"Bearer {token_admin}"})
    trazas = r.json()
    assert len(trazas) == 1
    assert trazas[0]["link"] == "https://drive.example/x"
    assert len(trazas[0]["evidencias"]) == 1
    assert trazas[0]["evidencias"][0]["nombre_original"] == "conteo.xlsx"


def test_trazas_resumen(client, tienda_principal, token_coordinador, token_admin):
    client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 100}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    )
    # Guardar dos veces la misma celda: sigue contando como 1 registro "desde el portal".
    client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 90}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    )

    r = client.get("/api/v1/trazas/resumen", headers={"Authorization": f"Bearer {token_admin}"})
    assert r.status_code == 200
    body = r.json()
    assert body["registros_portal"] == 1
    assert body["personas"] == 1
    # El seed no corre en estos tests (sqlite), así que el único registro es el de arriba.
    assert body["historicos_migrados"] == 0


def test_trazas_top_personas(client, tienda_principal, token_coordinador, token_admin):
    client.post(
        f"/api/v1/registros/{tienda_principal.id}/inventario/1",
        json={"estado": "REPORTADO", "datos": {"cierre": 100}},
        headers={"Authorization": f"Bearer {token_coordinador}"},
    )
    r = client.get("/api/v1/trazas/top-personas", headers={"Authorization": f"Bearer {token_admin}"})
    body = r.json()
    assert body[0]["nombre"] == "Mariano Lozano"
    assert body[0]["cantidad"] == 1


def test_trazas_resumen_requiere_admin(client, tienda_principal, token_coordinador):
    r = client.get("/api/v1/trazas/resumen", headers={"Authorization": f"Bearer {token_coordinador}"})
    assert r.status_code == 403
