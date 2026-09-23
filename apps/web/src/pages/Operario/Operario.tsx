import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError, apiFetch } from "../../api/client";
import type { Registro } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { BODEGA_OPCIONES, ESTADOS_POR_ACTIVIDAD } from "./estadosPorActividad";

const ACTIVIDAD_POR_ROL: Record<string, "inventario" | "calidad" | "pistoleo"> = {
  coordinador: "inventario",
  tecnico: "calidad",
  auxiliar: "pistoleo",
};

export function Operario() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  if (!sesion || !sesion.tiendaId) return null;

  const actividad = ACTIVIDAD_POR_ROL[sesion.rol];

  const { data: semanasAbiertas } = useQuery({
    queryKey: ["semanas-abiertas", actividad, sesion.tiendaId],
    queryFn: () =>
      apiFetch<number[]>(`/api/v1/registros/semanas-abiertas?actividad=${actividad}&tienda_id=${sesion.tiendaId}`, {
        token: sesion.token,
      }),
  });

  const { data: registros } = useQuery({
    queryKey: ["registros", actividad, sesion.tiendaId],
    queryFn: () => apiFetch<Registro[]>(`/api/v1/registros?actividad=${actividad}`, { token: sesion.token }),
  });

  const semanaActual = semanasAbiertas?.[0];
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
          </div>
        </div>

        {semanaActual != null && (
          <FormularioSemana
            actividad={actividad}
            tiendaId={sesion.tiendaId}
            semana={semanaActual}
            token={sesion.token}
            registro={registroActual}
            onGuardado={() => queryClient.invalidateQueries({ queryKey: ["registros", actividad, sesion.tiendaId] })}
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
  onGuardado,
}: {
  actividad: "inventario" | "calidad" | "pistoleo";
  tiendaId: number;
  semana: number;
  token: string;
  registro: Registro | undefined;
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
      </div>
    </div>
  );
}
