import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLight } from "../hooks/useLight";
import { getPresets } from "../services/lightApi";
import OutlookCard from "../components/OutlookCard";
import axios from "axios";
import "../styles/Dashboard.css";

const BASE = import.meta.env.VITE_API_URL ?? "";

const CHRONOTYPE_LABELS = {
  morning: "Matutino",
  evening: "Vespertino",
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Declarar mode ANTES de usar em useLight
  const [mode, setMode] = useState("auto"); // 'auto' | 'manual'

  const {
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
  } = useLight(mode === "manual"); // Passa isManualMode

  const [power, setPower] = useState(true);
  const [brightness, setBrightnessLocal] = useState(80);

  const rgbDebounceRef = useRef(null);
  const brightnessDebounceRef = useRef(null);
  const [rgb, setRgb] = useState({ r: 255, g: 255, b: 240 });
  const [presets, setPresets] = useState([]);
  const [activePreset, setActivePreset] = useState(null);

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
    clearTimeout(brightnessDebounceRef.current);
    brightnessDebounceRef.current = setTimeout(() => {
      updateBrightness(val);
    }, 300);
  };

  const handleRgbChange = (channel, val) => {
    const newRgb = { ...rgb, [channel]: parseInt(val) };
    setRgb(newRgb);
    setActivePreset(null);
    if (mode !== "manual") {
      setMode("manual");
      disableAutoMode(); // Notifica backend para parar IA background
    }
    clearTimeout(rgbDebounceRef.current);
    rgbDebounceRef.current = setTimeout(() => {
      applyManual(newRgb.r, newRgb.g, newRgb.b, brightness);
    }, 300);
  };

  const handlePreset = (preset) => {
    setRgb({ r: preset.r, g: preset.g, b: preset.b });
    setActivePreset(preset.key);
    if (mode !== "manual") {
      setMode("manual");
      disableAutoMode(); // Notifica backend para parar IA background
    }
    applyManual(preset.r, preset.g, preset.b, brightness);
  };

  const handleAutoLight = () => {
    // Sempre enviar "auto" - o botão "Luz Automática" sempre ativa AUTO
    applyAuto("auto").then((data) => {
      setMode("auto");
      setActivePreset(null);
      if (data.command) {
        setRgb({ r: data.command.r, g: data.command.g, b: data.command.b });
      }
    });
    fetchHistory();
  };

  const handleSyncCalendar = () => {
    syncWithCalendar().then((data) => {
      if (data && data.command) {
        setRgb({ r: data.command.r, g: data.command.g, b: data.command.b });
      }
    });
  };

  // Simulação 24h
  const startSimulation = async () => {
    setIsSimulating(true);
    try {
      const response = await axios.get(`${BASE}/api/calendar/simulate-timeline`, {
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
          <div className="dash-card-title">Controle de Luz</div>

          {/* Mode Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <span
              style={{
                fontSize: "0.65rem",
                letterSpacing: "2px",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
              }}
            >
              Modo
            </span>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                onClick={() => {
                  if (mode !== "auto") handleAutoLight();
                }}
                disabled={isSimulating}
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.65rem",
                  letterSpacing: "1px",
                  fontWeight: "600",
                  fontFamily: "'Orbitron', monospace",
                  border:
                    mode === "auto"
                      ? "1px solid var(--cyan)"
                      : "1px solid var(--border)",
                  backgroundColor:
                    mode === "auto" ? "rgba(0, 229, 255, 0.15)" : "transparent",
                  color: mode === "auto" ? "var(--cyan)" : "var(--text-dim)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                AUTO
              </button>
              <button
                onClick={() => {
                  setMode("manual");
                  disableAutoMode(); // Notifica backend para parar IA background
                }}
                disabled={isSimulating}
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.65rem",
                  letterSpacing: "1px",
                  fontWeight: "600",
                  fontFamily: "'Orbitron', monospace",
                  border:
                    mode === "manual"
                      ? "1px solid #ff6464"
                      : "1px solid var(--border)",
                  backgroundColor:
                    mode === "manual"
                      ? "rgba(255, 100, 100, 0.15)"
                      : "transparent",
                  color: mode === "manual" ? "#ff6464" : "var(--text-dim)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                MANUAL
              </button>
            </div>
          </div>

          {/* Automático */}
          {mode === "auto" && (
            <>
              <button
                className="auto-btn"
                onClick={handleAutoLight}
                disabled={loading || isSimulating}
              >
                ◎ Luz Automática Aplicada (Cronotipo)
              </button>

              <button
                className="sync-btn"
                onClick={handleSyncCalendar}
                disabled={loading || isSimulating}
                title="Verifica calendário e aplica cor da IA"
              >
                🔄 Atualizar
              </button>
            </>
          )}

          {/* Manual Controls */}
          {mode === "manual" && (
            <>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-dim)",
                  marginTop: "0.5rem",
                  marginBottom: "0.7rem",
                  letterSpacing: "1px",
                }}
              >
                Ajuste os valores de cor manualmente
              </p>
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
            </>
          )}
        </div>

        {/* Card: Presets */}
        <div className="dash-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.9rem",
            }}
          >
            <div className="dash-card-title" style={{ margin: 0 }}>
              Presets Circadianos
            </div>
            <Link
              to="/science/presets"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "rgba(0, 229, 255, 0.1)",
                border: "1px solid var(--cyan-dim)",
                color: "var(--cyan)",
                textDecoration: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(0, 229, 255, 0.2)";
                e.target.style.boxShadow = "0 0 12px rgba(0, 229, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "rgba(0, 229, 255, 0.1)";
                e.target.style.boxShadow = "none";
              }}
              title="Validação científica dos presets"
            >
              i
            </Link>
          </div>
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.9rem",
            }}
          >
            <div className="dash-card-title" style={{ margin: 0 }}>
              Histórico de Comandos
            </div>
            <button
              onClick={fetchHistory}
              disabled={loading}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontSize: "0.72rem",
                letterSpacing: "1px",
                cursor: "pointer",
                padding: "0.3rem 0.6rem",
                borderRadius: "4px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "var(--cyan)";
                e.target.style.color = "var(--cyan)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.color = "var(--text-secondary)";
              }}
              title="Atualizar histórico"
            >
              🔄 Atualizar
            </button>
          </div>
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
                    {new Date(item.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}{" "}
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
