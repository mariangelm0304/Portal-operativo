import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError, apiFetch } from "../../api/client";
import type { Actividades, Registro, SemanaInfo } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { Adjuntos } from "./Adjuntos";
import { BODEGA_OPCIONES, ESTADOS_POR_ACTIVIDAD } from "./estadosPorActividad";

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

  const semanaActual = semanasAbiertas?.[0];

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

        {semanaActual != null && actividades && (
          <FormularioSemana
            actividad={actividad}
            tiendaId={tiendaId}
            semana={semanaActual}
            token={sesion.token}
            registro={registroActual}
            adjuntos={actividades[actividad].adjuntos}
            onGuardado={() => queryClient.invalidateQueries({ queryKey: ["registros", actividad, tiendaId] })}
          />
        )}

        <div className="tj">
          <div className="tj-h">
            <h3>Mi historial</h3>
          </div>
          <div className="tj-b">
            {!registros?.length && <div className="vacio">Todavía no hay registros.</div>}
            <div className="lista">
              {registros?.map((r) => (
                <div key={r.id} className="item">
                  <div className="item-b">
                    <div className="item-t">
                      Semana {r.semana} <small>{r.estado}</small>
                    </div>
                    <div className="item-x">Actualizado {new Date(r.actualizado_en).toLocaleString("es-CO")}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
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
  onGuardado,
}: {
  actividad: "inventario" | "calidad" | "pistoleo";
  tiendaId: number;
  semana: number;
  token: string;
  registro: Registro | undefined;
  adjuntos: Actividades[keyof Actividades]["adjuntos"];
  onGuardado: () => void;
}) {
  const [estado, setEstado] = useState(registro?.estado ?? "");
  const [cierre, setCierre] = useState<string>(String(registro?.datos.cierre ?? ""));
  const [bodega, setBodega] = useState<string>(String(registro?.datos.bodega ?? ""));
  const [conteo, setConteo] = useState<string>(String(registro?.datos.conteo ?? ""));
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
      }
      if (actividad === "pistoleo" && estado === "REGISTRADO" && conteo) {
        datos.conteo = Number(conteo);
      }
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
                <option value="">Selecciona…</option>
                {BODEGA_OPCIONES.map((b) => (
                  <option key={b.valor} value={b.valor}>
                    {b.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {actividad === "pistoleo" && estado === "REGISTRADO" && (
          <div className="campo">
            <label htmlFor="conteo">Unidades pistoleadas</label>
            <input id="conteo" type="number" min={0} value={conteo} onChange={(e) => setConteo(e.target.value)} />
          </div>
        )}

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
