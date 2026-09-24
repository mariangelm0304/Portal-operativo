"""Notas de calidad de datos detectadas al migrar el histórico original a este backend
(ver scripts/seed_from_base.py y scripts/data/base.json, campo "alertas"). Son fijas: nacieron
de una migración de datos que ya pasó, no de algo que vuelva a cambiar — por eso viven como
constante y no como tabla."""

ALERTAS_MIGRACION: list[str] = [
    'TRINITARIAS: cruce con pistoleo por nombre "JAMAR METROPOLITANO" (AG 20) — confirmar',
    "4VIENTOS: zona distinta entre inventario (Atlántico) y bitácora (Caribe); el maestro fija Atlántico",
    '4VIENTOS: cruce con pistoleo por nombre "CUATRO VIENTOS" (AG 10) — confirmar',
    '4VIENTOS: el técnico figura como "Henry Coordinador", que es un cargo y no un nombre',
    'SAN FELIPE: cruce con pistoleo por nombre "JAMAR SAN FELIPE" (AG 67) — confirmar',
    'CACIQUE: cruce con pistoleo por nombre "BUCARAMANGA" (AG 18) — confirmar',
    "AMERICAS: figura sin técnico pero tiene 15 bitácoras enviadas — falta identificar al responsable",
    "PISTOLEO: la serie de Tableau son las 36 semanas ISO de 2026; se alineó por fecha (S1 = semana del "
    "4/05, S17 = semana del 31/08). Quedaron 353 conteos dentro del programa y 367 de enero a abril, "
    "anteriores al arranque, que no se muestran",
]
