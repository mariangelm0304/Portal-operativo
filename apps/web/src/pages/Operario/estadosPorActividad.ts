// Estados que puede elegir cada rol para su actividad — puerto exacto de las opciones
// segmentadas del original (legacy/index-original.html, líneas 925-929): mismo texto de
// botón, no el nombre técnico del estado.
export const ESTADOS_POR_ACTIVIDAD: Record<string, { valor: string; etiqueta: string }[]> = {
  inventario: [
    { valor: "REPORTADO", etiqueta: "Conteo hecho" },
    { valor: "SIN_REPORTE", etiqueta: "No alcancé" },
    { valor: "AUSENCIA", etiqueta: "No estuve" },
  ],
  calidad: [
    { valor: "ENVIADA", etiqueta: "Bitácora lista" },
    { valor: "NO_ENVIADA", etiqueta: "No la hice" },
    { valor: "AUSENCIA", etiqueta: "No estuve" },
  ],
  pistoleo: [
    { valor: "REGISTRADO", etiqueta: "Pistoleo hecho" },
    { valor: "NO_REALIZADO", etiqueta: "No se hizo" },
    { valor: "AUSENCIA", etiqueta: "No estuve" },
  ],
};

// ROLES y ACTS.verbo del original — el nombre "de tarea" (más informal) que se usa en el
// encabezado de la tarjeta de Operario, distinto del nombre "de tab" que usa Admin.
export const ROLES: Record<string, string> = {
  coordinador: "Coordinador de tienda",
  tecnico: "Técnico de calidad",
  auxiliar: "Auxiliar de piso",
};

export const VERBO_POR_ACTIVIDAD: Record<string, string> = {
  inventario: "Conteo cíclico",
  calidad: "Bitácora de calidad",
  pistoleo: "Pistoleo de piso",
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
