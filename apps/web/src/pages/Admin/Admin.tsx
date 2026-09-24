import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import { descargarArchivo } from "../../api/descargar";
import type { AdminConfig, Evidencia, Tienda } from "../../api/types";
import { useAuth } from "../../context/AuthContext";

interface ResumenKPI {
  actividad: string;
  cumplen: number;
  incumplen: number;
  excluyen: number;
  total: number;
  porcentaje_cumplimiento: number;
}

interface Traza {
  id: number;
  actividad: string;
  tienda_nombre: string;
  semana: number;
  estado: string;
  por: string;
  rol: string;
  en: string;
}

interface ResumenEvidencias {
  total: number;
  bytes_totales: number;
  ultima_actualizacion: string | null;
}

const TABS = [
  { id: "resumen", etiqueta: "Resumen" },
  { id: "archivos", etiqueta: "Archivos" },
  { id: "trazas", etiqueta: "Trazabilidad" },
  { id: "maestro", etiqueta: "Maestro y datos" },
] as const;

export function Admin() {
  const { sesion } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("resumen");
  if (!sesion) return null;

  return (
    <div className="contenido">
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
            {t.etiqueta}
          </button>
        ))}
      </div>
      {tab === "resumen" && <TabResumen token={sesion.token} />}
      {tab === "archivos" && <TabArchivos token={sesion.token} />}
      {tab === "trazas" && <TabTrazas token={sesion.token} />}
      {tab === "maestro" && <TabMaestro token={sesion.token} />}
    </div>
  );
}

function TabResumen({ token }: { token: string }) {
  const { data } = useQuery({
    queryKey: ["admin-resumen"],
    queryFn: () => apiFetch<ResumenKPI[]>("/api/v1/admin/resumen", { token }),
  });

  return (
    <div className="kpis">
      {data?.map((k) => (
        <div key={k.actividad} className="kpi a-marca">
          <div className="k-l">{k.actividad}</div>
          <div className="k-v">{k.porcentaje_cumplimiento.toLocaleString("es-CO")}%</div>
          <div className="k-s">
            {k.cumplen} cumplen · {k.incumplen} incumplen · {k.excluyen} excluidos
          </div>
        </div>
      ))}
    </div>
  );
}

function formatoBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function TabArchivos({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [fActividad, setFActividad] = useState("todas");
  const [fZona, setFZona] = useState("todas");
  const [purgando, setPurgando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const { data: resumen } = useQuery({
    queryKey: ["admin-evidencias-resumen"],
    queryFn: () => apiFetch<ResumenEvidencias>("/api/v1/admin/evidencias/resumen", { token }),
  });
  const { data: tiendas } = useQuery({
    queryKey: ["tiendas-admin"],
    queryFn: () => apiFetch<Tienda[]>("/api/v1/tiendas", { token }),
  });
  const { data: evidencias, refetch } = useQuery({
    queryKey: ["admin-evidencias"],
    queryFn: () => apiFetch<Evidencia[]>("/api/v1/evidencias", { token }),
  });

  const zonas = useMemo(() => [...new Set((tiendas ?? []).map((t) => t.zona))], [tiendas]);
  const lista = (evidencias ?? []).filter(
    (e) => (fActividad === "todas" || e.actividad === fActividad) && (fZona === "todas" || e.zona === fZona),
  );

  async function purgar() {
    if (!confirm("¿Borrar del almacenamiento los archivos de semanas anteriores al período de retención? Los registros de cumplimiento no se tocan.")) return;
    setPurgando(true);
    setMensaje(null);
    try {
      const r = await apiFetch<{ borradas: number }>("/api/v1/admin/evidencias/purgar", { method: "POST", token });
      setMensaje(`${r.borradas} archivos liberados.`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-evidencias-resumen"] });
    } catch {
      setMensaje("No se pudo purgar.");
    } finally {
      setPurgando(false);
    }
  }

  async function bajar(evidencia: Evidencia) {
    await descargarArchivo(`/api/v1/evidencias/${evidencia.id}/archivo`, token, evidencia.nombre_original);
  }

  return (
    <>
      <div className="kpis">
        {kpi("marca", "Archivos guardados", resumen?.total ?? "—")}
        {kpi("ok", "Peso subido", resumen ? formatoBytes(resumen.bytes_totales) : "—")}
        {kpi("ausen", "Última actualización", resumen?.ultima_actualizacion ? new Date(resumen.ultima_actualizacion).toLocaleString("es-CO") : "—")}
      </div>
      <div className="tj">
        <div className="tj-h">
          <h3>Archivos subidos</h3>
          <div className="campo" style={{ minWidth: 170 }}>
            <label htmlFor="fa-act">Actividad</label>
            <select id="fa-act" value={fActividad} onChange={(e) => setFActividad(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="inventario">Inventario cíclico</option>
              <option value="calidad">Bitácora de calidad</option>
              <option value="pistoleo">Pistoleo</option>
            </select>
          </div>
          <div className="campo" style={{ minWidth: 130 }}>
            <label htmlFor="fa-zona">Zona</label>
            <select id="fa-zona" value={fZona} onChange={(e) => setFZona(e.target.value)}>
              <option value="todas">Todas</option>
              {zonas.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={() => refetch()}>
            Actualizar
          </button>
          <button className="btn btn-sm" onClick={purgar} disabled={purgando}>
            Purgar antiguos
          </button>
        </div>
        {mensaje && (
          <div className="tj-b" style={{ paddingBottom: 0 }}>
            <div className="aviso">{mensaje}</div>
          </div>
        )}
        {!lista.length ? (
          <div className="vacio">{evidencias?.length ? "Ningún archivo con ese filtro." : "Todavía nadie ha subido archivos."}</div>
        ) : (
          <div className="tabla-env">
            <table className="dat">
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Tienda</th>
                  <th>Actividad</th>
                  <th>Sem.</th>
                  <th className="n">Peso</th>
                  <th>Subió</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <b>{e.nombre_original}</b>
                      <br />
                      <span className="pill">{e.etiqueta}</span>
                    </td>
                    <td>
                      {e.tienda_nombre}
                      <br />
                      <span style={{ fontSize: 10.5, color: "var(--tenue)" }}>{e.zona}</span>
                    </td>
                    <td>{e.actividad}</td>
                    <td className="mono">S{e.semana}</td>
                    <td className="n">{formatoBytes(e.tamano_bytes)}</td>
                    <td>
                      {e.subido_por}
                      <br />
                      <span style={{ fontSize: 10.5, color: "var(--tenue)" }}>{new Date(e.subido_en).toLocaleString("es-CO")}</span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn btn-sm" onClick={() => bajar(e)}>
                        Descargar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function kpi(clase: string, etiqueta: string, valor: string | number) {
  return (
    <div className={`kpi a-${clase}`}>
      <div className="k-l">{etiqueta}</div>
      <div className="k-v">{valor}</div>
    </div>
  );
}

function TabTrazas({ token }: { token: string }) {
  const { data } = useQuery({
    queryKey: ["admin-trazas"],
    queryFn: () => apiFetch<Traza[]>("/api/v1/trazas", { token }),
  });

  return (
    <div className="tj">
      <div className="tj-h">
        <h3>Trazabilidad</h3>
      </div>
      <div className="tabla-env">
        <table className="dat">
          <thead>
            <tr>
              <th>Cuándo</th>
              <th>Tienda</th>
              <th>Actividad</th>
              <th>Semana</th>
              <th>Estado</th>
              <th>Por</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.en).toLocaleString("es-CO")}</td>
                <td>{t.tienda_nombre}</td>
                <td>{t.actividad}</td>
                <td>{t.semana}</td>
                <td>{t.estado}</td>
                <td>
                  {t.por} ({t.rol})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabMaestro({ token }: { token: string }) {
  return (
    <div className="g2">
      <div className="pila">
        <TablaPines token={token} />
        <AlertasDato token={token} />
      </div>
      <div className="pila">
        <ExportarCard token={token} />
        <ConfiguracionCard token={token} />
        <OrigenDatosCard />
      </div>
    </div>
  );
}

function TablaPines({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["tiendas-admin"],
    queryFn: () => apiFetch<Tienda[]>("/api/v1/tiendas", { token }),
  });
  const [nuevos, setNuevos] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function guardarPines() {
    const cambios = Object.entries(nuevos).filter(([, v]) => v.trim().length >= 4);
    if (!cambios.length) {
      setMensaje("Escribe al menos un PIN nuevo de 4 dígitos o más.");
      return;
    }
    setGuardando(true);
    setMensaje(null);
    let ok = 0;
    for (const [slug, pin] of cambios) {
      try {
        await apiFetch("/api/v1/admin/pin-tienda", { method: "POST", token, body: { slug, pin_nuevo: pin.trim() } });
        ok++;
      } catch {
        // se sigue con las demás tiendas aunque una falle
      }
    }
    setGuardando(false);
    setNuevos({});
    setMensaje(`${ok} de ${cambios.length} PIN actualizados.`);
    queryClient.invalidateQueries({ queryKey: ["tiendas-admin"] });
  }

  return (
    <div className="tj">
      <div className="tj-h">
        <h3>Maestro de tiendas</h3>
        <span className="nota">{data?.length ?? 0} tiendas · el AG es la llave contra SAP y Tableau</span>
        <button className="btn btn-sm btn-p" onClick={guardarPines} disabled={guardando}>
          Guardar PIN
        </button>
      </div>
      {mensaje && (
        <div className="tj-b" style={{ paddingBottom: 0 }}>
          <div className="aviso">{mensaje}</div>
        </div>
      )}
      <div className="tabla-env">
        <table className="dat">
          <thead>
            <tr>
              <th>AG</th>
              <th>Tienda</th>
              <th>Zona</th>
              <th>Coordinador</th>
              <th>Técnico</th>
              <th>Auxiliar</th>
              <th>Nuevo PIN</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((t) => (
              <tr key={t.id}>
                <td>{t.ag}</td>
                <td>
                  <b>{t.nombre}</b>
                  {t.verificar && (
                    <span className="pill" title="Cruce con el nombre de Tableau pendiente de confirmar" style={{ marginLeft: 6 }}>
                      verificar
                    </span>
                  )}
                </td>
                <td>{t.zona}</td>
                <td>{t.coordinador ?? <span className="chip e-falla">Sin asignar</span>}</td>
                <td>{t.tecnico ?? <span className="chip e-falla">Sin asignar</span>}</td>
                <td>{t.auxiliar ?? <span className="chip e-pend">Auxiliar de piso</span>}</td>
                <td>
                  <input
                    type="text"
                    className="mono"
                    style={{ width: 90, padding: "4px 6px", textAlign: "center" }}
                    placeholder="····"
                    maxLength={8}
                    value={nuevos[t.slug] ?? ""}
                    onChange={(e) => setNuevos((prev) => ({ ...prev, [t.slug]: e.target.value }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertasDato({ token }: { token: string }) {
  const { data } = useQuery({
    queryKey: ["admin-alertas"],
    queryFn: () => apiFetch<string[]>("/api/v1/admin/alertas", { token }),
  });

  return (
    <div className="tj">
      <div className="tj-h">
        <h3>Revisiones pendientes del dato</h3>
        <span className="nota">{data?.length ?? 0} hallazgos de la migración</span>
      </div>
      <div className="tj-b">
        {data?.map((a, i) => {
          const idx = a.indexOf(":");
          return (
            <div key={i} className="alerta-dato">
              <b>{a.slice(0, idx)}</b>
              <span>{a.slice(idx + 1).trim()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExportarCard({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);

  async function bajar(tipo: "csv" | "json") {
    setError(null);
    try {
      const hoy = new Date().toLocaleDateString("sv-SE");
      await descargarArchivo(`/api/v1/export/${tipo}`, token, `portal-operativo-${hoy}.${tipo}`);
    } catch {
      setError("No se pudo descargar el archivo.");
    }
  }

  return (
    <div className="tj">
      <div className="tj-h">
        <h3>Exportar</h3>
      </div>
      <div className="tj-b" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <button className="btn" onClick={() => bajar("csv")}>
          Descargar CSV consolidado
        </button>
        <button className="btn" onClick={() => bajar("json")}>
          Descargar respaldo JSON
        </button>
        {error && <div className="error">{error}</div>}
        <p className="nota-pie">Una fila por tienda, actividad y semana, con estado, fecha, quién reportó y la novedad.</p>
      </div>
    </div>
  );
}

function ConfiguracionCard({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["admin-config"],
    queryFn: () => apiFetch<AdminConfig>("/api/v1/admin/config", { token }),
  });

  const [retencion, setRetencion] = useState<number | null>(null);
  const [pinActual, setPinActual] = useState("");
  const [pinNuevo, setPinNuevo] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errorPin, setErrorPin] = useState<string | null>(null);

  async function guardarRetencion() {
    const valor = retencion ?? config?.retencion_semanas ?? 3;
    await apiFetch("/api/v1/admin/config", { method: "PUT", token, body: { retencion_semanas: valor } });
    setMensaje("Configuración guardada.");
    queryClient.invalidateQueries({ queryKey: ["admin-config"] });
  }

  async function cambiarPinAdmin() {
    setErrorPin(null);
    if (pinNuevo.length < 4) {
      setErrorPin("La clave nueva debe tener al menos 4 caracteres.");
      return;
    }
    try {
      await apiFetch("/api/v1/admin/pin-admin", {
        method: "POST",
        token,
        body: { pin_actual: pinActual, pin_nuevo: pinNuevo },
      });
      setPinActual("");
      setPinNuevo("");
      setMensaje("Clave de administrador actualizada.");
    } catch (e) {
      setErrorPin(e instanceof ApiError ? e.message : "No se pudo cambiar la clave.");
    }
  }

  return (
    <div className="tj">
      <div className="tj-h">
        <h3>Configuración</h3>
      </div>
      <div className="tj-b" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <div className="campo">
          <label htmlFor="pin-actual">Clave de administrador actual</label>
          <input id="pin-actual" type="password" value={pinActual} onChange={(e) => setPinActual(e.target.value)} autoComplete="off" />
        </div>
        <div className="campo">
          <label htmlFor="pin-nuevo">Clave nueva</label>
          <input id="pin-nuevo" type="password" value={pinNuevo} onChange={(e) => setPinNuevo(e.target.value)} autoComplete="off" />
        </div>
        {errorPin && <div className="error">{errorPin}</div>}
        <button className="btn" onClick={cambiarPinAdmin}>
          Cambiar clave de administrador
        </button>

        <div className="campo">
          <label htmlFor="retencion">Semanas de evidencias que conserva el portal</label>
          <select
            id="retencion"
            value={retencion ?? config?.retencion_semanas ?? 3}
            onChange={(e) => setRetencion(Number(e.target.value))}
          >
            {[2, 4, 6, 8, 12].map((n) => (
              <option key={n} value={n}>
                {n} semanas
              </option>
            ))}
          </select>
        </div>
        <button className="btn" onClick={guardarRetencion}>
          Guardar configuración
        </button>

        {mensaje && <div className="exito">{mensaje}</div>}
        <div className="aviso">Cambia la clave de administrador y los PIN de tienda antes de repartir el enlace.</div>
      </div>
    </div>
  );
}

function OrigenDatosCard() {
  return (
    <div className="tj">
      <div className="tj-h">
        <h3>Origen de los datos</h3>
      </div>
      <div className="tj-b nota-pie">
        La línea base se importó una sola vez desde el portal original (Google Apps Script + Sheets/Drive) a
        Postgres — ver <span className="mono">apps/api/scripts/seed_from_base.py</span>. Desde entonces, cada
        registro nuevo se guarda directo en este backend. Los PIN de tienda y de administrador se reiniciaron a
        sus valores por defecto durante la migración; cámbialos desde esta pestaña antes de repartir el enlace.
      </div>
    </div>
  );
}
