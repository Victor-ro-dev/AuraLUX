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
    if (isConnected) {
      console.log("[OutlookCard] Conectado ao Outlook, buscando eventos...");
      fetchEvents();
    }
  }, [isConnected, fetchEvents]);

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
      <div className="dash-card-title">Calendário Outlook</div>

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
              gap: "1rem",
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
                marginLeft: "auto",
              }}
            >
              Desconectar
            </button>
          </div>

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
          {(() => {
            // Filtrar eventos que já terminaram
            const now = new Date();
            const activeEvents = events.filter((ev) => {
              const endTime = new Date(ev.end);
              return endTime > now;
            });

            if (activeEvents.length === 0) {
              return (
                <p style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>
                  Nenhum evento no momento.
                </p>
              );
            }

            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {activeEvents.map((ev, i) => {
                  const startDate = new Date(ev.start);
                  const endDate = new Date(ev.end);
                  // Verificar se o evento cruza dias
                  const isMultiDay =
                    startDate.toDateString() !== endDate.toDateString();

                  const formatDateTime = (date) =>
                    date.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    }) +
                    " " +
                    date.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                  const formatTime = (date) =>
                    date.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                  return (
                    <div key={i} className="history-item">
                      <div className="history-info">
                        <div className="history-label">{ev.subject}</div>
                        <div className="history-meta">
                          {isMultiDay
                            ? `${formatDateTime(startDate)} → ${formatDateTime(endDate)}`
                            : `${startDate.toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                              })} ${formatTime(startDate)} → ${formatTime(endDate)}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
