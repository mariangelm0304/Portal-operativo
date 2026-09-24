import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiFetch, ApiError } from "../../api/client";
import { descargarArchivo } from "../../api/descargar";
import type { AdminConfig, Evidencia, MatrizActividad, NovedadItem, ResumenGlobal, Tienda } from "../../api/types";
import { GraficoLinea } from "../../components/GraficoLinea";
import { Matriz } from "../../components/Matriz";
import { useAuth } from "../../context/AuthContext";
import { paramsFiltros, useFiltrosAdmin } from "../../context/FiltrosAdminContext";

function pct1(n: number | null): string {
  if (n == null) return "—";
  return `${(Math.round(n * 10) / 10).toFixed(1).replace(".", ",")} %`;
}

function tonoPct(p: number | null): "ok" | "medio" | "falla" | "pend" {
  if (p == null) return "pend";
  if (p >= 90) return "ok";
  if (p >= 75) return "medio";
  return "falla";
}

function qs(params: Record<string, string>): string {
  const s = new URLSearchParams(params).toString();
  return s ? `?${s}` : "";
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
  evidencias: { id: number; nombre_original: string }[];
  link: string | null;
}

interface ResumenTrazas {
  registros_portal: number;
  con_evidencia: number;
  personas: number;
  historicos_migrados: number;
}

interface PersonaTop {
  nombre: string;
  cantidad: number;
}

interface ResumenEvidencias {
  total: number;
  bytes_totales: number;
  ultima_actualizacion: string | null;
}

const TABS = [
  { id: "resumen", etiqueta: "Resumen" },
  { id: "inventario", etiqueta: "Inventario cíclico" },
  { id: "calidad", etiqueta: "Bitácora de calidad" },
  { id: "pistoleo", etiqueta: "Pistoleo" },
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
      {(tab === "inventario" || tab === "calidad" || tab === "pistoleo") && <TabActividad actividad={tab} token={sesion.token} />}
      {tab === "archivos" && <TabArchivos token={sesion.token} />}
      {tab === "trazas" && <TabTrazas token={sesion.token} />}
      {tab === "maestro" && <TabMaestro token={sesion.token} />}
    </div>
  );
}

function TabResumen({ token }: { token: string }) {
  const filtros = useFiltrosAdmin();
  const params = paramsFiltros(filtros);
  const { data } = useQuery({
    queryKey: ["admin-resumen-global", params],
    queryFn: () => apiFetch<ResumenGlobal>(`/api/v1/admin/resumen/global${qs(params)}`, { token }),
  });
  const { data: novedades } = useQuery({
    queryKey: ["admin-novedades", params],
    queryFn: () => apiFetch<NovedadItem[]>(`/api/v1/admin/novedades${qs(params)}`, { token }),
  });

  if (!data) return null;

  return (
    <>
      <div className="kpis">
        <div className={`kpi a-${tonoPct(data.cumplimiento_global.pct)}`}>
          <div className="k-l">Cumplimiento global</div>
          <div className="k-v">{pct1(data.cumplimiento_global.pct)}</div>
          <div className="k-s">
            {data.cumplimiento_global.cumple} de {data.cumplimiento_global.elegibles} actividades exigibles
          </div>
        </div>
        <div className="kpi a-ok">
          <div className="k-l">Inventario cíclico</div>
          <div className="k-v">{pct1(data.inventario.pct)}</div>
          <div className="k-s">{data.inventario.parcial} con cierre parcial</div>
        </div>
        <div className="kpi a-ok">
          <div className="k-l">Bitácora de calidad</div>
          <div className="k-v">{pct1(data.calidad.pct)}</div>
          <div className="k-s">{data.calidad.sin_tecnico} celdas sin técnico</div>
        </div>
        <div className="kpi a-marca">
          <div className="k-l">Unidades pistoleadas</div>
          <div className="k-v">{data.pistoleo.conteo.toLocaleString("es-CO")}</div>
          <div className="k-s">{data.pistoleo.cumple} registros de conteo</div>
        </div>
        <div className={`kpi a-${data.semanas_por_cerrar ? "medio" : "ok"}`}>
          <div className="k-l">Semanas por cerrar</div>
          <div className="k-v">{data.semanas_por_cerrar}</div>
          <div className="k-s">celdas aún en pendiente</div>
        </div>
        <div className={`kpi a-${data.tiendas_sin_tecnico ? "falla" : "ok"}`}>
          <div className="k-l">Tiendas sin técnico</div>
          <div className="k-v">{data.tiendas_sin_tecnico}</div>
          <div className="k-s">de 21 tiendas del programa</div>
        </div>
      </div>
      <div className="g2">
        <div className="pila">
          <div className="tj">
            <div className="tj-h">
              <h3>Cumplimiento semanal</h3>
              <span className="nota">{filtros.periodo === "todas" ? "Todo el programa" : filtros.periodo} · inventario + bitácora</span>
            </div>
            <div className="tj-b">
              <GraficoLinea puntos={data.evolucion.map((e) => e.pct)} etiquetas={data.evolucion.map((e) => `S${e.semana}`)} />
            </div>
          </div>
          <div className="tj">
            <div className="tj-h">
              <h3>Tiendas que necesitan gestión</h3>
              <span className="nota">{data.rezago.length} tiendas</span>
            </div>
            <div className="tj-b" style={{ padding: 0 }}>
              {data.rezago.length ? (
                <div className="tabla-env">
                  <table className="dat">
                    <thead>
                      <tr>
                        <th>Tienda</th>
                        <th>Zona</th>
                        <th>Cumplimiento</th>
                        <th className="n">Reportes faltantes</th>
                        <th className="n">Semanas sin técnico</th>
                        <th>Motivo principal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rezago.map((r) => (
                        <tr key={r.ag}>
                          <td>
                            <b>{r.tienda}</b> <span className="mono" style={{ color: "var(--tenue)", fontSize: 10 }}>{r.ag}</span>
                          </td>
                          <td>{r.zona}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <Barrita pct={r.pct ?? 0} tono={tonoPct(r.pct)} />
                              <span className="mono" style={{ fontSize: 11.5 }}>
                                {r.pct == null ? "—" : `${Math.round(r.pct)}%`}
                              </span>
                            </div>
                          </td>
                          <td className="n">{r.fallas || "—"}</td>
                          <td className="n">{r.sin_tecnico || "—"}</td>
                          <td>
                            {r.sin_tecnico ? (
                              <span className="chip e-falla">Sin técnico asignado</span>
                            ) : r.fallas ? (
                              <span className="chip e-medio">Reportes faltantes</span>
                            ) : (
                              <span className="chip e-pend">En curso</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="vacio">Todas las tiendas del filtro están al día.</div>
              )}
            </div>
          </div>
        </div>
        <div className="pila">
          <div className="tj">
            <div className="tj-h">
              <h3>Por zona</h3>
            </div>
            <div className="tj-b">
              <div className="lista">
                {data.zonas.map((z) => (
                  <div key={z.zona} className="item">
                    <div className="item-b">
                      <div className="item-t">
                        {z.zona} <small style={{ marginLeft: "auto" }}>{pct1(z.pct)}</small>
                      </div>
                      <div style={{ marginTop: 5 }}>
                        <Barrita pct={z.pct ?? 0} tono={tonoPct(z.pct)} />
                      </div>
                      <div className="item-x" style={{ fontSize: 11 }}>
                        {z.cumple} de {z.elegibles} actividades cumplidas
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="tj">
            <div className="tj-h">
              <h3>Novedades</h3>
              <span className="nota">período filtrado</span>
            </div>
            <div className="tj-b" style={{ padding: "0 15px" }}>
              <NovedadesList novedades={novedades} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Barrita({ pct, tono }: { pct: number; tono: "ok" | "medio" | "falla" | "pend" }) {
  return (
    <div className="barrita">
      <i style={{ width: `${Math.max(2, pct)}%`, background: `var(--${tono})` }} />
    </div>
  );
}

function NovedadesList({ novedades }: { novedades: NovedadItem[] | undefined }) {
  if (!novedades?.length) return <div className="vacio">Sin novedades reportadas en el período.</div>;
  return (
    <div className="lista">
      {novedades.map((n, i) => (
        <div key={i} className="item">
          <div className="raya" style={{ background: `var(--${n.tono === "pend" ? "pend" : n.tono})` }} />
          <div className="item-b">
            <div className="item-t">
              {n.tienda} <small>{n.actividad} · S{n.semana}{n.por ? ` · ${n.por}` : ""}</small>
            </div>
            <div className="item-x">{n.nov}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabActividad({ actividad, token }: { actividad: "inventario" | "calidad" | "pistoleo"; token: string }) {
  const filtros = useFiltrosAdmin();
  const params = paramsFiltros(filtros);
  const { data: matriz } = useQuery({
    queryKey: ["admin-matriz", actividad, params],
    queryFn: () => apiFetch<MatrizActividad>(`/api/v1/admin/matriz/${actividad}${qs(params)}`, { token }),
  });
  const { data: novedades } = useQuery({
    queryKey: ["admin-novedades", actividad, params],
    queryFn: () => apiFetch<NovedadItem[]>(`/api/v1/admin/novedades${qs({ ...params, actividad })}`, { token }),
  });

  if (!matriz) return null;

  const cumple = matriz.tiendas.reduce((a, f) => a + f.celdas.filter((c) => c.tono === "ok" || c.tono === "medio").length, 0);
  const incumple = matriz.tiendas.reduce((a, f) => a + f.celdas.filter((c) => c.tono === "falla").length, 0);
  const ausencias = matriz.tiendas.reduce((a, f) => a + f.celdas.filter((c) => c.tono === "ausen").length, 0);
  const pendientes = matriz.tiendas.reduce((a, f) => a + f.celdas.filter((c) => c.tono === "pend").length, 0);
  const sinTecnico = matriz.tiendas.filter((f) => actividad === "calidad" && f.celdas.some((c) => c.estado === "SIN_TECNICO")).length;
  const pctPromedio = matriz.cumplimiento_semanal?.length
    ? matriz.cumplimiento_semanal.reduce((a, p) => a + (p.pct ?? 0), 0) / matriz.cumplimiento_semanal.length
    : null;

  return (
    <>
      <div className="kpis">
        {actividad === "pistoleo" ? (
          <div className="kpi a-marca">
            <div className="k-l">Unidades pistoleadas</div>
            <div className="k-v">{matriz.tiendas.reduce((a, f) => a + f.conteo, 0).toLocaleString("es-CO")}</div>
            <div className="k-s">{cumple} registros semanales</div>
          </div>
        ) : (
          <div className={`kpi a-${tonoPct(pctPromedio)}`}>
            <div className="k-l">Cumplimiento</div>
            <div className="k-v">{pct1(pctPromedio)}</div>
          </div>
        )}
        <div className="kpi a-ok">
          <div className="k-l">Cumplidas</div>
          <div className="k-v">{cumple}</div>
        </div>
        <div className={`kpi a-${incumple ? "falla" : "ok"}`}>
          <div className="k-l">Sin cumplir</div>
          <div className="k-v">{incumple}</div>
          <div className="k-s">reportes que no llegaron</div>
        </div>
        <div className="kpi a-ausen">
          <div className="k-l">Ausencias justificadas</div>
          <div className="k-v">{ausencias}</div>
          <div className="k-s">excluidas del cálculo</div>
        </div>
        <div className="kpi a-medio">
          <div className="k-l">Pendientes</div>
          <div className="k-v">{pendientes}</div>
          <div className="k-s">semanas aún abiertas</div>
        </div>
        {actividad === "calidad" && (
          <div className={`kpi a-${sinTecnico ? "falla" : "ok"}`}>
            <div className="k-l">Sin técnico</div>
            <div className="k-v">{sinTecnico}</div>
            <div className="k-s">tiendas sin responsable</div>
          </div>
        )}
      </div>
      <div className="tj" style={{ marginBottom: 14 }}>
        <div className="tj-h">
          <h3>Matriz tienda × semana</h3>
          <span className="nota">{matriz.tiendas.length} tiendas · {matriz.semanas.length} semanas</span>
        </div>
        <Matriz actividad={actividad} matriz={matriz} />
      </div>
      <div className="g2">
        <div className="tj">
          <div className="tj-h">
            <h3>{actividad === "pistoleo" ? "Ranking de conteo" : "Evolución del cumplimiento"}</h3>
          </div>
          <div className="tj-b" style={matriz.ranking ? { padding: 0 } : undefined}>
            {matriz.ranking ? (
              <div className="tabla-env">
                <table className="dat">
                  <thead>
                    <tr>
                      <th>AG</th>
                      <th>Tienda</th>
                      <th>Unidades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matriz.ranking.map((r) => (
                      <tr key={r.ag}>
                        <td className="mono" style={{ color: "var(--tenue)" }}>{r.ag}</td>
                        <td>{r.tienda}</td>
                        <td className="mono">{r.valor.toLocaleString("es-CO")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <GraficoLinea
                puntos={(matriz.evolucion ?? []).map((e) => e.pct)}
                etiquetas={(matriz.evolucion ?? []).map((e) => `S${e.semana}`)}
                alto={150}
              />
            )}
          </div>
        </div>
        <div className="tj">
          <div className="tj-h">
            <h3>Novedades</h3>
          </div>
          <div className="tj-b" style={{ padding: "0 15px" }}>
            <NovedadesList novedades={novedades} />
          </div>
        </div>
      </div>
    </>
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
  const { data: resumen } = useQuery({
    queryKey: ["admin-trazas-resumen"],
    queryFn: () => apiFetch<ResumenTrazas>("/api/v1/trazas/resumen", { token }),
  });
  const { data: top } = useQuery({
    queryKey: ["admin-trazas-top"],
    queryFn: () => apiFetch<PersonaTop[]>("/api/v1/trazas/top-personas", { token }),
  });

  async function bajarEvidencia(id: number, nombre: string) {
    await descargarArchivo(`/api/v1/evidencias/${id}/archivo`, token, nombre);
  }

  return (
    <>
      <div className="kpis">
        <div className="kpi a-marca">
          <div className="k-l">Registros desde el portal</div>
          <div className="k-v">{resumen?.registros_portal ?? "—"}</div>
          <div className="k-s">con nombre, fecha y hora</div>
        </div>
        <div className="kpi a-ok">
          <div className="k-l">Con evidencia adjunta</div>
          <div className="k-v">{resumen?.con_evidencia ?? "—"}</div>
          <div className="k-s">
            {resumen?.registros_portal ? `${Math.round((resumen.con_evidencia / resumen.registros_portal) * 100)} % de los registros` : ""}
          </div>
        </div>
        <div className="kpi a-ausen">
          <div className="k-l">Personas que han registrado</div>
          <div className="k-v">{resumen?.personas ?? "—"}</div>
          <div className="k-s">de las 21 tiendas</div>
        </div>
        <div className="kpi a-medio">
          <div className="k-l">Registros históricos migrados</div>
          <div className="k-v">{resumen?.historicos_migrados ?? "—"}</div>
          <div className="k-s">del tablero anterior, sin sello de hora</div>
        </div>
      </div>
      <div className="g2">
        <div className="tj">
          <div className="tj-h">
            <h3>Registros del portal</h3>
            <span className="nota">más recientes primero</span>
          </div>
          <div className="tj-b" style={{ padding: 0 }}>
            {data?.length ? (
              <div className="tabla-env">
                <table className="dat">
                  <thead>
                    <tr>
                      <th>Enviado</th>
                      <th>Tienda</th>
                      <th>Actividad</th>
                      <th>Sem.</th>
                      <th>Estado</th>
                      <th>Quién</th>
                      <th>Evidencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((t) => (
                      <tr key={t.id}>
                        <td className="mono" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                          {new Date(t.en).toLocaleString("es-CO")}
                        </td>
                        <td>
                          <b>{t.tienda_nombre}</b>
                        </td>
                        <td>{t.actividad}</td>
                        <td className="mono">S{t.semana}</td>
                        <td>
                          <span className="chip e-pend">{t.estado}</span>
                        </td>
                        <td>
                          {t.por}
                          <br />
                          <span style={{ fontSize: 10.5, color: "var(--tenue)" }}>{t.rol}</span>
                        </td>
                        <td>
                          {t.evidencias.length ? (
                            t.evidencias.map((e) => (
                              <button key={e.id} className="btn btn-sm" style={{ margin: "1px 0", display: "block" }} onClick={() => bajarEvidencia(e.id, e.nombre_original)}>
                                {e.nombre_original.slice(0, 20)}
                              </button>
                            ))
                          ) : t.link ? (
                            <a href={t.link} target="_blank" rel="noopener" className="pill">
                              enlace externo
                            </a>
                          ) : (
                            <span style={{ color: "var(--tenue)" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="vacio">Todavía nadie ha registrado desde el portal.</div>
            )}
          </div>
        </div>
        <div className="pila">
          <div className="tj">
            <div className="tj-h">
              <h3>Quién más reporta</h3>
            </div>
            <div className="tj-b">
              {top?.length ? (
                <div className="lista">
                  {top.map((p) => (
                    <div key={p.nombre} className="item">
                      <div className="item-b">
                        <div className="item-t">
                          {p.nombre}
                          <small style={{ marginLeft: "auto" }}>{p.cantidad}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="vacio">Aún sin registros.</div>
              )}
            </div>
          </div>
          <div className="tj">
            <div className="tj-h">
              <h3>Qué cambia con el portal</h3>
            </div>
            <div className="tj-b nota-pie">
              Cada registro guarda quién lo hizo, desde qué tienda, para qué semana y a qué hora exacta — a
              diferencia del portal original, esta traza la arma el servidor a partir de la sesión autenticada,
              no el navegador. El histórico migrado conserva el nombre del responsable de cada tienda, pero no
              la hora de envío, porque el tablero anterior no la capturaba.
            </div>
          </div>
        </div>
      </div>
    </>
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
