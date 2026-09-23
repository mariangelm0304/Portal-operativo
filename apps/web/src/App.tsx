import { Navigate, Route, Routes } from "react-router-dom";
import { Barra } from "./components/Barra";
import { useAuth } from "./context/AuthContext";
import { Admin } from "./pages/Admin/Admin";
import { Ingreso } from "./pages/Ingreso/Ingreso";
import { Operario } from "./pages/Operario/Operario";

export default function App() {
  const { sesion } = useAuth();

  return (
    <div className="app">
      {sesion && <Barra />}
      <Routes>
        <Route path="/" element={sesion ? <RedirigirSegunRol /> : <Ingreso />} />
        <Route
          path="/operario"
          element={sesion && sesion.rol !== "admin" ? <Operario /> : <Navigate to="/" replace />}
        />
        <Route path="/admin/*" element={sesion?.rol === "admin" ? <Admin /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function RedirigirSegunRol() {
  const { sesion } = useAuth();
  if (sesion?.rol === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/operario" replace />;
}
