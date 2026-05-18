import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLight } from "../hooks/useLight";
import { getPresets } from "../services/lightApi";
import OutlookCard from "../components/OutlookCard";
import axios from "axios";
import "../styles/Dashboard.css";

const CHRONOTYPE_LABELS = {
  morning: "Matutino",
  evening: "Vespertino",
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    loading,
    currentLight,
    history,
    applyAuto,
    applyManual,
    updateBrightness,
    togglePower,
    fetchHistory,
  } = useLight();

  const [power, setPower] = useState(true);
  const [brightness, setBrightnessLocal] = useState(80);
  const [rgb, setRgb] = useState({ r: 255, g: 255, b: 240 });
  const [presets, setPresets] = useState([]);
  const [activePreset, setActivePreset] = useState(null);
  const [mode, setMode] = useState("auto"); // 'auto' | 'manual'

  // Estado para simulação 24h
  const [isSimulating, setIsSimulating] = useState(false);
  const [timeline, setTimeline] = useState(null);
  const [currentTimelineIndex, setCurrentTimelineIndex] = useState(0);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [chronotypeSimulation, setChronotypeSimulation] = useState(
    user?.chronotype || "morning",
  );

  useEffect(() => {
    fetchHistory();
    getPresets(user?.token)
      .then(setPresets)
      .catch(() => {});
    // Aplica luz automática ao entrar no dashboard
    applyAuto().then((data) => {
      if (data) setRgb({ r: data.r, g: data.g, b: data.b });
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handlePowerToggle = () => {
    const newState = !power;
    setPower(newState);
    togglePower(newState);
  };

  const handleBrightnessChange = (e) => {
    const val = parseInt(e.target.value);
    setBrightnessLocal(val);
    updateBrightness(val);
  };

  const handleRgbChange = (channel, val) => {
    const newRgb = { ...rgb, [channel]: parseInt(val) };
    setRgb(newRgb);
    setActivePreset(null);
    setMode("manual");
    applyManual(newRgb.r, newRgb.g, newRgb.b, brightness);
  };

  const handlePreset = (preset) => {
    setRgb({ r: preset.r, g: preset.g, b: preset.b });
    setActivePreset(preset.key);
    setMode("manual");
    applyManual(preset.r, preset.g, preset.b, brightness);
  };

  const handleAutoLight = () => {
    setMode("auto");
    setActivePreset(null);
    applyAuto().then((data) => {
      if (data) setRgb({ r: data.r, g: data.g, b: data.b });
    });
    fetchHistory();
  };

  // Simulação 24h
  const startSimulation = async () => {
    setIsSimulating(true);
    try {
      const response = await axios.get("/api/calendar/simulate-timeline", {
        params: {
          chronotype: chronotypeSimulation,
          snapshots: 24,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auralux_token")}`,
        },
      });
      setTimeline(response.data);
      setCurrentTimelineIndex(0);
      setSimulationProgress(0);
    } catch (error) {
      console.error("Erro ao carregar timeline:", error);
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    if (!isSimulating || !timeline) return;

    const duration = timeline.duration_seconds * 1000;
    const snapshots = timeline.timeline.length;
    const intervalMs = duration / snapshots;

    const interval = setInterval(() => {
      setCurrentTimelineIndex((prev) => {
        if (prev >= snapshots - 1) {
          setIsSimulating(false);
          return snapshots - 1;
        }
        return prev + 1;
      });
      setSimulationProgress((prev) => Math.min(prev + 100 / snapshots, 100));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isSimulating, timeline]);

  const currentTimelineFrame = timeline?.timeline[currentTimelineIndex];

  const displayLight =
    isSimulating && currentTimelineFrame
      ? {
          r: currentTimelineFrame.color.r,
          g: currentTimelineFrame.color.g,
          b: currentTimelineFrame.color.b,
          label: currentTimelineFrame.color.label,
          triggered_by: currentTimelineFrame.triggered_by,
          cct: currentTimelineFrame.color.cct,
          event_type: currentTimelineFrame.event_type,
          time: currentTimelineFrame.time,
        }
      : currentLight || {
          r: rgb.r,
          g: rgb.g,
          b: rgb.b,
          label: "—",
          triggered_by: "manual",
        };
  const lightBg = `rgb(${displayLight.r}, ${displayLight.g}, ${displayLight.b})`;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <div className="dash-brand">AuraLUX</div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Toggle Simulação 24h */}
          <button
            style={{
              padding: "8px 16px",
              backgroundColor: isSimulating ? "#ff6b6b" : "#4a9eff",
              color: "#000",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.2s",
            }}
            onClick={() => {
              if (isSimulating) {
                setIsSimulating(false);
              } else {
                startSimulation();
              }
            }}
          >
            {isSimulating ? "⏸️ Parar Simulação" : "▶️ Simular 24h"}
          </button>

          {/* Seletor de Cronotipo para Simulação */}
          {isSimulating && (
            <select
              value={chronotypeSimulation}
              onChange={(e) => setChronotypeSimulation(e.target.value)}
              disabled={isSimulating}
              style={{
                padding: "6px 10px",
                backgroundColor: "#2a2a2a",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              <option value="morning">Matutino</option>
              <option value="evening">Vespertino</option>
            </select>
          )}

          <div className="dash-user-info">
            <span className="dash-user-name">{user?.name}</span>
            <span className="dash-user-type">
              {CHRONOTYPE_LABELS[user?.chronotype] || "Cronotipo não definido"}
            </span>
          </div>
          <button className="dash-logout-btn" onClick={handleLogout}>
            SAIR
          </button>
        </div>
      </div>

      <div className="dash-grid">
        {/* Card: Status da Luz */}
        <div className="dash-card">
          <div className="dash-card-title">
            {isSimulating ? "🕐 Simulação 24h em Progresso" : "Estado Atual"}
          </div>

          {/* Progresso da Simulação */}
          {isSimulating && (
            <div
              style={{
                width: "100%",
                height: "6px",
                backgroundColor: "#2a2a2a",
                borderRadius: "3px",
                overflow: "hidden",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  height: "100%",
                  backgroundColor: "#4a9eff",
                  width: `${simulationProgress}%`,
                  transition: "width 0.1s linear",
                }}
              />
            </div>
          )}

          {/* Hora da Simulação */}
          {isSimulating && displayLight.time && (
            <div
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#4a9eff",
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              {displayLight.time}
            </div>
          )}

          <div
            className="light-preview"
            style={{
              background: power ? lightBg : "#111",
              opacity: power ? 1 : 0.4,
            }}
          />
          <div className="light-label">{displayLight.label}</div>
          <div className="light-rgb-badge">
            <span>R:{displayLight.r}</span>
            <span>G:{displayLight.g}</span>
            <span>B:{displayLight.b}</span>
          </div>

          {/* Info da Simulação */}
          {isSimulating && displayLight.cct && (
            <div
              style={{
                marginTop: "0.8rem",
                padding: "0.8rem",
                backgroundColor: "#2a2a2a",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#aaa",
              }}
            >
              <div style={{ marginBottom: "0.4rem" }}>
                🌡️ CCT: <strong>{displayLight.cct}K</strong>
              </div>
              <div>
                📅 Evento:{" "}
                <strong>
                  {displayLight.event_type
                    ? displayLight.event_type.toUpperCase()
                    : "—"}
                </strong>
              </div>
            </div>
          )}

          <div style={{ marginTop: "1rem" }}>
            <div className="phase-badge">
              <span className="phase-dot" />
              {isSimulating
                ? "Simulação"
                : mode === "auto"
                  ? "Automático"
                  : "Manual"}
            </div>
          </div>

          {/* Power */}
          <div className="power-row" style={{ marginTop: "1.2rem" }}>
            <span className="power-label">Luminária</span>
            <button
              className={`power-toggle ${power ? "on" : ""}`}
              onClick={handlePowerToggle}
              aria-label="Ligar/desligar"
            />
          </div>

          {/* Brilho */}
          <div className="slider-row">
            <div className="slider-label-row">
              <span>Brilho</span>
              <span className="slider-value">{brightness}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={brightness}
              onChange={handleBrightnessChange}
              disabled={isSimulating}
            />
          </div>
        </div>

        {/* Card: Controle Manual */}
        <div className="dash-card">
          <div className="dash-card-title">Controle Manual</div>

          <button
            className="auto-btn"
            onClick={handleAutoLight}
            disabled={loading || isSimulating}
            style={{
              opacity: isSimulating ? 0.5 : 1,
              cursor: isSimulating ? "not-allowed" : "pointer",
            }}
          >
            ◎ Aplicar Luz Automática (Cronotipo)
          </button>

          <div className="slider-group">
            <div className="slider-row">
              <div className="slider-label-row">
                <span>Vermelho</span>
                <span className="slider-value">{rgb.r}</span>
              </div>
              <input
                type="range"
                className="r-slider"
                min={0}
                max={255}
                value={rgb.r}
                onChange={(e) => handleRgbChange("r", e.target.value)}
                disabled={isSimulating}
              />
            </div>
            <div className="slider-row">
              <div className="slider-label-row">
                <span>Verde</span>
                <span className="slider-value">{rgb.g}</span>
              </div>
              <input
                type="range"
                className="g-slider"
                min={0}
                max={255}
                value={rgb.g}
                onChange={(e) => handleRgbChange("g", e.target.value)}
                disabled={isSimulating}
              />
            </div>
            <div className="slider-row">
              <div className="slider-label-row">
                <span>Azul</span>
                <span className="slider-value">{rgb.b}</span>
              </div>
              <input
                type="range"
                className="b-slider"
                min={0}
                max={255}
                value={rgb.b}
                onChange={(e) => handleRgbChange("b", e.target.value)}
                disabled={isSimulating}
              />
            </div>
          </div>
        </div>

        {/* Card: Presets */}
        <div className="dash-card">
          <div className="dash-card-title">Presets Circadianos</div>
          <div
            className="presets-grid"
            style={{
              opacity: isSimulating ? 0.5 : 1,
              pointerEvents: isSimulating ? "none" : "auto",
            }}
          >
            {presets.map((p) => (
              <button
                key={p.key}
                className={`preset-btn ${activePreset === p.key ? "active" : ""}`}
                onClick={() => handlePreset(p)}
                disabled={isSimulating}
              >
                <div
                  className="preset-color-dot"
                  style={{ background: `rgb(${p.r},${p.g},${p.b})` }}
                />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card: Outlook Calendar */}
        <OutlookCard />

        {/* Card: Histórico */}
        <div className="dash-card">
          <div className="dash-card-title">Histórico de Comandos</div>
          <div className="history-list">
            {history.length === 0 && (
              <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
                Nenhum comando enviado ainda.
              </span>
            )}
            {history.map((item) => (
              <div key={item.id} className="history-item">
                <div
                  className="history-color-dot"
                  style={{ background: `rgb(${item.r},${item.g},${item.b})` }}
                />
                <div className="history-info">
                  <div className="history-label">{item.label || "—"}</div>
                  <div className="history-meta">
                    {item.triggered_by.toUpperCase()} ·{" "}
                    {new Date(item.created_at).toLocaleTimeString("pt-BR")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
