import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-glow">
          <span className="loading-brand">AuraLUX</span>
        </div>
        <span className="loading-text">Carregando ...</span>
        <span className="loading-corner bl">
          SYS_V: 1.0.0-STABLE · NODE: ESP32-CORE
        </span>
        <span className="loading-corner br">AGUARDANDO AUTENTICAÇÃO</span>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}
