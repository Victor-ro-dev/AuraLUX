import { useState, useCallback } from "react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, calendarScopes } from "../services/msalConfig";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const msalInstance = new PublicClientApplication(msalConfig);
await msalInstance.initialize();

export function useOutlook() {
  const { user } = useAuth();
  const [outlookToken, setOutlookToken] = useState(
    sessionStorage.getItem("outlook_token") || null,
  );
  const [syncing, setSyncing] = useState(false);
  const [events, setEvents] = useState([]);

  const connect = useCallback(async () => {
    try {
      const result = await msalInstance.loginPopup(calendarScopes);
      const token = result.accessToken;
      sessionStorage.setItem("outlook_token", token);
      setOutlookToken(token);
      return token;
    } catch (err) {
      console.error("Falha ao conectar Outlook:", err);
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    sessionStorage.removeItem("outlook_token");
    setOutlookToken(null);
    setEvents([]);
  }, []);

  const fetchEvents = useCallback(
    async (token = outlookToken) => {
      if (!token) return [];
      try {
        const { data } = await axios.get("/api/calendar/events", {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            "X-Outlook-Token": token,
          },
        });
        setEvents(data.events || []);
        return data.events || [];
      } catch (err) {
        console.error("Erro ao buscar eventos:", err);
        return [];
      }
    },
    [outlookToken, user?.token],
  );

  const syncLight = useCallback(
    async (token = outlookToken) => {
      if (!token) return null;
      setSyncing(true);
      try {
        const { data } = await axios.post("/api/calendar/sync-light", null, {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            "X-Outlook-Token": token,
          },
        });
        return data;
      } catch (err) {
        console.error("Erro ao sincronizar luz:", err);
        return null;
      } finally {
        setSyncing(false);
      }
    },
    [outlookToken, user?.token],
  );

  return {
    outlookToken,
    isConnected: !!outlookToken,
    syncing,
    events,
    connect,
    disconnect,
    fetchEvents,
    syncLight,
  };
}
