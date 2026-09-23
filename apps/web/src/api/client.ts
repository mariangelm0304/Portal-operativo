const BASE_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface Opciones {
  token?: string | null;
  method?: string;
  body?: unknown;
}

export async function apiFetch<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opciones.body !== undefined) headers["Content-Type"] = "application/json";
  if (opciones.token) headers["Authorization"] = `Bearer ${opciones.token}`;

  const res = await fetch(`${BASE_URL}${ruta}`, {
    method: opciones.method ?? "GET",
    headers,
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
  });

  if (!res.ok) {
    const detalle = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, detalle.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiUpload<T>(ruta: string, token: string, archivo: File): Promise<T> {
  const form = new FormData();
  form.append("archivo", archivo);
  const res = await fetch(`${BASE_URL}${ruta}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const detalle = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, detalle.detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}
