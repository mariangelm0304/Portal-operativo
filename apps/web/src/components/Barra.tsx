import { useAuth } from "../context/AuthContext";

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
            <span>{sesion.rol === "admin" ? "21 tiendas · seguimiento" : sesion.tiendaSlug}</span>
          </span>
        </div>
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
