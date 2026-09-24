import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface FiltrosAdminValue {
  periodo: string;
  semana: string;
  zona: string;
  setPeriodo: (v: string) => void;
  setSemana: (v: string) => void;
  setZona: (v: string) => void;
}

const FiltrosAdminContext = createContext<FiltrosAdminValue | undefined>(undefined);

export function FiltrosAdminProvider({ children }: { children: ReactNode }) {
  const [periodo, setPeriodo] = useState("todas");
  const [semana, setSemana] = useState("todas");
  const [zona, setZona] = useState("todas");

  const value = useMemo(
    () => ({
      periodo,
      semana,
      zona,
      setPeriodo: (v: string) => {
        setPeriodo(v);
        setSemana("todas"); // igual que el original: cambiar de período resetea la semana
      },
      setSemana,
      setZona,
    }),
    [periodo, semana, zona],
  );

  return <FiltrosAdminContext.Provider value={value}>{children}</FiltrosAdminContext.Provider>;
}

export function useFiltrosAdmin(): FiltrosAdminValue {
  const ctx = useContext(FiltrosAdminContext);
  if (!ctx) throw new Error("useFiltrosAdmin debe usarse dentro de <FiltrosAdminProvider>");
  return ctx;
}

// Convierte los filtros a query params, omitiendo los que están en "todas".
export function paramsFiltros(f: Pick<FiltrosAdminValue, "periodo" | "semana" | "zona">): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.periodo !== "todas") out.periodo = f.periodo;
  if (f.semana !== "todas") out.semana = f.semana;
  if (f.zona !== "todas") out.zona = f.zona;
  return out;
}
