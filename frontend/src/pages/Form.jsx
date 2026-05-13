import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { updateChronotype } from "../services/userApi";
import "../styles/Form.css";

const STEPS = [
  {
    id: "wake_pref",
    label: "Passo 1 de 5",
    question: "Em dias livres, que horas você naturalmente acorda?",
    options: [
      { label: "Antes das 6h", score: 2 },
      { label: "6h — 8h", score: 1 },
      { label: "8h — 10h", score: -1 },
      { label: "Após 10h", score: -2 },
    ],
  },
  {
    id: "peak_prod",
    label: "Passo 2 de 5",
    question: "Quando você se sente mais produtivo e focado?",
    options: [
      { label: "Manhã cedo (6h–9h)", score: 2 },
      { label: "Manhã (9h–12h)", score: 1 },
      { label: "Tarde (13h–17h)", score: -1 },
      { label: "Noite (19h+)", score: -2 },
    ],
  },
  {
    id: "morning_feel",
    label: "Passo 3 de 5",
    question: "Como você se sente na primeira hora após acordar?",
    options: [
      { label: "Alerta e pronto para começar", score: 2 },
      { label: "Razoavelmente bem", score: 1 },
      { label: "Um pouco cansado", score: -1 },
      { label: "Muito difícil funcionar", score: -2 },
    ],
  },
  {
    id: "sleep_pref",
    label: "Passo 4 de 5",
    question: "Que horas você naturalmente vai dormir em dias livres?",
    options: [
      { label: "Antes das 22h", score: 2 },
      { label: "22h — 23h", score: 1 },
      { label: "23h — 01h", score: -1 },
      { label: "Após 01h", score: -2 },
    ],
  },
  {
    id: "device_id",
    label: "Passo 5 de 5",
    question: "ID do seu dispositivo AuraLUX (ESP32)",
    type: "text",
    placeholder: "Ex: device001",
    hint: "Encontre o ID no display ou etiqueta do dispositivo. Deixe em branco para configurar depois.",
  },
];

export default function ChronotypeForm() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [deviceId, setDeviceId] = useState("");
  const [loading, setLoading] = useState(false);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const isTextStep = currentStep.type === "text";

  const handleOption = (score) => {
    setAnswers((prev) => ({ ...prev, [currentStep.id]: score }));
  };

  const canAdvance = isTextStep ? true : answers[currentStep.id] !== undefined;

  const handleNext = async () => {
    if (isLastStep) {
      await submit();
    } else {
      setStep((s) => s + 1);
    }
  };

  const submit = async () => {
    setLoading(true);
    const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0);
    const chronotype = totalScore >= 0 ? "morning" : "evening";

    try {
      const updated = await updateChronotype(user.token, {
        chronotype,
        device_id: deviceId || undefined,
        wake_time: chronotype === "morning" ? "06:00" : "08:00",
        sleep_time: chronotype === "morning" ? "22:00" : "00:00",
      });
      setUser((prev) => ({ ...prev, ...updated }));
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <div className="form-header">
          <div className="form-brand">AuraLUX</div>
          <div className="form-title">Calibração de Cronotipo</div>
        </div>

        {/* Barra de progresso */}
        <div className="form-progress">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`form-progress-dot ${i === step ? "active" : i < step ? "done" : ""}`}
            />
          ))}
        </div>

        <div className="form-step-label">{currentStep.label}</div>
        <p className="form-question">{currentStep.question}</p>

        {isTextStep ? (
          <div>
            <input
              type="text"
              placeholder={currentStep.placeholder}
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="form-input-field"
            />
            {currentStep.hint && (
              <p className="form-input-hint">{currentStep.hint}</p>
            )}
          </div>
        ) : (
          <div className="form-options">
            {currentStep.options.map((opt) => (
              <button
                key={opt.label}
                className={`form-option ${answers[currentStep.id] === opt.score ? "selected" : ""}`}
                onClick={() => handleOption(opt.score)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="form-nav">
          {step > 0 && (
            <button
              className="form-btn-back"
              onClick={() => setStep((s) => s - 1)}
            >
              ← Voltar
            </button>
          )}
          <button
            className="form-btn-next"
            onClick={handleNext}
            disabled={!canAdvance || loading}
          >
            {loading ? "Salvando..." : isLastStep ? "Concluir →" : "Próximo →"}
          </button>
        </div>
      </div>
    </div>
  );
}
