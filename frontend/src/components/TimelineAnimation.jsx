import React, { useState, useEffect } from "react";
import axios from "axios";

export default function TimelineAnimation() {
  const [chronotype, setChronotype] = useState("morning");
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeline, setTimeline] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const startAnimation = async () => {
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

  useEffect(() => {
    if (!isPlaying || !timeline) return;

    const duration = timeline.duration_seconds * 1000; // em ms
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
      <h2>⏱️ Animação 24h (20 segundos)</h2>

      <div style={styles.controls}>
        <div style={styles.controlRow}>
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
          onClick={startAnimation}
          style={{
            ...styles.playButton,
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
            {/* Info à esquerda */}
            <div style={styles.infoSection}>
              <h3 style={styles.timeDisplay}>
                {current?.time}{" "}
                <span style={styles.hourMarker}>(Hora {current?.hour})</span>
              </h3>

              <div style={styles.statsGrid}>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Fase Circadiana:</span>
                  <span style={styles.statValue}>{current?.color.label}</span>
                </div>

                <div style={styles.stat}>
                  <span style={styles.statLabel}>Temperatura (CCT):</span>
                  <span style={styles.statValue}>{current?.color.cct}K</span>
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

            {/* Cor à direita */}
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
                RGB({current?.color.r}, {current?.color.g}, {current?.color.b})
              </p>
            </div>
          </div>

          {/* Timeline visual (horas do dia) */}
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

          {/* Legenda de eventos */}
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <span
                style={{ ...styles.legendColor, backgroundColor: "#ff9999" }}
              />
              Reunião (10h)
            </div>
            <div style={styles.legendItem}>
              <span
                style={{ ...styles.legendColor, backgroundColor: "#99ccff" }}
              />
              Leitura (18h)
            </div>
          </div>
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
  controls: {
    display: "flex",
    gap: "16px",
    marginBottom: "24px",
    alignItems: "flex-end",
  },
  controlRow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  select: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #444",
    backgroundColor: "#2a2a2a",
    color: "#fff",
    cursor: "pointer",
  },
  playButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "6px",
    color: "#000",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s",
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
  explanation: {
    padding: "12px",
    backgroundColor: "#1a1a1a",
    borderRadius: "6px",
    borderLeft: "3px solid #4a9eff",
    margin: "0",
    fontSize: "13px",
    color: "#ddd",
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
