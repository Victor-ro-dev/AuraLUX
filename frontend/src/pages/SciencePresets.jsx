import { Link } from "react-router-dom";
import "../styles/SciencePresets.css";

export default function SciencePresets() {
  return (
    <div className="science-page">
      {/* Header */}
      <div className="science-header">
        <Link to="/login" className="science-logo">
          AuraLUX
        </Link>
        <h1>🔬 Validação Científica dos Presets</h1>
        <p className="science-subtitle">
          Entenda a ciência por trás de cada preset circadiano
        </p>
      </div>

      <div className="science-container">
        {/* Foco Profundo */}
        <section className="science-section">
          <div className="section-icon">🟦</div>
          <h2>Foco Profundo & Trabalho (Luz Branca / Azulada)</h2>

          <div className="subsection">
            <h3>O que a ciência diz</h3>
            <p>
              A luz com alta composição de ondas azuis (comprimento de onda em
              torno de <strong>460–480 nm</strong>) ativa fortemente as
              proteínas chamadas melanopsinas nas ipRGCs. Essa ativação envia um
              sinal direto para o<strong> Núcleo Supraquiasmático</strong> (o
              relógio central do cérebro), suprimindo imediatamente a produção
              de melatonina (hormônio do sono) e estimulando a liberação de
              cortisol e grau de alerta.
            </p>
          </div>

          <div className="subsection">
            <h3>Aplicação no seu MVP</h3>
            <p>
              O preset "Foco Profundo" (azul claro/branco frio) e "Trabalho" são
              perfeitos para os momentos em que o calendário do Outlook indicar
              alta demanda cognitiva. Eles aumentam a performance, a velocidade
              de processamento de informações e reduzem a fadiga mental.
            </p>
          </div>
        </section>

        {/* Neutro & Reunião */}
        <section className="science-section">
          <div className="section-icon">🟨</div>
          <h2>Neutro & Reunião (Luz Neutra / Amarelada Suave)</h2>

          <div className="subsection">
            <h3>O que a ciência diz</h3>
            <p>
              Ambientes corporativos ou de interação social se beneficiam de uma
              iluminação equilibrada. Luzes extremamente frias por períodos
              prolongados podem causar estresse visual e ansiedade. Uma
              transição para temperaturas intermediárias (em torno de{" "}
              <strong>3500K–4000K</strong>) mantém o estado de alerta, mas reduz
              a resposta ao estresse físico.
            </p>
          </div>

          <div className="subsection">
            <h3>Aplicação no seu MVP</h3>
            <p>
              O preset "Reunião" e "Neutro" servem como uma zona de transição
              perfeita. Em uma reunião de alinhamento ou após o almoço, essa luz
              mantém o usuário focado sem o "hiper-estímulo" do azul puro, ideal
              para o gerenciamento de energia ao longo do dia.
            </p>
          </div>
        </section>

        {/* Acordar */}
        <section className="science-section">
          <div className="section-icon">🟧</div>
          <h2>Acordar (Luz Laranja / Âmbar Progressiva)</h2>

          <div className="subsection">
            <h3>O que a ciência diz</h3>
            <p>
              Estudos sobre "Simuladores de Amanhecer" (<em>Dawn Simulation</em>
              ) mostram que ser exposto a uma luz que aumenta gradualmente de
              intensidade e muda de tons quentes (laranja/amarelo) para tons
              mais claros melhora significativamente a transição do sono para a
              vigília. Isso reduz a inércia do sono (aquela sensação de grogue
              ao despertar) e melhora o humor matinal.
            </p>
          </div>

          <div className="subsection">
            <h3>Aplicação no seu MVP</h3>
            <p>
              Se o formulário do usuário indicar que ele é vespertino e precisa
              acordar às 7h, o sistema pode ativar o preset "Acordar" de forma
              suave 15-30 minutos antes do alarme, preparando o corpo
              biologicamente para despertar.
            </p>
          </div>
        </section>

        {/* Relaxamento & Preparar Sono */}
        <section className="science-section">
          <div className="section-icon">🟧</div>
          <h2>Relaxamento & Preparar Sono (Luz Laranja Escuro / Vermelha)</h2>

          <div className="subsection">
            <h3>O que a ciência diz</h3>
            <p>
              Esta é a parte mais crítica do controle de melatonina. A luz
              vermelha e o laranja escuro possuem comprimentos de onda longos (
              <strong>&gt;600 nm</strong>), os quais não ativam as ipRGCs. Como
              o cérebro não detecta o espectro azul, ele interpreta o ambiente
              como "noite total" e inicia a secreção natural de melatonina cerca
              de 2 horas antes do horário de dormir.
            </p>
          </div>

          <div className="subsection">
            <h3>Aplicação no seu MVP</h3>
            <p>
              Os botões "Relaxamento" e "Preparar Sono" são o coração da higiene
              do sono do seu projeto. Eles devem ser ativados automaticamente na
              sua aplicação Python quando o horário da noite chegar (ajustado
              mais cedo para matutinos e um pouco mais tarde para vespertino) ou
              após o último compromisso do Outlook no dia.
            </p>
          </div>
        </section>

        {/* Resumo Técnico */}
        <section className="science-section tech-summary">
          <div className="section-icon">🛠️</div>
          <h2>Resumo Técnico para Programação (Cores RGB)</h2>

          <p>
            Para ajudar a traduzir isso para o código que o Python vai enviar
            via MQTT para o ESP32, aqui está uma sugestão de mapeamento dos
            canais RGB com base na sua imagem:
          </p>

          <table className="science-table">
            <thead>
              <tr>
                <th>Preset</th>
                <th>Sugestão de Cor Física</th>
                <th>Efeito Biológico Principal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Acordar</td>
                <td>Laranja Quente (R:255, G:100, B:0)</td>
                <td>Bloqueio gradual da inércia do sono</td>
              </tr>
              <tr>
                <td>Trabalho</td>
                <td>Branco Dinâmico (R:255, G:255, B:200)</td>
                <td>Manutenção do estado de alerta estável</td>
              </tr>
              <tr>
                <td>Foco Profundo</td>
                <td>Branco Frio / Azul Claro (R:180, G:220, B:255)</td>
                <td>Supressão máxima de melatonina / Foco total</td>
              </tr>
              <tr>
                <td>Reunião</td>
                <td>Amarelado Confortável (R:255, G:210, B:130)</td>
                <td>Equilíbrio entre atenção e redução de estresse</td>
              </tr>
              <tr>
                <td>Neutro</td>
                <td>Luz Natural (R:255, G:230, B:170)</td>
                <td>Baseline para momentos sem tarefas críticas</td>
              </tr>
              <tr>
                <td>Relaxamento</td>
                <td>Âmbar Suave (R:200, G:80, B:0)</td>
                <td>Início da desaceleração metabólica</td>
              </tr>
              <tr>
                <td>Preparar Sono</td>
                <td>Vermelho/Laranja Intenso (R:150, G:30, B:0)</td>
                <td>Liberação livre de melatonina no organismo</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      {/* Footer */}
      <div className="science-footer">
        <p>
          🔗 <Link to="/dashboard">Voltar ao Dashboard</Link>
        </p>
      </div>
    </div>
  );
}
