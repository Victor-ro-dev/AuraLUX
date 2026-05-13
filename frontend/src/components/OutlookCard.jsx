import { useEffect } from "react";
import { useOutlook } from "../hooks/useOutlook";

export default function OutlookCard() {
  const {
    isConnected,
    syncing,
    events,
    connect,
    disconnect,
    fetchEvents,
    syncLight,
  } = useOutlook();

  useEffect(() => {
    if (isConnected) fetchEvents();
  }, [isConnected]);

  const handleConnect = async () => {
    const token = await connect();
    if (token) fetchEvents(token);
  };

  const handleSync = async () => {
    const result = await syncLight();
    if (result) {
      alert(
        `Luz ajustada: ${result.command?.label || "Auto"} (${result.event_type || "fase circadiana"})`,
      );
    }
  };

  return (
    <div className="dash-card">
      <div className="dash-card-title">Outlook Calendar</div>

      {!isConnected ? (
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.82rem",
              marginBottom: "1.2rem",
              letterSpacing: "0.5px",
            }}
          >
            Conecte sua conta Microsoft para ajustar a luz automaticamente com
            base nos seus compromissos.
          </p>
          <button className="auto-btn" onClick={handleConnect}>
            ⬡ Conectar Outlook
          </button>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <span className="phase-badge">
              <span className="phase-dot" />
              Outlook Conectado
            </span>
            <button
              onClick={disconnect}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: "0.72rem",
                letterSpacing: "1px",
                cursor: "pointer",
              }}
            >
              Desconectar
            </button>
          </div>

          <button
            className="auto-btn"
            onClick={handleSync}
            disabled={syncing}
            style={{ marginBottom: "1rem" }}
          >
            {syncing ? "⟳ Sincronizando..." : "◎ Ajustar Luz pelo Calendário"}
          </button>

          {/* Eventos ativos */}
          <div
            style={{
              fontSize: "0.68rem",
              letterSpacing: "2px",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              marginBottom: "0.6rem",
            }}
          >
            Eventos Agora
          </div>
          {events.length === 0 ? (
            <p style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>
              Nenhum evento no momento.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {events.map((ev, i) => (
                <div key={i} className="history-item">
                  <div className="history-info">
                    <div className="history-label">{ev.subject}</div>
                    <div className="history-meta">
                      {new Date(ev.start).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" → "}
                      {new Date(ev.end).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
