import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  applyAutoLight,
  applyManualLight,
  setBrightness,
  setPower,
  getLightHistory,
} from "../services/lightApi";

export function useLight() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentLight, setCurrentLight] = useState(null);
  const [history, setHistory] = useState([]);

  const token = user?.token;

  const applyAuto = async (eventType = null) => {
    setLoading(true);
    try {
      const data = await applyAutoLight(token, eventType);
      setCurrentLight(data);
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

  return {
    loading,
    currentLight,
    history,
    applyAuto,
    applyManual,
    updateBrightness,
    togglePower,
    fetchHistory,
  };
}
