import React, { useState, useEffect } from "react";
import axios from "axios";

export default function SimulationPanel() {
  const [mode, setMode] = useState("production"); // 'production' | 'simulation'
  const [chronotype, setChronotype] = useState("morning");
  const [eventType, setEventType] = useState("");
  const [hour, setHour] = useState(10);

  // Estado para simulação
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estado para animação 24h
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeline, setTimeline] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Modo Produção: simulação simples
  const simulateProduction = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        hour: hour,
        chronotype: chronotype,
      });
      if (eventType) params.append("event_type", eventType);

      const response = await axios.get(`/api/calendar/simulate?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auralux_token")}`,
        },
      });
      setResult(response.data);
    } catch (error) {
      console.error("Erro na simulação:", error);
    } finally {
      setLoading(false);
    }
  };

  // Modo Simulação: animação 24h
  const startTimelineAnimation = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/calendar/simulate-timeline", {
        params: {
          chronotype: chronotype,
          snapshots: 24,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auralux_token")}`,
        },
      });
      setTimeline(response.data);
      setIsPlaying(true);
      setCurrentIndex(0);
      setProgress(0);
    } catch (error) {
      console.error("Erro ao carregar timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  // Animar a timeline
  useEffect(() => {
    if (!isPlaying || !timeline) return;

    const duration = timeline.duration_seconds * 1000;
    const snapshots = timeline.timeline.length;
    const intervalMs = duration / snapshots;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= snapshots - 1) {
          setIsPlaying(false);
          return snapshots - 1;
        }
        return prev + 1;
      });
      setProgress((prev) => Math.min(prev + 100 / snapshots, 100));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, timeline]);

  const current = timeline?.timeline[currentIndex];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🧪 Simulação de Iluminação</h2>

        {/* Toggle Modo */}
        <div style={styles.modeToggle}>
          <button
            style={{
              ...styles.modeBtn,
              backgroundColor: mode === "production" ? "#4a9eff" : "#333",
              color: mode === "production" ? "#000" : "#aaa",
            }}
            onClick={() => {
              setMode("production");
              setIsPlaying(false);
            }}
          >
            ⚙️ Produção
          </button>
          <button
            style={{
              ...styles.modeBtn,
              backgroundColor: mode === "simulation" ? "#4a9eff" : "#333",
              color: mode === "simulation" ? "#000" : "#aaa",
            }}
            onClick={() => {
              setMode("simulation");
              setResult(null);
            }}
          >
            ⏱️ Simulação 24h
          </button>
        </div>
      </div>

      {/* MODO PRODUÇÃO: Simulação Simples */}
      {mode === "production" && (
        <div style={styles.content}>
          <div style={styles.controls}>
            <div style={styles.control}>
              <label>⏰ Hora do Dia:</label>
              <input
                type="range"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.value}>
                {hour.toString().padStart(2, "0")}:30
              </span>
            </div>

            <div style={styles.control}>
              <label>🌅 Cronotipo:</label>
              <select
                value={chronotype}
                onChange={(e) => setChronotype(e.target.value)}
                style={styles.select}
              >
                <option value="morning">Matutino</option>
                <option value="evening">Vespertino</option>
              </select>
            </div>

            <div style={styles.control}>
              <label>📅 Tipo de Evento:</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                style={styles.select}
              >
                <option value="">Nenhum evento</option>
                <option value="focus">Foco/Deep Work</option>
                <option value="meeting">Reunião/Call</option>
                <option value="relax">Relaxamento/Pausa</option>
                <option value="reading">Leitura</option>
              </select>
            </div>

            <button
              onClick={simulateProduction}
              style={styles.button}
              disabled={loading}
            >
              {loading ? "Simulando..." : "▶️ Simular"}
            </button>
          </div>

          {result && (
            <div style={styles.result}>
              <div style={styles.resultGrid}>
                <div style={styles.info}>
                  <h3>Resultado:</h3>
                  <p>
                    <strong>⏰ Hora:</strong> {result.simulated_time}
                  </p>
                  <p>
                    <strong>🌅 Cronotipo:</strong>{" "}
                    {result.chronotype === "morning"
                      ? "Matutino"
                      : "Vespertino"}
                  </p>
                  <p>
                    <strong>📅 Evento:</strong>{" "}
                    {result.event_type === "nenhum"
                      ? "Nenhum"
                      : result.event_type}
                  </p>
                  <p>
                    <strong>🎨 Cor:</strong> {result.color.label}
                  </p>
                  <p>
                    <strong>🌡️ CCT:</strong> {result.color.cct}K
                  </p>
                  <p style={styles.explanation}>
                    <em>"{result.explanation}"</em>
                  </p>
                </div>

                <div style={styles.colorPreview}>
                  <div
                    style={{
                      ...styles.colorBox,
                      backgroundColor: `rgb(${result.color.r}, ${result.color.g}, ${result.color.b})`,
                    }}
                  />
                  <p style={styles.rgbText}>
                    RGB({result.color.r}, {result.color.g}, {result.color.b})
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODO SIMULAÇÃO: Animação 24h */}
      {mode === "simulation" && (
        <div style={styles.content}>
          <div style={styles.controls}>
            <div style={styles.control}>
              <label>🌅 Cronotipo:</label>
              <select
                value={chronotype}
                onChange={(e) => setChronotype(e.target.value)}
                style={styles.select}
                disabled={isPlaying}
              >
                <option value="morning">Matutino</option>
                <option value="evening">Vespertino</option>
              </select>
            </div>

            <button
              onClick={startTimelineAnimation}
              style={{
                ...styles.button,
                backgroundColor: isPlaying ? "#ff6b6b" : "#4a9eff",
              }}
              disabled={loading || isPlaying}
            >
              {loading
                ? "Carregando..."
                : isPlaying
                  ? "⏸️ Pausando..."
                  : "▶️ Iniciar Animação"}
            </button>
          </div>

          {timeline && (
            <div style={styles.animationContainer}>
              {/* Barra de Progresso */}
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progress}%`,
                  }}
                />
              </div>

              {/* Painel de Exibição */}
              <div style={styles.displayPanel}>
                <div style={styles.infoSection}>
                  <h3 style={styles.timeDisplay}>
                    {current?.time}{" "}
                    <span style={styles.hourMarker}>
                      (Hora {current?.hour})
                    </span>
                  </h3>

                  <div style={styles.statsGrid}>
                    <div style={styles.stat}>
                      <span style={styles.statLabel}>Fase Circadiana:</span>
                      <span style={styles.statValue}>
                        {current?.color.label}
                      </span>
                    </div>

                    <div style={styles.stat}>
                      <span style={styles.statLabel}>Temperatura (CCT):</span>
                      <span style={styles.statValue}>
                        {current?.color.cct}K
                      </span>
                    </div>

                    <div style={styles.stat}>
                      <span style={styles.statLabel}>Evento:</span>
                      <span style={styles.statValue}>
                        {current?.event_type
                          ? current.event_type === "meeting"
                            ? "📅 Reunião"
                            : current.event_type === "reading"
                              ? "📖 Leitura"
                              : current.event_type
                          : "—"}
                      </span>
                    </div>

                    <div style={styles.stat}>
                      <span style={styles.statLabel}>Acionado por:</span>
                      <span style={styles.statValue}>
                        {current?.triggered_by === "event"
                          ? "📅 Evento"
                          : "🌅 Cronotipo"}
                      </span>
                    </div>
                  </div>

                  <p style={styles.explanation}>{current?.explanation}</p>
                </div>

                <div style={styles.colorSection}>
                  <div
                    style={{
                      ...styles.colorDisplayBig,
                      backgroundColor: current
                        ? `rgb(${current.color.r}, ${current.color.g}, ${current.color.b})`
                        : "#111",
                    }}
                  />
                  <p style={styles.rgbDisplay}>
                    RGB({current?.color.r}, {current?.color.g},{" "}
                    {current?.color.b})
                  </p>
                </div>
              </div>

              {/* Timeline visual */}
              <div style={styles.timelineTrack}>
                {timeline.timeline.map((frame, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.timelineFrame,
                      backgroundColor:
                        idx === currentIndex
                          ? "#4a9eff"
                          : idx < currentIndex
                            ? "#666"
                            : "#333",
                      opacity: idx === currentIndex ? 1 : 0.6,
                    }}
                    title={`${frame.time} - ${frame.color.label}`}
                  />
                ))}
              </div>

              {/* Legenda */}
              <div style={styles.legend}>
                <div style={styles.legendItem}>
                  <span
                    style={{
                      ...styles.legendColor,
                      backgroundColor: "#ff9999",
                    }}
                  />
                  Reunião (10h)
                </div>
                <div style={styles.legendItem}>
                  <span
                    style={{
                      ...styles.legendColor,
                      backgroundColor: "#99ccff",
                    }}
                  />
                  Leitura (18h)
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#1a1a1a",
    padding: "24px",
    borderRadius: "12px",
    marginTop: "24px",
    color: "#fff",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    margin: "0",
    fontSize: "20px",
  },
  modeToggle: {
    display: "flex",
    gap: "8px",
    backgroundColor: "#2a2a2a",
    padding: "4px",
    borderRadius: "6px",
  },
  modeBtn: {
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "13px",
    transition: "all 0.2s",
  },
  content: {
    animation: "fadeIn 0.3s ease-in",
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "24px",
  },
  control: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  slider: {
    width: "100%",
    cursor: "pointer",
  },
  select: {
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #444",
    backgroundColor: "#2a2a2a",
    color: "#fff",
    cursor: "pointer",
  },
  value: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#4a9eff",
  },
  button: {
    padding: "12px 24px",
    backgroundColor: "#4a9eff",
    color: "#000",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  result: {
    backgroundColor: "#2a2a2a",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #444",
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    alignItems: "center",
  },
  info: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  colorPreview: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  colorBox: {
    width: "150px",
    height: "150px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    border: "2px solid #444",
  },
  rgbText: {
    fontSize: "14px",
    color: "#aaa",
    textAlign: "center",
    margin: "0",
  },
  explanation: {
    marginTop: "12px",
    padding: "12px",
    backgroundColor: "#1a1a1a",
    borderRadius: "6px",
    borderLeft: "3px solid #4a9eff",
    color: "#ddd",
    margin: "0",
  },
  animationContainer: {
    backgroundColor: "#2a2a2a",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #444",
  },
  progressBar: {
    width: "100%",
    height: "8px",
    backgroundColor: "#1a1a1a",
    borderRadius: "4px",
    overflow: "hidden",
    marginBottom: "20px",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4a9eff",
    transition: "width 0.1s linear",
  },
  displayPanel: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },
  infoSection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  timeDisplay: {
    margin: "0 0 8px 0",
    fontSize: "32px",
    fontWeight: "bold",
    color: "#4a9eff",
  },
  hourMarker: {
    fontSize: "18px",
    color: "#aaa",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    backgroundColor: "#1a1a1a",
    padding: "8px",
    borderRadius: "4px",
  },
  statLabel: {
    fontSize: "12px",
    color: "#888",
  },
  statValue: {
    fontSize: "14px",
    color: "#fff",
    fontWeight: "500",
  },
  colorSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  colorDisplayBig: {
    width: "150px",
    height: "150px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    border: "2px solid #444",
    transition: "background-color 0.1s",
  },
  rgbDisplay: {
    fontSize: "13px",
    color: "#aaa",
    margin: "0",
  },
  timelineTrack: {
    display: "flex",
    gap: "2px",
    marginBottom: "16px",
    height: "40px",
  },
  timelineFrame: {
    flex: 1,
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 0.1s",
  },
  legend: {
    display: "flex",
    gap: "20px",
    fontSize: "12px",
    color: "#aaa",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  legendColor: {
    width: "16px",
    height: "16px",
    borderRadius: "3px",
  },
};
