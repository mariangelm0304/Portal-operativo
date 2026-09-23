# Portal Operativo Jamar

Seguimiento semanal de inventario cíclico, bitácora de calidad y pistoleo en 21 tiendas.

- `apps/api` — backend FastAPI + Postgres ([detalle](apps/api/README.md))
- `apps/web` — frontend React + Vite ([detalle](apps/web/README.md))
- `legacy/` — versión original en un solo `index.html` (Google Apps Script + Sheets/Drive),
  conservada solo como referencia de la lógica de negocio y el diseño

Ver [CLAUDE.md](CLAUDE.md) para arquitectura, convenciones y flujo de ramas.

## Quickstart local (sin Docker)

```bash
# 1. Postgres nativo corriendo en tu máquina (crea una base, ej. portal_operativo)

# 2. Backend
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # completa DATABASE_URL y JWT_SECRET
alembic upgrade head
python scripts/seed_from_base.py
uvicorn app.main:app --reload
# -> http://localhost:8000/docs

# 3. Frontend (requiere Node.js instalado)
cd apps/web
npm install
copy .env.example .env
npm run dev
# -> http://localhost:5173
```
