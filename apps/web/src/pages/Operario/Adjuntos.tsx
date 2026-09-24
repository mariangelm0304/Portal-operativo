import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ApiError, apiFetch, apiUpload } from "../../api/client";
import type { Adjunto, Evidencia } from "../../api/types";

function formatoBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function Adjuntos({
  registroId,
  adjuntos,
  token,
}: {
  registroId: number;
  adjuntos: Adjunto[];
  token: string;
}) {
  const queryClient = useQueryClient();

  // La lista se filtra por registro en el cliente porque el endpoint filtra por
  // tienda/actividad/semana (ya acotado a la tienda de la sesión), no por registro_id.
  const { data: evidenciasDelRegistro, refetch } = useQuery({
    queryKey: ["evidencias-registro", registroId],
    queryFn: async () => {
      const todas = await apiFetch<Evidencia[]>(`/api/v1/evidencias`, { token });
      return todas.filter((e) => e.registro_id === registroId);
    },
  });

  async function subir(ranura: string, archivo: File) {
    await apiUpload<Evidencia>(`/api/v1/evidencias/${registroId}/${ranura}`, token, archivo);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["evidencias-registro", registroId] });
  }

  async function borrar(id: number) {
    await apiFetch(`/api/v1/evidencias/${id}`, { method: "DELETE", token });
    refetch();
  }

  return (
    <div className="campo">
      <label>Adjuntos</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {adjuntos.map((a) =>
          a.multi ? (
            <AdjuntoMultiple
              key={a.clave}
              adjunto={a}
              evidencias={(evidenciasDelRegistro ?? []).filter((e) => e.ranura.startsWith(`${a.clave}-`))}
              onSubir={subir}
              onBorrar={borrar}
            />
          ) : (
            <AdjuntoSimple
              key={a.clave}
              adjunto={a}
              evidencia={(evidenciasDelRegistro ?? []).find((e) => e.ranura === a.clave)}
              onSubir={subir}
              onBorrar={borrar}
            />
          ),
        )}
      </div>
    </div>
  );
}

function AdjuntoSimple({
  adjunto,
  evidencia,
  onSubir,
  onBorrar,
}: {
  adjunto: Adjunto;
  evidencia: Evidencia | undefined;
  onSubir: (ranura: string, archivo: File) => Promise<void>;
  onBorrar: (id: number) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    try {
      await onSubir(adjunto.clave, archivo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir el archivo.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (evidencia) {
    return (
      <div className="adj adj-ok" style={{ cursor: "default", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{adjunto.nombre}</b>
          <span>
            {evidencia.nombre_original} · {formatoBytes(evidencia.tamano_bytes)}
          </span>
        </div>
        <button className="btn btn-sm" onClick={() => onBorrar(evidencia.id)} type="button">
          Quitar
        </button>
      </div>
    );
  }

  return (
    <label className="adj" style={{ display: "block" }}>
      <b>{adjunto.nombre}</b>
      <span>{subiendo ? "Subiendo…" : adjunto.pista}</span>
      <input ref={inputRef} type="file" accept={adjunto.acepta} onChange={alElegir} style={{ display: "none" }} disabled={subiendo} />
      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
    </label>
  );
}

function AdjuntoMultiple({
  adjunto,
  evidencias,
  onSubir,
  onBorrar,
}: {
  adjunto: Adjunto;
  evidencias: Evidencia[];
  onSubir: (ranura: string, archivo: File) => Promise<void>;
  onBorrar: (id: number) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const ranurasUsadas = new Set(evidencias.map((e) => e.ranura));
  const siguienteRanura = () => {
    for (let i = 1; i <= adjunto.maximo; i++) {
      const r = `${adjunto.clave}-${i}`;
      if (!ranurasUsadas.has(r)) return r;
    }
    return null;
  };

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    // Cámara en vivo, una foto a la vez (sin `multiple`): es la misma regla del original
    // (legacy/index-original.html, líneas 1004-1008) para que la evidencia sea fresca y no
    // una foto vieja elegida de la galería.
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const ranura = siguienteRanura();
    if (!ranura) {
      setError(`Ya adjuntaste el máximo de ${adjunto.maximo} fotos.`);
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      await onSubir(ranura, archivo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir el archivo.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="adj-btns">
        <label className="btn btn-p" style={{ cursor: subiendo ? "not-allowed" : "pointer" }}>
          {subiendo ? "Subiendo…" : evidencias.length ? "Tomar otra foto" : "Tomar foto"}
          <input
            ref={inputRef}
            type="file"
            accept={adjunto.acepta}
            capture="environment"
            onChange={alElegir}
            style={{ display: "none" }}
            disabled={subiendo || evidencias.length >= adjunto.maximo}
          />
        </label>
      </div>
      <span style={{ fontSize: 11.5, color: "var(--tenue)" }}>
        {evidencias.length ? `${evidencias.length}/${adjunto.maximo} fotos listas` : adjunto.pista}
      </span>
      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
      <div className="miniaturas">
        {evidencias.map((e) => (
          <figure key={e.id} className="mini">
            <button className="mini-x" onClick={() => onBorrar(e.id)} type="button" aria-label="Quitar">
              ×
            </button>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 6,
                border: "1px solid var(--linea2)",
                display: "grid",
                placeItems: "center",
                fontSize: 10,
                color: "var(--tenue)",
                textAlign: "center",
                padding: 4,
                overflow: "hidden",
              }}
            >
              {e.nombre_original}
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
