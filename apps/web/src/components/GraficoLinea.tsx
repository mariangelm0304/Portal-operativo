// SVG puro, sin librería de charts — puerto de grafLinea() en
// legacy/index-original.html (líneas 1272-1292).
export function GraficoLinea({ puntos, etiquetas, alto = 132 }: { puntos: (number | null)[]; etiquetas: string[]; alto?: number }) {
  const W = 640;
  const H = alto;
  const pl = 30;
  const pr = 12;
  const pt = 12;
  const pb = 20;

  const conValor = puntos.some((v) => v != null);
  if (!conValor) return <div className="vacio">Sin datos para el período seleccionado.</div>;

  const x = (i: number) => pl + (puntos.length < 2 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (puntos.length - 1));
  const y = (v: number) => pt + (1 - v / 100) * (H - pt - pb);

  let d = "";
  let primero = true;
  puntos.forEach((v, i) => {
    if (v == null) return;
    d += `${primero ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    primero = false;
  });

  const idx = puntos.map((v, i) => (v == null ? null : i)).filter((i): i is number => i != null);
  const area = idx.length
    ? `M${x(idx[0])} ${H - pb} ${idx.map((i) => `L${x(i).toFixed(1)} ${y(puntos[i]!).toFixed(1)}`).join(" ")} L${x(idx[idx.length - 1])} ${H - pb} Z`
    : "";

  return (
    <div className="svg-env">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Cumplimiento semanal">
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={pl} y1={y(v)} x2={W - pr} y2={y(v)} stroke="var(--linea)" strokeWidth={1} />
            <text x={pl - 6} y={y(v) + 3.5} textAnchor="end" fontSize={9} fill="var(--tenue)" fontFamily="IBM Plex Mono">
              {v}
            </text>
          </g>
        ))}
        <path d={area} fill="var(--ok)" opacity={0.1} />
        <path d={d} fill="none" stroke="var(--ok)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {puntos.map((v, i) =>
          v == null ? null : (
            <circle key={i} cx={x(i).toFixed(1)} cy={y(v).toFixed(1)} r={i === idx[idx.length - 1] ? 3.6 : 2.4} fill="var(--ok)" />
          ),
        )}
        {etiquetas.map((e, i) => (
          <text key={i} x={x(i).toFixed(1)} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--tenue)" fontFamily="IBM Plex Mono">
            {e}
          </text>
        ))}
      </svg>
    </div>
  );
}
