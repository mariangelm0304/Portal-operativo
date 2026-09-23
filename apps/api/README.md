# apps/api — backend

FastAPI + SQLAlchemy + Postgres. Ver [../../CLAUDE.md](../../CLAUDE.md) para arquitectura y convenciones.

## Setup local (Postgres nativo, sin Docker)

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt

copy .env.example .env
# edita .env: DATABASE_URL con el usuario/password de tu Postgres local, y JWT_SECRET
# (genera uno con: python -c "import secrets; print(secrets.token_urlsafe(48))")

alembic upgrade head
python scripts/seed_from_base.py    # una sola vez: importa el histórico original

uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Docs interactivas (OpenAPI): http://localhost:8000/docs

PIN por defecto después del seed: `1234` para todas las tiendas, `JAMAR2026` para admin —
igual que en el portal original. **Cámbialos** desde `/api/v1/admin/pin-tienda` y
`/api/v1/admin/pin-admin` antes de repartir el enlace real.

## Tests

```bash
pytest
```

Los tests corren contra SQLite en memoria (no requieren Postgres levantado) — ver
`tests/conftest.py`.

## Estructura

Ver la sección "apps/api — capas" en [CLAUDE.md](../../CLAUDE.md).
