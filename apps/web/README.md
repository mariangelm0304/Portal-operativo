# apps/web — frontend

React + Vite + TypeScript. Ver [../../CLAUDE.md](../../CLAUDE.md) para arquitectura y convenciones.

## Setup local

Requiere Node.js (18+). Con el backend corriendo en `http://localhost:8000`:

```bash
npm install
copy .env.example .env
npm run dev
```

Abre http://localhost:5173 — PIN por defecto `1234` para cualquier tienda tras el seed del
backend, `JAMAR2026` para "Entrar como administrador".

## Estado de la migración

- **Ingreso**: completo — tienda/zona, persona (maestro + "No estoy en la lista"), PIN,
  entrada de administrador.
- **Operario**: completo — estado + campos propios de la actividad, semana con rango de
  fechas y festivos, historial, y adjuntos (subir/listar/borrar evidencias, simples y
  múltiples con límite). El adjunto se habilita después de guardar el estado, porque el
  backend asocia cada evidencia a un `registro_id` ya existente.
- **Admin**: Resumen (KPIs), Trazabilidad y Maestro (solo lectura) conectados a la API.
  Pendiente: matrices de cumplimiento por actividad (inventario/calidad/pistoleo), tab
  Archivos, edición de PIN/config desde la UI (los endpoints ya existen:
  `/api/v1/admin/pin-tienda`, `/api/v1/admin/pin-admin`, `/api/v1/admin/config`) y export
  CSV/JSON (endpoints `/api/v1/export/csv` y `/api/v1/export/json` ya listos).
