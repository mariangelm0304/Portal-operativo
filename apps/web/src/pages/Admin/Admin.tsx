import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "../../api/client";
import type { Tienda } from "../../api/types";
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

const TABS = [
  { id: "resumen", etiqueta: "Resumen" },
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
  const { data } = useQuery({
    queryKey: ["tiendas-admin"],
    queryFn: () => apiFetch<Tienda[]>("/api/v1/tiendas", { token }),
  });

  return (
    <div className="tj">
      <div className="tj-h">
        <h3>Maestro de tiendas</h3>
        <span className="nota">{data?.length ?? 0} tiendas</span>
      </div>
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
            </tr>
          </thead>
          <tbody>
            {data?.map((t) => (
              <tr key={t.id}>
                <td>{t.ag}</td>
                <td>{t.nombre}</td>
                <td>{t.zona}</td>
                <td>{t.coordinador ?? "—"}</td>
                <td>{t.tecnico ?? "—"}</td>
                <td>{t.auxiliar ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
