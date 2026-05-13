import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "../hooks/useLogin";
import "../styles/Auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const { login, loading, error } = useLogin();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const profile = await login(email, password);
    if (profile) {
      // Redireciona para o formulário se ainda não tem cronotipo configurado
      navigate(profile.chronotype ? "/dashboard" : "/form");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">AuraLUX</div>
        <div className="auth-subtitle">System Initialization</div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <span className="auth-field-label">
              <span className="auth-field-icon">⬡</span>
              ID // Email
            </span>
            <input
              type="email"
              placeholder="admin@esp32.node"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
            />
          </div>

          <div className="auth-field">
            <span className="auth-field-label">
              <span className="auth-field-icon">⊕</span>
              Senha
              <Link to="/forgot" className="auth-forgot">
                Esqueceu a Chave?
              </Link>
            </span>
            <div className="auth-input-wrap">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                required
              />
              <button
                type="button"
                className="auth-toggle-pass"
                onClick={() => setShowPass((v) => !v)}
                aria-label="Mostrar senha"
              >
                {showPass ? "○" : "●"}
              </button>
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Autenticando..." : "Entrar →"}
          </button>
        </form>

        <p className="auth-switch">
          Node não registrado?{" "}
          <Link to="/register" className="auth-link">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
