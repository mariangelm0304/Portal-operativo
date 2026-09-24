# Portal Operativo Jamar — guía de arquitectura

Este archivo es para quien (persona o IA) siga trabajando en este repo. No es documentación
de usuario final; es el mapa y las reglas del proyecto.

## Qué es esto

Portal de seguimiento semanal de 3 actividades operativas (inventario cíclico, bitácora de
calidad, pistoleo) en 21 tiendas Jamar. Nació como un único `index.html` (ver
`legacy/index-original.html`, conservado solo como referencia de la lógica de negocio y el
diseño originales — no se edita ni se sirve). Se migró a monorepo por seguridad: el original
autenticaba con PIN comparado en el cliente y usaba un Google Apps Script público como único
backend.

Migración en curso: [PARIDAD-LEGACY.md](PARIDAD-LEGACY.md) tiene la comparación completa contra
`legacy/index-original.html` (qué falta y en qué orden se cierra). Actualízalo cuando una fase de
ahí quede resuelta — no lo dejes desactualizado mientras se avanza.

## Estructura del monorepo

```
apps/api/   FastAPI + SQLAlchemy + Postgres — fuente de verdad de los datos
apps/web/   React + Vite — los 3 flujos: Ingreso, Operario, Admin
legacy/     el index.html original, solo de referencia
```

No hay herramienta de monorepo (Turborepo/pnpm workspaces): son 2 apps, carpetas planas alcanzan.

### `apps/api` — capas

```
app/core/      config (.env), seguridad (hash de PIN, JWT, rate limit)
app/db/        engine, session, Base declarativa
app/models/    tablas SQLAlchemy (una entidad de negocio por archivo)
app/schemas/   Pydantic (entrada/salida de la API, nunca se reusa el modelo de DB tal cual)
app/api/v1/    routers HTTP — no llevan lógica de negocio, solo orquestan schemas + services
app/services/  lógica de negocio pura (calendario, cumplimiento, sync con Google) — testable sin HTTP
app/storage/   abstracción de archivos (interfaz + implementación local hoy). Para cambiar a
               S3/R2 en producción se agrega una implementación nueva de esta interfaz, no se
               tocan los routers.
```

Regla: un router nunca habla directo con SQLAlchemy ni con el filesystem — pasa por
`services/`/`storage/`. Así cada capa se puede probar y cambiar sola.

### `apps/web` — capas

```
src/pages/        una carpeta por vista (Ingreso, Operario, Admin), como en el original
src/components/   piezas reusables entre vistas
src/api/          cliente HTTP tipado (fetch + JWT adjunto automáticamente)
src/styles/       tokens CSS (colores, tipografía) migrados del index.html original — mismo
                   diseño, no hay rediseño visual en esta migración
```

## Convenciones de código

- Nada de "todo en un archivo" — esa fue la limitación del proyecto original que motivó separar
  en capas. Un archivo nuevo de lógica de negocio va en `services/`, no en el router.
- Comentarios **solo** para explicar el *por qué* cuando no es obvio: una regla de negocio no
  evidente, un workaround, una restricción heredada del sistema anterior. Nunca comentarios que
  repitan lo que el código ya dice, ni bloques de documentación largos.
- Tipado: Pydantic en el backend, TypeScript en el frontend — evitar `Any`/`any` salvo que sea
  imprescindible.

## Cómo correr el proyecto en local

Postgres corre nativo en Windows (no se requiere Docker para desarrollo). Ver
`apps/api/README.md` y `apps/web/README.md` para el detalle de cada app. Resumen:

```
# backend
cd apps/api
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # y completa DATABASE_URL, JWT_SECRET, etc.
alembic upgrade head
python scripts/seed_from_base.py     # una sola vez, importa el histórico de legacy/
uvicorn app.main:app --reload

# frontend
cd apps/web
npm install
copy .env.example .env
npm run dev
```

`docker-compose.yml` en la raíz es *opcional* (levanta Postgres + api + web en contenedores) para
quien prefiera no instalar nada nativo — no es requisito para desarrollar.

## Seguridad

- Nunca commitear `.env` ni credenciales (el `.gitignore` ya los excluye — no se pisa esa regla).
- PIN de tienda y PIN de admin se guardan **hasheados** (bcrypt), nunca en texto plano ni se
  devuelven en ninguna respuesta de la API.
- Sesión vía JWT de corta duración; todo endpoint valida rol **y** tienda del token contra lo que
  pide, del lado del servidor — la UI puede esconder botones, pero eso no es control de acceso.
- Credenciales de la cuenta de servicio de Google (Sheets/Drive) solo existen como variable de
  entorno del backend; el frontend nunca las ve ni las necesita.
- Checklist antes de exponer un endpoint nuevo:
  1. ¿Requiere JWT válido?
  2. ¿Valida que el rol del token puede hacer esta acción?
  3. ¿Valida que la tienda del token es la tienda del recurso (si aplica)?
  4. ¿Necesita rate limit (ej. login, endpoints públicos)?
  5. ¿El archivo/registro que devuelve expone algo que no debería (PIN, datos de otra tienda)?

## Flujo de ramas Git

- `main` — siempre desplegable, protegida, solo se llega por PR. Un push a `main` dispara el
  deploy de producción (Vercel para `apps/web`, Render para `apps/api`).
- `dev` — rama de integración; las features se juntan aquí antes de pasar a `main`.
- `feature/<nombre-corto>` o `fix/<nombre-corto>` — una rama por tarea, sale de `dev` y vuelve a
  `dev` por PR.
- Commits cortos y consistentes: `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...` — el historial
  debe poder leerse como changelog.

## Despliegue

Ver el plan de migración para el detalle comparativo. Recomendado: frontend en Vercel, backend en
Render (Web Service con el `Dockerfile` de `apps/api`), Postgres administrado de Render, y
evidencias (fotos/PDF/Excel) en almacenamiento de objetos S3-compatible (Cloudflare R2 o AWS S3)
desde el día 1 — nunca disco local del backend en producción, porque no es persistente en la
mayoría de plataformas administradas.

## Este archivo se mantiene vivo

Cada vez que se agregue un módulo con un patrón nuevo (por ejemplo, el sync con Google Sheets/
Drive), se documenta aquí el patrón para que el siguiente módulo parecido lo siga. No se deja
como una foto del día 1.
