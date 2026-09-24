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

export type MapaActividades = Record<"inventario" | "calidad" | "pistoleo", DefinicionActividad>;

export interface Actividades {
  ausencias: string[];
  actividades: MapaActividades;
}

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

export interface Evidencia {
  id: number;
  registro_id: number;
  ranura: string;
  etiqueta: string;
  nombre_original: string;
  tipo_mime: string;
  tamano_bytes: number;
  subido_por: string;
  subido_en: string;
  sync_estado: "pendiente" | "ok" | "error";
  tienda_nombre: string;
  zona: string;
  actividad: string;
  semana: number;
}

export interface Festivo {
  fecha: string;
  nombre: string;
}

export interface SemanaInfo {
  n: number;
  lunes: string;
  domingo: string;
  mes: string;
  festivos: Festivo[];
}

export interface AdminConfig {
  retencion_semanas: number;
}

export interface SesionToken {
  access_token: string;
  token_type: string;
  rol: Rol;
  nombre: string;
  tienda_slug: string | null;
}
