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
