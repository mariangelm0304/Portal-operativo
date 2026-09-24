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

export interface CeldaMatriz {
  semana: number;
  estado: string | null;
  tono: "ok" | "medio" | "falla" | "ausen" | "pend";
  datos: Record<string, unknown>;
  por: string | null;
  actualizado_en: string | null;
}

export interface FilaMatriz {
  id: number;
  ag: string;
  nombre: string;
  zona: string;
  celdas: CeldaMatriz[];
  conteo: number;
  pct: number | null;
}

export interface PuntoSemana {
  semana: number;
  pct: number | null;
}

export interface MatrizActividad {
  semanas: { n: number; info: { lunes: string; domingo: string; festivos: boolean } }[];
  tiendas: FilaMatriz[];
  cumplimiento_semanal: PuntoSemana[] | null;
  ranking: { tienda: string; ag: string; valor: number }[] | null;
  evolucion: PuntoSemana[] | null;
}

export interface ResumenGlobal {
  cumplimiento_global: { pct: number | null; cumple: number; elegibles: number };
  inventario: { pct: number | null; cumple: number; elegibles: number; parcial: number };
  calidad: { pct: number | null; cumple: number; elegibles: number; sin_tecnico: number };
  pistoleo: { conteo: number; cumple: number };
  semanas_por_cerrar: number;
  tiendas_sin_tecnico: number;
  evolucion: PuntoSemana[];
  zonas: { zona: string; pct: number | null; cumple: number; elegibles: number }[];
  rezago: { tienda: string; ag: string; zona: string; pct: number | null; fallas: number; sin_tecnico: number }[];
}

export interface NovedadItem {
  tienda: string;
  actividad: string;
  semana: number;
  nov: string;
  tono: "ok" | "medio" | "falla" | "ausen" | "pend";
  por: string;
}

export interface SesionToken {
  access_token: string;
  token_type: string;
  rol: Rol;
  nombre: string;
  tienda_slug: string | null;
}
