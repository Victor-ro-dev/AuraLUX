import { useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { generatePKCE, storePKCE } from "../utils/pkce";
import axios from "axios";

export function useOutlook() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(
    () => localStorage.getItem("outlook_connected") === "true",
  );
  const [syncing, setSyncing] = useState(false);
  const [events, setEvents] = useState([]);

  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  /** Redireciona o usuário para o login Microsoft (Authorization Code Flow com PKCE). */
  const connect = useCallback(async () => {
    try {
      // 1. Gerar PKCE (Proof Key for Code Exchange)
      const pkce = await generatePKCE();
      console.log("[useOutlook] PKCE gerado:", {
        verifier: pkce.codeVerifier.substring(0, 10) + "...",
        challenge: pkce.codeChallenge,
      });
      storePKCE(pkce);

      // 2. Guardar token JWT em localStorage para a nova aba acessar
      localStorage.setItem("outlook_auth_token", user.token);
      console.log("[useOutlook] Token guardado em localStorage para callback");

      // 3. Obter URL de autorização com code_challenge
      const { data } = await axios.get("/api/auth/outlook/url", {
        headers: authHeaders,
        params: { code_challenge: pkce.codeChallenge },
      });
      console.log("URL de autorização Microsoft:", data.url);
      window.open(data.url, "_blank");
    } catch (err) {
      console.error("Erro ao obter URL de autorização:", err);
    }
  }, [user?.token]);

  /** Remove os tokens do banco e atualiza o estado local. */
  const disconnect = useCallback(async () => {
    await axios.delete("/api/auth/outlook/disconnect", {
      headers: authHeaders,
    });
    localStorage.removeItem("outlook_connected");
    setConnected(false);
    setEvents([]);
  }, [user?.token]);

  /** Marca a conexão como estabelecida (chamado pelo OAuthCallback). */
  const markConnected = useCallback(() => {
    localStorage.setItem("outlook_connected", "true");
    setConnected(true);
  }, []);

  /** Busca os eventos do calendário do usuário logado. */
  const fetchEvents = useCallback(async () => {
    try {
      console.log("[useOutlook] Buscando eventos...");
      const { data } = await axios.get("/api/calendar/events", {
        headers: authHeaders,
      });
      console.log("[useOutlook] ✓ Eventos recebidos:", data.events);
      setEvents(data.events || []);
      return data.events || [];
    } catch (err) {
      console.error(
        "[useOutlook] ✗ Erro ao buscar eventos:",
        err.response?.data || err.message,
      );
      return [];
    }
  }, [user?.token]);

  /** Sincroniza a iluminação com o evento atual do Outlook. */
  const syncLight = useCallback(async () => {
    setSyncing(true);
    try {
      const { data } = await axios.post("/api/calendar/sync-light", null, {
        headers: authHeaders,
      });
      return data;
    } catch {
      return null;
    } finally {
      setSyncing(false);
    }
  }, [user?.token]);

  return {
    isConnected: connected,
    syncing,
    events,
    connect,
    disconnect,
    markConnected,
    fetchEvents,
    syncLight,
  };
}
