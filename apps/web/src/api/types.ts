export type Rol = "coordinador" | "tecnico" | "auxiliar" | "admin";

export interface Tienda {
  id: number;
  ag: string;
  nombre: string;
  slug: string;
  zona: string;
  nombre_pistoleo: string;
  verificar: boolean;
  coordinador: string | null;
  estado_coordinador: string;
  tecnico: string | null;
  estado_tecnico: string;
  auxiliar: string | null;
  estado_auxiliar: string;
}

export interface Persona {
  rol: Rol;
  nombre: string;
}

export interface Adjunto {
  clave: string;
  nombre: string;
  acepta: string;
  pista: string;
  multi: boolean;
  maximo: number;
}

export interface DefinicionActividad {
  nombre: string;
  rol: Rol;
  adjuntos: Adjunto[];
}

export type Actividades = Record<"inventario" | "calidad" | "pistoleo", DefinicionActividad>;

export interface Registro {
  id: number;
  actividad: "inventario" | "calidad" | "pistoleo";
  tienda_id: number;
  semana: number;
  estado: string;
  datos: Record<string, unknown>;
  reportado_por: string;
  reportado_rol: string;
  sync_estado: "pendiente" | "ok" | "error";
  creado_en: string;
  actualizado_en: string;
}

export interface SesionToken {
  access_token: string;
  token_type: string;
  rol: Rol;
  nombre: string;
  tienda_slug: string | null;
}
