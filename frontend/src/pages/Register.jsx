import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "../hooks/useRegister";
import "../styles/Auth.css";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const { register, loading, error } = useRegister();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert("As chaves de segurança não coincidem");
      return;
    }
    const ok = await register(form.name, form.email, form.password);
    if (ok) navigate("/login");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">AuraLUX</div>
        <div className="auth-subtitle">Initialize new operator sequence</div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Operator ID</label>
            <input
              type="text"
              name="name"
              placeholder="ENTER_NAME"
              value={form.name}
              onChange={handleChange}
              className="auth-input"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Comms Link</label>
            <input
              type="email"
              name="email"
              placeholder="EMAIL_ADDRESS"
              value={form.email}
              onChange={handleChange}
              className="auth-input"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Security Key</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="auth-input"
              required
              minLength={6}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Verify Key</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className="auth-input"
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            ⏻ {loading ? "Registrando..." : "Cadastrar"}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login" className="auth-link">
            ← Return to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
