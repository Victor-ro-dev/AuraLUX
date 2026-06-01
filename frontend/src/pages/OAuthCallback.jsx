import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useOutlook } from "../hooks/useOutlook";
import { getPKCEVerifier, clearPKCE } from "../utils/pkce";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "";

/**
 * Página de retorno do fluxo OAuth2 — Authorization Code Flow com PKCE.
 *
 * A Microsoft redireciona para esta rota com ?code=... após o consentimento.
 * 1. Extrai o código da URL.
 * 2. Recupera o code_verifier do sessionStorage.
 * 3. Envia code + code_verifier ao backend para troca pelos tokens.
 * 4. Marca o Outlook como conectado e redireciona ao dashboard.
 */
export default function OAuthCallback() {
  const { user } = useAuth();
  const { markConnected } = useOutlook();
  const navigate = useNavigate();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const errorDescription = params.get("error_description");
    const codeVerifier = getPKCEVerifier();
    const tokenFromStorage = localStorage.getItem("outlook_auth_token");

    console.log("[OAuthCallback] URL:", window.location.search);
    console.log("[OAuthCallback] Code:", code);
    console.log("[OAuthCallback] Error:", error);
    console.log("[OAuthCallback] Code Verifier:", codeVerifier ? "✓" : "✗");
    console.log("[OAuthCallback] User token:", user?.token ? "✓" : "✗");
    console.log(
      "[OAuthCallback] Token from localStorage:",
      tokenFromStorage ? "✓" : "✗",
    );

    if (error) {
      console.error("[OAuthCallback] Erro Microsoft:", errorDescription);
      clearPKCE();
      navigate("/dashboard", { replace: true });
      return;
    }

    if (!code) {
      console.error("[OAuthCallback] Nenhum code retornado pela Microsoft");
      clearPKCE();
      navigate("/dashboard", { replace: true });
      return;
    }

    if (!codeVerifier) {
      console.error("[OAuthCallback] Code verifier não encontrado");
      clearPKCE();
      navigate("/dashboard", { replace: true });
      return;
    }

    const authToken = user?.token || tokenFromStorage;

    if (!authToken) {
      console.error(
        "[OAuthCallback] Usuário não autenticado (nenhum token disponível)",
      );
      clearPKCE();
      localStorage.removeItem("outlook_auth_token");
      navigate("/login", { replace: true });
      return;
    }

    console.log(
      "[OAuthCallback] Usando token:",
      user?.token ? "do user" : "do localStorage",
    );

    const payload = { code, code_verifier: codeVerifier };
    console.log("[OAuthCallback] Enviando POST /api/auth/outlook/callback:", {
      code: code?.substring(0, 20) + "...",
      code_verifier: codeVerifier?.substring(0, 20) + "...",
      auth_token: authToken?.substring(0, 20) + "...",
    });

    axios
      .post(`${BASE}/api/auth/outlook/callback`, payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      .then((res) => {
        console.log(
          "[OAuthCallback] ✓ Resposta servidor:",
          res.status,
          res.data,
        );
        console.log("[OAuthCallback] ✓ Tokens recebidos e salvos");
        clearPKCE();
        localStorage.removeItem("outlook_auth_token");
        markConnected();
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        console.error(
          "[OAuthCallback] ✗ Erro ao trocar código:",
          err.response?.data || err.message,
        );
        clearPKCE();
        navigate("/dashboard", { replace: true });
      });
  }, [user?.token]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <p style={{ color: "var(--text-secondary)" }}>Conectando Outlook…</p>
    </div>
  );
}
