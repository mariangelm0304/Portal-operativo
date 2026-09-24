# Paridad con `legacy/index-original.html` — qué falta y plan para cerrarlo

Este documento nace de releer **todo** `legacy/index-original.html` línea por línea (no solo las
vistas que ya se habían portado) y compararlo contra lo que hoy existe en `apps/api` y
`apps/web`. Lista cada elemento del original que todavía no tiene equivalente, agrupado por
área, con la referencia de línea del original y la ruta donde debe quedar en el monorepo según
las capas de [CLAUDE.md](CLAUDE.md). Cierra con un plan de ejecución por fases.

No se re-lista lo que ya está migrado y confirmado funcionando (Ingreso completo; Operario:
estado + cierre/bodega + conteo + historial simple + adjuntos; Admin: resumen básico, trazas
simples, maestro de solo lectura) — eso ya quedó verificado en los commits anteriores.

## Cómo leer esto

- **Original** → línea(s) en `legacy/index-original.html`.
- **Estado hoy** → qué hay (o no) en `apps/api`/`apps/web`.
- **Dónde va** → capa/archivo según la arquitectura de `CLAUDE.md`, para no repetir el patrón de
  "todo en un archivo" del original.

---

## 1. Backend — reglas de negocio que hoy no se validan

El original valida esto en `enviarRegistro()` (líneas 1165-1219) antes de guardar. Hoy
`RegistroIn` (`apps/api/app/schemas/registro.py`) acepta `datos: dict[str, Any]` sin ninguna de
estas reglas — el cliente podría mandar cualquier cosa y el backend lo guarda igual.

| # | Regla | Original | Dónde va |
|---|---|---|---|
| 1.1 | `cierre` (inventario) debe estar entre 0 y 100 | línea 1174-1176 | `app/services/cumplimiento.py` o un `validar_datos_registro(actividad, estado, datos)` nuevo en `services/registros.py`, llamado desde el router |
| 1.2 | `conteo` (pistoleo) es obligatorio y ≥ 0 cuando `estado=REGISTRADO` | línea 1179-1183 | idem |
| 1.3 | `motivo` es obligatorio cuando `estado=AUSENCIA`, y se guarda en `nov` junto con la novedad libre | línea 1184-1187 | idem — hoy no existe ni el campo `motivo` ni la lista `AUSENCIAS` en el backend |
| 1.4 | `bodegaPct` (espacio disponible %) solo aplica si `bodega=DISPONIBLE` | línea 977, 1177 | idem |
| 1.5 | `link` (enlace externo de Drive/SharePoint) para archivos de más de 15 MB | línea 1026-1028, 1188 | campo libre dentro de `datos`, sin migración — solo validación de forma en el service |

No hace falta migrar columnas nuevas: `cierre`, `bodega`, `bodegaPct`, `conteo`, `motivo`, `nov`
y `link` caben en la columna `datos` (JSON) que ya existe en `Registro` — lo que falta es la
**validación de forma por actividad**, que hoy no existe en ningún lado del backend.

`AUSENCIAS` (línea 505 del original: Vacaciones, Incapacidad, Licencia, Cambio de contrato,
Cargo vacante, Otro) debe vivir como constante en `app/services/actividades.py` (junto a `ACTS`)
y exponerse en `GET /api/v1/actividades` para que el frontend no la hardcodee dos veces.

## 2. Backend — endpoints de Admin que faltan

El Admin original calcula todo esto en el cliente a partir de `BASE`/`overlay` completos
(líneas 1244-1500). Con un backend real, ese cálculo debe vivir en `services/`, no en el
frontend (el frontend no debe traerse los ~1260 registros completos para sumarlos en JS).

| # | Endpoint | Reemplaza | Dónde va |
|---|---|---|---|
| 2.1 | `GET /admin/resumen/global?periodo=&semana=&zona=` — cumplimiento global (inventario+calidad combinados), evolución semanal, ranking de tiendas con rezago, desglose por zona | `tabResumen()`, líneas 1367-1441 | `app/services/cumplimiento.py` (agregaciones) + router nuevo `app/api/v1/admin.py` |
| 2.2 | `GET /admin/matriz/{actividad}?periodo=&semana=&zona=` — celda por tienda×semana con estado/fecha/cierre/bodega/conteo/novedad/por, más fila de cumplimiento semanal | `matrizHTML()` + `tabActividad()`, líneas 1293-1490 | idem |
| 2.3 | `GET /admin/novedades?actividad=&periodo=&semana=&zona=` — feed de `nov` no vacíos, más recientes primero | `novedadesHTML()`/`novedadesActHTML()`, líneas 1329-1341, 1491-1500 | idem |
| 2.4 | `GET /admin/evidencias/resumen` — total de archivos, peso total, última actualización (para los 3 KPI del tab Archivos) | `pintarArchivos()`, líneas 1696-1705 | `app/services/` o calculado inline en el router de evidencias con una query de agregación |
| 2.5 | `POST /admin/evidencias/purgar` — borra evidencias de semanas anteriores a `hoy - retención`, sin tocar los registros | modal "Purgar archivos antiguos", líneas 1843-1859 | `app/services/` + router de admin; reutiliza `storage.eliminar()` |
| 2.6 | ✅ Hecho: `GET /api/v1/admin/alertas` expone las 8 notas de calidad de datos como constante en `app/services/alertas.py` | array `BASE.alertas`, usado en línea 1592-1596 | — |

`GET /admin/resumen` (el que ya existe, `app/api/v1/admin.py`) queda como está para el caso
simple de "una semana, todas las tiendas" — los endpoints de arriba son variantes con filtros
más ricos, no un reemplazo.

## 3. Frontend — Operario

Archivo: `apps/web/src/pages/Operario/Operario.tsx` (+ `Adjuntos.tsx`).

| # | Elemento | Original | Estado |
|---|---|---|---|
| 3.1 | Selector de semanas atrasadas (chips S18, S19… clicables para ponerse a corregir semanas viejas, no solo la vigente) | líneas 890-899 | ✅ Hecho (Fase B) |
| 3.2 | Campo "Motivo de la ausencia" (select `AUSENCIAS`) cuando `estado=AUSENCIA` | líneas 989-995 | ✅ Hecho (Fase A+B) |
| 3.3 | Campo "Espacio disponible (%)" cuando `bodega=DISPONIBLE` | líneas 980-983 | ✅ Hecho (Fase A+B) |
| 3.4 | Campo "Novedades u observaciones" (textarea libre) | líneas 1029-1030 | ✅ Hecho (Fase A+B) |
| 3.5 | Campo "Enlace del archivo" para adjuntos de más de 15 MB | líneas 1025-1028 | ✅ Hecho (Fase A+B) |
| 3.6 | Historial como grilla compacta de chips S1..S20 con tooltip (estado/fecha/quién) y ratio "hechos/posibles cumplidas" | `historialHTML()`, líneas 1221-1234 | ✅ Hecho (Fase B) |
| 3.7 | Confirmación de solo-lectura tras guardar, con botón "Corregir registro" para reabrir el formulario | líneas 931-953 | **Decidido: no se implementa.** Se mantiene el formulario siempre editable — más simple de usar y mantener, sin perder funcionalidad. |
| 3.8 | Adjuntos múltiples fuerzan cámara en vivo (`capture="environment"`), no permiten elegir de galería — es una regla de negocio (evidencia fresca, no reciclada) | línea 1004-1008 | **Decidido: sí se implementa.** `Adjuntos.tsx` debe agregar `capture="environment"` al input de adjuntos múltiples y quitar la posibilidad de elegir archivo existente. |
| 3.9 | Compresión de fotos en el cliente antes de subir (máx. 2000px, JPEG calidad .85) | `prepararEvidencia()`, líneas 1141-1163 | **Decidido: no se implementa.** El backend nuevo ya no depende de base64/Apps Script; el límite de 15 MB se valida server-side tal cual. |
| 3.10 | Enter en el campo PIN dispara "Entrar"; Enter en nombre pasa el foco al PIN | líneas 1881-1882 (Ingreso, no Operario, pero mismo patrón de UX) | No implementado — detalle menor de UX |

## 4. Frontend — Admin

Archivo: `apps/web/src/pages/Admin/Admin.tsx`. Esta sigue siendo el área con más brecha: hoy
tiene 3 tabs (Resumen básico, Trazabilidad simple, Maestro ya editable — ver 4.6) contra 7 en
el original. Faltan enteros los tabs de matrices por actividad y Archivos (4.3, 4.4).

### 4.1 Filtros globales (barra superior)

El original filtra **todo** el Admin por Período / Semana / Zona desde `#f-periodo`,
`#f-semana`, `#f-zona` en la barra (líneas 338-349, `llenarFiltros()`/`eventos()` líneas
1869-1888). Hoy `apps/web/src/components/Barra.tsx` no los tiene en absoluto — el Admin nuevo
no puede filtrar por nada.

→ Agregar estado de filtros (contexto o estado local de `Admin.tsx`), los 3 `<select>` en
`Barra.tsx` (visibles solo si `sesion.rol === 'admin'`), y pasar `periodo/semana/zona` como
query params a cada endpoint de la sección 2.

### 4.2 Tab Resumen — falta casi todo

| Elemento | Original |
|---|---|
| 6 KPIs (cumplimiento global, inventario, calidad, pistoleo, semanas por cerrar, tiendas sin técnico) | líneas 1395-1402 |
| Gráfico de línea SVG de evolución semanal del cumplimiento | `grafLinea()`, líneas 1272-1292 |
| Tabla "Tiendas que necesitan gestión" (ranking de rezago) | líneas 1409-1423 |
| Desglose "Por zona" con barra de progreso | líneas 1425-1434 |
| Feed de "Novedades" del período filtrado | líneas 1435-1438 |

Hoy `TabResumen` en `Admin.tsx` solo pinta 3 KPI planos por actividad, sin gráfico, sin ranking,
sin zonas, sin novedades.

### 4.3 Tabs por actividad (Inventario / Calidad / Pistoleo) — no existen

El original tiene un tab por actividad con matriz tienda×semana a color, tooltip por celda,
fila de cumplimiento semanal al pie, ranking (pistoleo) o gráfico de evolución (inventario/
calidad), y novedades filtradas a esa actividad (`tabActividad()`, líneas 1443-1500;
`matrizHTML()`, líneas 1293-1328). **Hoy estos 3 tabs no existen en absoluto** en `Admin.tsx` —
ni siquiera como placeholder.

→ Nuevo componente `apps/web/src/pages/Admin/Matriz.tsx` reusado por los 3 tabs, alimentado por
el endpoint 2.2. La grilla de color + tooltip conviene como componente compartido
(`apps/web/src/components/Matriz.tsx` o similar) porque se repite igual en los 3.

### 4.4 Tab Archivos — no existe

Todo el tab (líneas 1638-1726): KPIs de archivos/peso/última actualización, filtro por
actividad y zona, tabla de archivos con link "Abrir en Drive" (ahora sería "Descargar", contra
`GET /api/v1/evidencias/{id}/archivo`), botón "Actualizar" y botón "Purgar antiguos" con modal
de confirmación. **No hay ni un placeholder de este tab hoy.**

### 4.5 Tab Trazabilidad — existe pero muy reducido

Hoy es una tabla plana. Falta (líneas 1505-1564):
- 4 KPIs (registros desde el portal, con evidencia adjunta, personas que han registrado,
  registros históricos migrados).
- Botón/enlace de evidencia por fila (o "enlace externo" si usó `link` en vez de adjunto).
- Card "Quién más reporta" (ranking de personas por cantidad de registros).
- Card explicativa "Qué cambia con el portal".

### 4.6 Tab Maestro — ✅ hecho (Fase C)

PIN editable por tienda + "Guardar PIN" (guarda todos los cambios de la tabla de una vez, sin
pre-llenar el PIN actual porque el backend no lo devuelve — ver seguridad en CLAUDE.md); pill
"verificar"; card "Revisiones pendientes del dato" con las 8 alertas de la migración
(`GET /api/v1/admin/alertas`, nuevo); botones de export CSV/JSON que descargan de verdad
(`apps/web/src/api/descargar.ts`); card de Configuración (cambiar PIN admin, retención); card
"Origen de los datos".

### 4.7 Piezas compartidas que no existen todavía en React

| Pieza | Uso en el original | Dónde va |
|---|---|---|
| Modal reusable | alta de persona, confirmar purga, etc. (líneas 1771-1791) | `apps/web/src/components/Modal.tsx` — Ingreso ya resolvió sus 2 casos con estado local inline; a partir de Admin conviene un componente genérico para no repetir el patrón 4 veces más |
| Toast reusable | confirmaciones/errores tras una acción (línea 604-607, usado en todo el archivo) | `apps/web/src/components/Toast.tsx` + un hook `useToast()` |
| Tooltip on-hover con `data-tip` | celdas de matriz, chips de historial (líneas 1799-1818) | `apps/web/src/components/Tooltip.tsx`, o directamente `title` nativo como versión simple |
| Gráfico de línea SVG | evolución de cumplimiento (líneas 1272-1292) | `apps/web/src/components/GraficoLinea.tsx` — es SVG puro, no necesita librería de charts |
| Barra de progreso (`barrita`) | rezago, zonas, ranking pistoleo (línea 1269-1271) | ya existe la clase CSS `.barrita`; falta el componente React que la use |

## 5. Resumen de prioridad

No todo pesa igual. Orden sugerido:

1. **Validación de reglas de negocio en el backend** (sección 1) — es lo único que es un riesgo
   real de datos corruptos, no solo de UX. Bloquea todo lo demás porque el Operario necesita
   estos campos para mandar `motivo`/`bodegaPct`/`link`.
2. **Operario: campos faltantes del formulario** (3.2, 3.3, 3.4, 3.5) — depende de (1).
3. **Admin: Maestro editable + export** (4.6) — es lo más barato de cerrar (los endpoints ya
   existen, es 100% UI) y lo que un admin va a extrañar primero (cambiar PIN, exportar).
4. **Admin: Archivos** (4.4) — igual de barato, el endpoint de evidencias ya existe.
5. **Admin: Resumen completo + Matrices por actividad** (4.2, 4.3, 2.1, 2.2) — lo más grande,
   requiere los endpoints de agregación nuevos.
6. **Admin: Trazabilidad enriquecida** (4.5).
7. **Detalles de UX** (3.1, 3.6, 3.7, 3.8, 3.9, 3.10) — pulido, no bloquean uso real.
8. **Piezas compartidas** (4.7) — se construyen a medida que las fases 3-6 las necesitan, no
   antes (evitar componentes genéricos sin un caso de uso real todavía, según las convenciones
   de `CLAUDE.md`: nada de abstracción prematura).

## 6. Plan de ejecución

- [x] **Fase A — Validación de negocio (backend)**
  - `app/services/registros.py` nuevo: `validar_datos(actividad, estado, datos) -> datos_limpios`,
    con las 5 reglas de la sección 1. Se llama desde `POST /registros/{tienda_id}/{actividad}/{semana}`.
  - Agregar `AUSENCIAS` a `app/services/actividades.py` y exponerlo en `GET /api/v1/actividades`.
  - Tests: cierre fuera de rango falla, conteo faltante en REGISTRADO falla, motivo faltante en
    AUSENCIA falla, bodegaPct se ignora si bodega≠DISPONIBLE, link se acepta y se guarda.

- [x] **Fase B — Operario: formulario completo**
  - Agregar motivo (select), bodegaPct (input condicional), novedades (textarea), link
    (input) a `FormularioSemana` en `Operario.tsx`.
  - Selector de semanas atrasadas: usar el array completo de `semanas-abiertas`, no solo `[0]`.
  - Historial en grilla de chips con tooltip nativo (`title`) y ratio cumplidas/posibles —
    puede reusar `EST`/cumplimiento ya portado en el backend vía un endpoint liviano o
    replicando la tabla `EST` también del lado del cliente (ya existe algo parecido en
    `estadosPorActividad.ts`).
  - `capture="environment"` forzado en adjuntos múltiples (decidido, ver 3.8). El flujo de
    confirmación + "Corregir registro" no se implementa (decidido, ver 3.7).

- [x] **Fase C — Admin: Maestro editable + Exportar + Configuración**
  - PIN editable por tienda + botón guardar (llama a `POST /api/v1/admin/pin-tienda`).
  - Botones CSV/JSON que disparan descarga desde `/api/v1/export/csv` y `/export/json`.
  - Card de configuración: cambiar PIN admin, retención (llaman a endpoints ya existentes).
  - Card "Revisiones pendientes del dato" — requiere exponer `alertas` (sección 2.6).

- [ ] **Fase D — Admin: tab Archivos**
  - Backend: `GET /admin/evidencias/resumen`, `POST /admin/evidencias/purgar` (sección 2.4, 2.5).
  - Frontend: nuevo tab con KPIs, filtros actividad/zona, tabla con descarga, botón purgar con
    confirmación (Modal).

- [ ] **Fase E — Admin: Resumen completo + Matrices por actividad**
  - Backend: endpoints 2.1, 2.2, 2.3 con filtros período/semana/zona.
  - Frontend: filtros globales en `Barra.tsx`; `GraficoLinea.tsx`; componente de matriz
    compartido; 3 tabs nuevos (Inventario/Calidad/Pistoleo); Resumen completo.

- [ ] **Fase F — Admin: Trazabilidad enriquecida**
  - KPIs, evidencia por fila, ranking "quién más reporta", card explicativa.

- [ ] **Fase G — Pulido de UX**
  - Enter para navegar el formulario de Ingreso, demás detalles de la sección 3 que queden.
    (La compresión de imágenes queda descartada, ver 3.9.)

## Verificación

Cada fase se valida igual que las anteriores: `pytest` en `apps/api`, `npm run build` en
`apps/web`, y una pasada real contra Postgres + un navegador (headless o normal) antes de dar la
fase por cerrada — no alcanza con que compile.
