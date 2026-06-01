import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  applyAutoLight,
  applyManualLight,
  setBrightness,
  setPower,
  getLightHistory,
  syncLightFromCalendar,
  setAutoLightMode,
} from "../services/lightApi";

export function useLight(isManualMode = false) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentLight, setCurrentLight] = useState(null);
  const [history, setHistory] = useState([]);

  const token = user?.token;

  const applyAuto = async (currentMode = "auto") => {
    setLoading(true);
    try {
      // currentMode pode ser "manual" ou "auto"
      const data = await applyAutoLight(token, currentMode);
      if (data.mode === "auto" && data.command) {
        setCurrentLight(data.command);
      }
      // Buscar histórico junto com a IA para manter sincronizado
      await fetchHistory();
      return data;
    } finally {
      setLoading(false);
    }
  };

  const applyManual = async (r, g, b, brightness = 80) => {
    setLoading(true);
    try {
      const data = await applyManualLight(token, { r, g, b, brightness });
      setCurrentLight(data);
      // Buscar histórico junto para manter sincronizado
      await fetchHistory();
      return data;
    } finally {
      setLoading(false);
    }
  };

  const updateBrightness = async (brightness) => {
    await setBrightness(token, brightness);
    setCurrentLight((prev) => (prev ? { ...prev, brightness } : prev));
  };

  const togglePower = async (state) => {
    await setPower(token, state);
  };

  const fetchHistory = async () => {
    const data = await getLightHistory(token);
    setHistory(data);
  };

  // Função para sincronizar com calendário (botão "Atualizar")
  const syncWithCalendar = async () => {
    setLoading(true);
    try {
      const data = await syncLightFromCalendar(token);
      // Atualizar histórico imediatamente
      await fetchHistory();
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Desativar modo automático no backend (quando troca para manual)
  const disableAutoMode = async () => {
    try {
      // /light/auto com current_mode=manual já seta auto_light_mode=False no BD
      await applyAutoLight(token, "manual");
    } catch (err) {
      console.error("Erro ao desativar modo auto:", err);
    }
  };

  // Atualizar currentLight quando histórico mudar (novo comando do scheduler)
  // APENAS se NÃO estiver em modo manual
  useEffect(() => {
    if (isManualMode) return; // Não atualizar em modo manual

    if (history && history.length > 0) {
      const latestCommand = history[0];
      setCurrentLight(latestCommand);
    }
  }, [history, isManualMode]);

  return {
    loading,
    currentLight,
    history,
    applyAuto,
    applyManual,
    updateBrightness,
    togglePower,
    fetchHistory,
    syncWithCalendar,
    disableAutoMode,
  };
}
