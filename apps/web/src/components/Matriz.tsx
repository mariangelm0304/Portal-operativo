import type { FilaMatriz, MatrizActividad } from "../api/types";

const LEYENDA_BASE: { tono: string; etiqueta: string }[] = [
  { tono: "ok", etiqueta: "Cumplido" },
  { tono: "falla", etiqueta: "Incumplido / sin responsable" },
  { tono: "ausen", etiqueta: "Ausencia justificada" },
  { tono: "pend", etiqueta: "Pendiente" },
];

function tituloCelda(fila: FilaMatriz, celda: FilaMatriz["celdas"][number]): string {
  const partes = [`${fila.nombre} · S${celda.semana}`, `Estado: ${celda.estado ?? "Sin registro"}`];
  if (celda.por) partes.push(`Registró: ${celda.por}`);
  if (typeof celda.datos.cierre === "number") partes.push(`Cierre: ${celda.datos.cierre}%`);
  if (typeof celda.datos.conteo === "number") partes.push(`Unidades: ${celda.datos.conteo}`);
  if (typeof celda.datos.nov === "string") partes.push(`Novedad: ${celda.datos.nov}`);
  return partes.join(" · ");
}

// Puerto de matrizHTML() en legacy/index-original.html (líneas 1293-1328), compartido por
// los 3 tabs de actividad — la grilla y la leyenda son idénticas, solo cambia el dato.
export function Matriz({ actividad, matriz }: { actividad: "inventario" | "calidad" | "pistoleo"; matriz: MatrizActividad }) {
  return (
    <>
      <div className="mtz-env">
        <table className="mtz">
          <thead>
            <tr>
              <th className="ini">Tienda</th>
              {matriz.semanas.map((s) => (
                <th key={s.n} className={s.info.festivos ? "fest" : ""} title={s.info.lunes + " a " + s.info.domingo}>
                  S{s.n}
                </th>
              ))}
              <th>{actividad === "pistoleo" ? "Total" : "Cumpl."}</th>
              <th className="rell"></th>
            </tr>
          </thead>
          <tbody>
            {matriz.tiendas.map((fila) => (
              <tr key={fila.id}>
                <td className="ini">
                  <div className="mtz-t">
                    <span className="ag">{fila.ag}</span>
                    <b>{fila.nombre}</b>
                    <span className="zn">{fila.zona}</span>
                  </div>
                </td>
                {fila.celdas.map((c) => (
                  <td key={c.semana}>
                    <span className={`cel c-${c.tono}`} title={tituloCelda(fila, c)} />
                  </td>
                ))}
                <td className="tot">{actividad === "pistoleo" ? fila.conteo.toLocaleString("es-CO") : fila.pct == null ? "—" : `${Math.round(fila.pct)}%`}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
          {matriz.cumplimiento_semanal && (
            <tfoot>
              <tr>
                <th className="ini" style={{ textAlign: "left", padding: "7px 12px" }}>
                  Cumplimiento semanal (%)
                </th>
                {matriz.cumplimiento_semanal.map((p) => (
                  <th key={p.semana}>{p.pct == null ? "—" : Math.round(p.pct)}</th>
                ))}
                <th></th>
                <th></th>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="mtz-leyenda">
        {LEYENDA_BASE.map((l) => (
          <span key={l.tono}>
            <i style={{ background: `var(--${l.tono === "pend" ? "pend-f" : l.tono})`, border: l.tono === "pend" ? "1px solid var(--linea2)" : undefined }} />
            {l.etiqueta}
          </span>
        ))}
        {actividad === "inventario" && (
          <span>
            <i style={{ background: "var(--medio)" }} />
            Cierre parcial
          </span>
        )}
      </div>
    </>
  );
}
