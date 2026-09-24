import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ApiError, apiFetch } from "../../api/client";
import type { Persona, SesionToken, Tienda } from "../../api/types";
import { useAuth } from "../../context/AuthContext";

type OpcionPersona =
  | { tipo: "responsable"; rol: "coordinador" | "tecnico"; nombre: string }
  | { tipo: "auxiliar-generico" }
  | { tipo: "nueva" };

export function Ingreso() {
  const { iniciarSesion } = useAuth();
  const { data: tiendas } = useQuery({
    queryKey: ["tiendas"],
    queryFn: () => apiFetch<Tienda[]>("/api/v1/tiendas"),
  });

  const [slug, setSlug] = useState("");
  const [opcion, setOpcion] = useState("");
  const [nombreAuxiliar, setNombreAuxiliar] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [rolNuevo, setRolNuevo] = useState<"coordinador" | "tecnico">("coordinador");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrarAdmin, setMostrarAdmin] = useState(false);
  const [pinAdmin, setPinAdmin] = useState("");
  const [errorAdmin, setErrorAdmin] = useState<string | null>(null);

  const tienda = useMemo(() => tiendas?.find((t) => t.slug === slug) ?? null, [tiendas, slug]);

  const { data: personas } = useQuery({
    queryKey: ["personas", slug],
    queryFn: () => apiFetch<Persona[]>(`/api/v1/tiendas/${slug}/personas`),
    enabled: !!slug,
  });

  const zonas = useMemo(() => {
    if (!tiendas) return [];
    const mapa = new Map<string, Tienda[]>();
    for (const t of tiendas) {
      if (!mapa.has(t.zona)) mapa.set(t.zona, []);
      mapa.get(t.zona)!.push(t);
    }
    return [...mapa.entries()];
  }, [tiendas]);

  const opciones: { valor: string; etiqueta: string; data: OpcionPersona }[] = useMemo(() => {
    if (!tienda) return [];
    const out: { valor: string; etiqueta: string; data: OpcionPersona }[] = [];
    if (tienda.coordinador) {
      out.push({
        valor: "coordinador",
        etiqueta: `${tienda.coordinador} — Coordinador de tienda`,
        data: { tipo: "responsable", rol: "coordinador", nombre: tienda.coordinador },
      });
    }
    if (tienda.tecnico) {
      out.push({
        valor: "tecnico",
        etiqueta: `${tienda.tecnico} — Técnico de calidad`,
        data: { tipo: "responsable", rol: "tecnico", nombre: tienda.tecnico },
      });
    }
    for (const p of personas ?? []) {
      if (p.rol === "coordinador" || p.rol === "tecnico") {
        out.push({
          valor: `persona:${p.rol}:${p.nombre}`,
          etiqueta: `${p.nombre} — ${p.rol === "coordinador" ? "Coordinador de tienda" : "Técnico de calidad"}`,
          data: { tipo: "responsable", rol: p.rol, nombre: p.nombre },
        });
      }
    }
    out.push({ valor: "aux", etiqueta: `Auxiliar de piso — ${tienda.nombre}`, data: { tipo: "auxiliar-generico" } });
    out.push({ valor: "nuevo", etiqueta: "No estoy en la lista…", data: { tipo: "nueva" } });
    return out;
  }, [tienda, personas]);

  async function entrar() {
    setError(null);
    if (!tienda) return setError("Elige tu tienda para continuar.");
    const elegida = opciones.find((o) => o.valor === opcion)?.data;
    if (!elegida) return setError("Elige tu nombre en la lista.");
    if (!pin.trim()) return setError("Escribe el PIN de la tienda.");

    setEnviando(true);
    try {
      let token: SesionToken;
      if (elegida.tipo === "responsable") {
        token = await apiFetch<SesionToken>("/api/v1/auth/login", {
          method: "POST",
          body: { slug: tienda.slug, rol: elegida.rol, nombre: elegida.nombre, pin },
        });
      } else if (elegida.tipo === "auxiliar-generico") {
        token = await apiFetch<SesionToken>("/api/v1/auth/login", {
          method: "POST",
          body: { slug: tienda.slug, rol: "auxiliar", nombre: nombreAuxiliar.trim() || "Auxiliar de piso", pin },
        });
      } else {
        if (nombreNuevo.trim().length < 4) {
          setEnviando(false);
          return setError("Escribe tu nombre completo.");
        }
        token = await apiFetch<SesionToken>("/api/v1/auth/alta-persona", {
          method: "POST",
          body: { slug: tienda.slug, pin, rol: rolNuevo, nombre: nombreNuevo.trim() },
        });
      }
      iniciarSesion({
        token: token.access_token,
        rol: token.rol,
        nombre: token.nombre,
        tiendaId: tienda.id,
        tiendaSlug: tienda.slug,
        tiendaNombre: tienda.nombre,
        tiendaAg: tienda.ag,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  async function entrarAdmin() {
    setErrorAdmin(null);
    try {
      const token = await apiFetch<SesionToken>("/api/v1/auth/login-admin", { method: "POST", body: { pin: pinAdmin } });
      iniciarSesion({
        token: token.access_token,
        rol: token.rol,
        nombre: token.nombre,
        tiendaId: null,
        tiendaSlug: null,
        tiendaNombre: null,
        tiendaAg: null,
      });
    } catch (e) {
      setErrorAdmin(e instanceof ApiError ? e.message : "No se pudo conectar con el servidor.");
    }
  }

  return (
    <div className="ingreso">
      <div className="ingreso-h">
        <span className="marca-log">jamar</span>
        <h1>Portal Operativo</h1>
        <p>Inventario cíclico, bitácora de calidad y pistoleo · 21 tiendas</p>
      </div>

      <div className="tj">
        <div className="tj-b">
          <div className="campo">
            <label htmlFor="i-tienda">Tienda</label>
            <select
              id="i-tienda"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setOpcion("");
              }}
            >
              <option value="">Selecciona tu tienda…</option>
              {zonas.map(([zona, lista]) => (
                <optgroup key={zona} label={zona}>
                  {lista.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.nombre} · AG {t.ag}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="i-persona">Quién eres</label>
            <select id="i-persona" value={opcion} onChange={(e) => setOpcion(e.target.value)} disabled={!slug}>
              <option value="">{slug ? "Selecciona tu nombre…" : "Primero elige la tienda"}</option>
              {opciones.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </div>

          {/* Visible siempre, igual que el original (legacy/index-original.html, línea
              374): solo se manda al backend cuando aplica ("Auxiliar de piso"), pero el
              campo en sí no se esconde según la persona elegida. */}
          <div className="campo">
            <label htmlFor="i-nombre">
              Tu nombre <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              id="i-nombre"
              type="text"
              value={nombreAuxiliar}
              onChange={(e) => setNombreAuxiliar(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && document.getElementById("i-pin")?.focus()}
              placeholder="Para que el registro quede a tu nombre"
            />
          </div>

          {opciones.find((o) => o.valor === opcion)?.data.tipo === "nueva" && (
            <>
              <div className="campo">
                <label htmlFor="n-nombre">Nombre completo</label>
                <input id="n-nombre" type="text" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor="n-rol">Rol</label>
                <select id="n-rol" value={rolNuevo} onChange={(e) => setRolNuevo(e.target.value as "coordinador" | "tecnico")}>
                  <option value="coordinador">Coordinador de tienda</option>
                  <option value="tecnico">Técnico de calidad</option>
                </select>
              </div>
            </>
          )}

          <div className="campo">
            <label htmlFor="i-pin">PIN de la tienda</label>
            <input
              id="i-pin"
              type="password"
              className="pin"
              inputMode="numeric"
              maxLength={8}
              autoComplete="off"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && entrar()}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button className="btn btn-p btn-g" onClick={entrar} disabled={enviando}>
            Entrar
          </button>
          <p className="nota-pie">
            El PIN identifica quién hace el registro; no es una clave de seguridad de Jamar. Si no aparece tu
            nombre, avisa a Trade Marketing para que te agregue al maestro.
          </p>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button className="btn btn-sm" onClick={() => setMostrarAdmin((v) => !v)}>
          Entrar como administrador
        </button>
      </div>

      {mostrarAdmin && (
        <div className="tj" style={{ marginTop: 12 }}>
          <div className="tj-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className="nota-pie">Vista de seguimiento para Trade Marketing: matriz de cumplimiento, trazabilidad, maestro y exportación.</p>
            <div className="campo">
              <label htmlFor="a-pin">Clave de administrador</label>
              <input
                id="a-pin"
                type="password"
                autoComplete="off"
                value={pinAdmin}
                onChange={(e) => setPinAdmin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && entrarAdmin()}
              />
            </div>
            {errorAdmin && <div className="error">{errorAdmin}</div>}
            <button className="btn btn-p" onClick={entrarAdmin}>
              Entrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
