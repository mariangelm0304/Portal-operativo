import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Rol } from "../api/types";

export interface Sesion {
  token: string;
  rol: Rol;
  nombre: string;
  tiendaId: number | null;
  tiendaSlug: string | null;
  tiendaNombre: string | null;
  tiendaAg: string | null;
}

interface AuthContextValue {
  sesion: Sesion | null;
  iniciarSesion: (sesion: Sesion) => void;
  cerrarSesion: () => void;
}

const STORAGE_KEY = "portal_sesion";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function leerSesionGuardada(): Sesion | null {
  try {
    const crudo = sessionStorage.getItem(STORAGE_KEY);
    return crudo ? (JSON.parse(crudo) as Sesion) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => leerSesionGuardada());

  const value = useMemo<AuthContextValue>(
    () => ({
      sesion,
      iniciarSesion: (nueva) => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nueva));
        setSesion(nueva);
      },
      cerrarSesion: () => {
        sessionStorage.removeItem(STORAGE_KEY);
        setSesion(null);
      },
    }),
    [sesion],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
