import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError, apiFetch } from "../../api/client";
import type { Adjunto, Actividades, Registro, SemanaInfo } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { Adjuntos } from "./Adjuntos";
import { BODEGA_OPCIONES, CUENTA_POR_ESTADO, ESTADOS_POR_ACTIVIDAD, TONO_POR_ESTADO } from "./estadosPorActividad";

const ACTIVIDAD_POR_ROL: Record<string, "inventario" | "calidad" | "pistoleo"> = {
  coordinador: "inventario",
  tecnico: "calidad",
  auxiliar: "pistoleo",
};

const MESES_CORTO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatoRango(lunes: string, domingo: string): string {
  const [, , dl] = lunes.split("-").map(Number);
  const [, md, dd] = domingo.split("-").map(Number);
  return `${dl} al ${dd} de ${MESES_CORTO[md - 1]}`;
}

export function Operario() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const tiendaId = sesion?.tiendaId ?? null;
  const actividad = sesion ? ACTIVIDAD_POR_ROL[sesion.rol] : "inventario";
  const [semanaElegida, setSemanaElegida] = useState<number | null>(null);

  const { data: semanasAbiertas } = useQuery({
    queryKey: ["semanas-abiertas", actividad, tiendaId],
    queryFn: () =>
      apiFetch<number[]>(`/api/v1/registros/semanas-abiertas?actividad=${actividad}&tienda_id=${tiendaId}`, {
        token: sesion!.token,
      }),
    enabled: !!sesion && !!tiendaId,
  });

  const { data: registros } = useQuery({
    queryKey: ["registros", actividad, tiendaId],
    queryFn: () => apiFetch<Registro[]>(`/api/v1/registros?actividad=${actividad}`, { token: sesion!.token }),
    enabled: !!sesion && !!tiendaId,
  });

  const { data: actividades } = useQuery({
    queryKey: ["actividades"],
    queryFn: () => apiFetch<Actividades>("/api/v1/actividades"),
    enabled: !!sesion,
  });

  const semanaVigente = semanasAbiertas?.[0];
  const semanaActual = semanaElegida ?? semanaVigente;
  const atrasadas = (semanasAbiertas ?? []).filter((s) => s !== semanaVigente);

  const { data: semanaInfo } = useQuery({
    queryKey: ["calendario", semanaActual],
    queryFn: () => apiFetch<SemanaInfo>(`/api/v1/calendario/${semanaActual}`),
    enabled: semanaActual != null,
  });

  if (!sesion || !tiendaId) return null;

  const registroActual = registros?.find((r) => r.semana === semanaActual);

  return (
    <div className="contenido">
      <div className="op">
        <div className="op-id">
          <div className="avatar">{iniciales(sesion.nombre)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Archivo,sans-serif", fontWeight: 700, fontSize: 15 }}>{sesion.nombre}</div>
            <div style={{ fontSize: 12, color: "var(--tenue)" }}>{sesion.tiendaSlug}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="eti">Semana</div>
            <div className="mono" style={{ fontSize: 19, fontWeight: 600 }}>
              {semanaActual ?? "—"}
            </div>
            {semanaInfo && <div style={{ fontSize: 11, color: "var(--tenue)" }}>{formatoRango(semanaInfo.lunes, semanaInfo.domingo)}</div>}
          </div>
        </div>

        {semanaInfo && semanaInfo.festivos.length > 0 && (
          <div className="sem-fest">
            {semanaInfo.festivos.map((f) => (
              <span key={f.fecha} className="chip cuad e-ausen">
                {f.nombre}
              </span>
            ))}
          </div>
        )}

        {atrasadas.length > 0 && (
          <div className="sem-banda">
            <div className="sem-info">
              <span className="eti">Semanas sin registrar</span>
            </div>
            <div className="hist">
              {[semanaVigente, ...atrasadas].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`hist-s ${s === semanaActual ? "h-act" : ""}`}
                  onClick={() => setSemanaElegida(s === semanaVigente ? null : s!)}
                >
                  S{s}
                </button>
              ))}
            </div>
          </div>
        )}

        {semanaActual != null && actividades && (
          <FormularioSemana
            actividad={actividad}
            tiendaId={tiendaId}
            semana={semanaActual}
            token={sesion.token}
            registro={registroActual}
            adjuntos={actividades.actividades[actividad].adjuntos}
            ausencias={actividades.ausencias}
            onGuardado={() => queryClient.invalidateQueries({ queryKey: ["registros", actividad, tiendaId] })}
          />
        )}

        <div className="tj">
          <div className="tj-h">
            <h3>Mi historial</h3>
          </div>
          <div className="tj-b">
            <HistorialChips registros={registros ?? []} semanaActual={semanaActual} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HistorialChips({ registros, semanaActual }: { registros: Registro[]; semanaActual: number | undefined }) {
  if (!registros.length) return <div className="vacio">Todavía no hay registros.</div>;

  const maxSemana = Math.max(...registros.map((r) => r.semana), semanaActual ?? 0);
  const semanas = Array.from({ length: maxSemana }, (_, i) => i + 1);
  const porSemana = new Map(registros.map((r) => [r.semana, r]));

  const cumplidas = registros.filter((r) => CUENTA_POR_ESTADO[r.estado] === "cumple").length;
  const posibles = registros.filter((r) => CUENTA_POR_ESTADO[r.estado] !== "excluye").length;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
        <span className="eti">Semanas del programa</span>
        <span style={{ fontSize: 12 }}>
          <b className="mono">
            {cumplidas}/{posibles}
          </b>{" "}
          <span style={{ color: "var(--tenue)" }}>cumplidas</span>
        </span>
      </div>
      <div className="hist">
        {semanas.map((s) => {
          const r = porSemana.get(s);
          const tono = r ? TONO_POR_ESTADO[r.estado] ?? "pend" : "pend";
          return (
            <div
              key={s}
              className={`hist-s ${tono === "pend" ? "" : `h-${tono}`} ${s === semanaActual ? "h-act" : ""}`}
              title={r ? `S${s} · ${r.estado} · ${new Date(r.actualizado_en).toLocaleDateString("es-CO")}` : `S${s} · Sin registro`}
            >
              S{s}
            </div>
          );
        })}
      </div>
    </>
  );
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

function FormularioSemana({
  actividad,
  tiendaId,
  semana,
  token,
  registro,
  adjuntos,
  ausencias,
  onGuardado,
}: {
  actividad: "inventario" | "calidad" | "pistoleo";
  tiendaId: number;
  semana: number;
  token: string;
  registro: Registro | undefined;
  adjuntos: Adjunto[];
  ausencias: string[];
  onGuardado: () => void;
}) {
  const [estado, setEstado] = useState(registro?.estado ?? "");
  const [cierre, setCierre] = useState<string>(String(registro?.datos.cierre ?? ""));
  const [bodega, setBodega] = useState<string>(String(registro?.datos.bodega ?? ""));
  const [bodegaPct, setBodegaPct] = useState<string>(String(registro?.datos.bodegaPct ?? ""));
  const [conteo, setConteo] = useState<string>(String(registro?.datos.conteo ?? ""));
  const [motivo, setMotivo] = useState<string>(String(registro?.datos.motivo ?? ""));
  const [nov, setNov] = useState<string>(String(registro?.datos.nov ?? ""));
  const [link, setLink] = useState<string>(String(registro?.datos.link ?? ""));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const opciones = ESTADOS_POR_ACTIVIDAD[actividad];

  async function guardar() {
    if (!estado) return setError("Elige un estado.");
    setGuardando(true);
    setError(null);
    setOk(false);
    try {
      const datos: Record<string, unknown> = {};
      if (actividad === "inventario" && estado === "REPORTADO") {
        if (cierre) datos.cierre = Number(cierre);
        if (bodega) datos.bodega = bodega;
        if (bodega === "DISPONIBLE" && bodegaPct) datos.bodegaPct = Number(bodegaPct);
      }
      if (actividad === "pistoleo" && estado === "REGISTRADO" && conteo) {
        datos.conteo = Number(conteo);
      }
      if (estado === "AUSENCIA") {
        datos.motivo = motivo;
      }
      if (nov.trim()) datos.nov = nov.trim();
      if (link.trim()) datos.link = link.trim();

      await apiFetch(`/api/v1/registros/${tiendaId}/${actividad}/${semana}`, {
        method: "POST",
        token,
        body: { estado, datos },
      });
      setOk(true);
      onGuardado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="op-tarea">
      <div className="op-tarea-h">
        <b>Semana {semana}</b>
      </div>
      <div className="op-form">
        <div className="campo">
          <label>Estado</label>
          <div className="seg">
            {opciones.map((o) => (
              <button key={o.valor} className={estado === o.valor ? "on" : ""} onClick={() => setEstado(o.valor)} type="button">
                {o.etiqueta}
              </button>
            ))}
          </div>
        </div>

        {actividad === "inventario" && estado === "REPORTADO" && (
          <div className="op-grid">
            <div className="campo">
              <label htmlFor="cierre">Cierre del conteo (%)</label>
              <input id="cierre" type="number" min={0} max={100} value={cierre} onChange={(e) => setCierre(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="bodega">Estado de la bodega</label>
              <select id="bodega" value={bodega} onChange={(e) => setBodega(e.target.value)}>
                <option value="">Sin especificar</option>
                {BODEGA_OPCIONES.map((b) => (
                  <option key={b.valor} value={b.valor}>
                    {b.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {actividad === "inventario" && estado === "REPORTADO" && bodega === "DISPONIBLE" && (
          <div className="campo">
            <label htmlFor="bodegaPct">Espacio disponible (%)</label>
            <input id="bodegaPct" type="number" min={0} max={100} step={5} value={bodegaPct} onChange={(e) => setBodegaPct(e.target.value)} />
          </div>
        )}

        {actividad === "pistoleo" && estado === "REGISTRADO" && (
          <div className="campo">
            <label htmlFor="conteo">Unidades pistoleadas</label>
            <input id="conteo" type="number" min={0} value={conteo} onChange={(e) => setConteo(e.target.value)} placeholder="Ej. 195" />
          </div>
        )}

        {estado === "AUSENCIA" && (
          <div className="campo">
            <label htmlFor="motivo">Motivo de la ausencia</label>
            <select id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              <option value="">Selecciona…</option>
              {ausencias.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="campo">
          <label htmlFor="link">O el enlace del archivo (Drive, SharePoint)</label>
          <input id="link" type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Opcional, si el archivo pesa más de 15 MB" />
        </div>

        <div className="campo">
          <label htmlFor="nov">Novedades u observaciones</label>
          <textarea id="nov" value={nov} onChange={(e) => setNov(e.target.value)} placeholder="Opcional: qué pasó, qué falta, qué necesitas" />
        </div>

        {error && <div className="error">{error}</div>}
        {ok && <div className="exito">Guardado.</div>}

        <button className="btn btn-p" onClick={guardar} disabled={guardando}>
          Guardar
        </button>

        {registro ? (
          <Adjuntos registroId={registro.id} adjuntos={adjuntos} token={token} />
        ) : (
          <p className="nota-pie">Guarda el estado primero para poder adjuntar archivos.</p>
        )}
      </div>
    </div>
  );
}
