// Estados que puede elegir cada rol para su actividad — puerto de los botones segmentados
// del original (seg button, legacy/index-original.html). AUSENCIA/PENDIENTE se ofrecen en
// las 3 porque cualquier operario puede reportar que no pudo hacer la actividad esta semana.
export const ESTADOS_POR_ACTIVIDAD: Record<string, { valor: string; etiqueta: string }[]> = {
  inventario: [
    { valor: "REPORTADO", etiqueta: "Reportado" },
    { valor: "SIN_REPORTE", etiqueta: "Sin reporte" },
    { valor: "AUSENCIA", etiqueta: "Ausencia justificada" },
  ],
  calidad: [
    { valor: "ENVIADA", etiqueta: "Enviada" },
    { valor: "NO_ENVIADA", etiqueta: "No enviada" },
    { valor: "AUSENCIA", etiqueta: "Ausencia justificada" },
  ],
  pistoleo: [
    { valor: "REGISTRADO", etiqueta: "Registrado" },
    { valor: "AUSENCIA", etiqueta: "Ausencia justificada" },
  ],
};

export const BODEGA_OPCIONES = [
  { valor: "LLENA", etiqueta: "Bodega llena" },
  { valor: "DISPONIBLE", etiqueta: "Con espacio disponible" },
  { valor: "EVACUACION", etiqueta: "En evacuación" },
  { valor: "SIN_INFO", etiqueta: "Sin información" },
];

// Espejo de EST en app/services/cumplimiento.py — solo para pintar el semáforo del
// historial en el cliente, la fuente de verdad del cálculo sigue siendo el backend.
export const TONO_POR_ESTADO: Record<string, "ok" | "medio" | "falla" | "ausen" | "pend"> = {
  REPORTADO: "ok",
  SIN_REPORTE: "falla",
  ENVIADA: "ok",
  NO_ENVIADA: "falla",
  SIN_TECNICO: "falla",
  REGISTRADO: "ok",
  NO_REALIZADO: "falla",
  AUSENCIA: "ausen",
  PENDIENTE: "pend",
  SIN_DATO: "pend",
};

export const CUENTA_POR_ESTADO: Record<string, "cumple" | "incumple" | "excluye"> = {
  REPORTADO: "cumple",
  SIN_REPORTE: "incumple",
  ENVIADA: "cumple",
  NO_ENVIADA: "incumple",
  SIN_TECNICO: "excluye",
  REGISTRADO: "cumple",
  NO_REALIZADO: "incumple",
  AUSENCIA: "excluye",
  PENDIENTE: "excluye",
  SIN_DATO: "excluye",
};
