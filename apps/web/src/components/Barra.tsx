import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetch } from "../api/client";
import type { Tienda } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useFiltrosAdmin } from "../context/FiltrosAdminContext";

interface Periodo {
  nombre: string;
  semanas: number[];
}

export function Barra() {
  const { sesion, cerrarSesion } = useAuth();
  if (!sesion) return null;

  return (
    <header className="barra">
      <div className="barra-in">
        <div className="marca">
          <span className="marca-log">jamar</span>
          <span className="marca-tx">
            <b>Portal Operativo</b>
            <span>{sesion.rol === "admin" ? "21 tiendas · seguimiento" : `${sesion.tiendaNombre} · AG ${sesion.tiendaAg}`}</span>
          </span>
        </div>
        {sesion.rol === "admin" && (
          <>
            <div className="barra-sep" />
            <FiltrosAdmin token={sesion.token} />
          </>
        )}
        <div className="barra-der">
          <span className="chip cuad e-pend">{sesion.nombre}</span>
          <button className="btn btn-sm" onClick={cerrarSesion}>
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}

function FiltrosAdmin({ token }: { token: string }) {
  const { periodo, semana, zona, setPeriodo, setSemana, setZona } = useFiltrosAdmin();

  const { data: periodos } = useQuery({
    queryKey: ["admin-periodos"],
    queryFn: () => apiFetch<Periodo[]>("/api/v1/admin/periodos", { token }),
  });
  const { data: tiendas } = useQuery({
    queryKey: ["tiendas-admin"],
    queryFn: () => apiFetch<Tienda[]>("/api/v1/tiendas", { token }),
  });

  const zonas = useMemo(() => [...new Set((tiendas ?? []).map((t) => t.zona))], [tiendas]);
  const semanas = useMemo(() => {
    if (!periodos) return [];
    if (periodo === "todas") return periodos.flatMap((p) => p.semanas);
    return periodos.find((p) => p.nombre === periodo)?.semanas ?? [];
  }, [periodos, periodo]);

  return (
    <>
      <div className="campo" style={{ minWidth: 132 }}>
        <label htmlFor="f-periodo">Período</label>
        <select id="f-periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          <option value="todas">Todo el programa</option>
          {periodos?.map((p) => (
            <option key={p.nombre} value={p.nombre}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="campo" style={{ minWidth: 104 }}>
        <label htmlFor="f-semana">Semana</label>
        <select id="f-semana" value={semana} onChange={(e) => setSemana(e.target.value)}>
          <option value="todas">Todas</option>
          {semanas.map((s) => (
            <option key={s} value={s}>
              Semana {s}
            </option>
          ))}
        </select>
      </div>
      <div className="campo" style={{ minWidth: 118 }}>
        <label htmlFor="f-zona">Zona</label>
        <select id="f-zona" value={zona} onChange={(e) => setZona(e.target.value)}>
          <option value="todas">Todas</option>
          {zonas.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
