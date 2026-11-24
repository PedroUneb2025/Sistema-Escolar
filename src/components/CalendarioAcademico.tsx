import { useState, useMemo } from 'react';
import '../styles/calendarioAcademico.css';

interface EventoAcademico {
  id: string;
  diaInicio: number;
  diaFim?: number;
  mes: number; // 0-11
  ano: number;
  titulo: string;
  tipo?: 'feriado' | 'avaliacao' | 'academico';
}

const EVENTOS_ACADEMICOS: EventoAcademico[] = [
  // Novembro
  { id: '1', diaInicio: 2, mes: 10, ano: 2026, titulo: '02/11 - Finados', tipo: 'feriado' },
  { id: '2', diaInicio: 15, mes: 10, ano: 2026, titulo: '15/11 - Proclamação da República', tipo: 'feriado' },
  { id: '3', diaInicio: 19, mes: 10, ano: 2026, titulo: '19/11 - Avaliação 3: ET0024 - ESTRUTURAS DE DADOS (T01)', tipo: 'avaliacao' },
  { id: '4', diaInicio: 28, diaFim: 30, mes: 10, ano: 2026, titulo: '28/11 a 30/11 - VEM ME VER ANO II - UNEB CAMPUS VII', tipo: 'academico' },

  // Dezembro
  { id: '5', diaInicio: 8, mes: 11, ano: 2026, titulo: '08/12 - Avaliação Final e Encerramento do Período', tipo: 'avaliacao' },
  { id: '6', diaInicio: 25, mes: 11, ano: 2026, titulo: '25/12 - Natal', tipo: 'feriado' },

  // Outubro
  { id: '7', diaInicio: 12, mes: 9, ano: 2026, titulo: '12/10 - N. Sra. Aparecida (Feriado Nacional)', tipo: 'feriado' },
  { id: '8', diaInicio: 15, mes: 9, ano: 2026, titulo: '15/10 - Dia do Professor', tipo: 'academico' },
  { id: '9', diaInicio: 28, mes: 9, ano: 2026, titulo: '28/10 - Dia do Servidor Público', tipo: 'academico' },
];

const NOMES_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const DIAS_CABECALHO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function CalendarioAcademico() {
  // Padrão: Novembro de 2026 (conforme protótipo do SAGRES)
  const [dataAtual, setDataAtual] = useState(() => new Date(2026, 10, 23));

  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();

  const mesAnterior = () => {
    setDataAtual(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const proximoMes = () => {
    setDataAtual(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Eventos do mês atual
  const eventosDoMes = useMemo(() => {
    return EVENTOS_ACADEMICOS.filter(e => e.mes === mes && e.ano === ano);
  }, [mes, ano]);

  // Dias com evento para destacar no grid
  const diasComEvento = useMemo(() => {
    const dias = new Set<number>();
    eventosDoMes.forEach(e => {
      if (e.diaFim) {
        for (let d = e.diaInicio; d <= e.diaFim; d++) {
          dias.add(d);
        }
      } else {
        dias.add(e.diaInicio);
      }
    });
    return dias;
  }, [eventosDoMes]);

  // Estrutura das células do mês no calendário
  const celulasMes = useMemo(() => {
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDiasMes = new Date(ano, mes + 1, 0).getDate();
    const totalDiasMesAnterior = new Date(ano, mes, 0).getDate();

    const celulas: Array<{ dia: number; mesRelativo: 'anterior' | 'atual' | 'proximo' }> = [];

    // Dias do mês anterior
    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
      celulas.push({
        dia: totalDiasMesAnterior - i,
        mesRelativo: 'anterior',
      });
    }

    // Dias do mês atual
    for (let d = 1; d <= totalDiasMes; d++) {
      celulas.push({
        dia: d,
        mesRelativo: 'atual',
      });
    }

    // Dias do mês seguinte para completar as linhas (grid de 35 ou 42)
    const restante = (7 - (celulas.length % 7)) % 7;
    for (let d = 1; d <= restante; d++) {
      celulas.push({
        dia: d,
        mesRelativo: 'proximo',
      });
    }

    return celulas;
  }, [ano, mes]);

  // Dia de hoje
  const hojeReal = useMemo(() => new Date(), []);
  const ehHoje = (dia: number, mesRelativo: string) => {
    if (mesRelativo !== 'atual') return false;
    // No mock padrão de 2026, destaca o dia 23 (como no SAGRES) ou o dia atual real caso bata
    if (ano === 2026 && mes === 10 && dia === 23) return true;
    return hojeReal.getFullYear() === ano && hojeReal.getMonth() === mes && hojeReal.getDate() === dia;
  };

  return (
    <section className="sagres-calendario-card" aria-label="Calendário Acadêmico Institucional">
      <header className="sagres-calendario-header">
        <h3>Calendário Acadêmico</h3>
      </header>

      <div className="sagres-calendario-conteudo">
        {/* Lado Esquerdo: Mini Calendário */}
        <div className="sagres-mini-calendario-bloco">
          {/* Navegação de Mês */}
          <div className="sagres-mes-nav">
            <button
              type="button"
              className="nav-mes-btn"
              onClick={mesAnterior}
              aria-label="Mês anterior"
            >
              ‹
            </button>
            <span className="mes-ano-label">
              {NOMES_MESES[mes]} de {ano}
            </span>
            <button
              type="button"
              className="nav-mes-btn"
              onClick={proximoMes}
              aria-label="Próximo mês"
            >
              ›
            </button>
          </div>

          {/* Grid dos Dias */}
          <div className="sagres-dias-grid" role="grid" aria-label={`Dias de ${NOMES_MESES[mes]} de ${ano}`}>
            {/* Cabeçalho dos dias da semana D S T Q Q S S */}
            <div className="sagres-grid-linha-cabecalho" role="row">
              {DIAS_CABECALHO.map((dia, idx) => (
                <span key={`${dia}-${idx}`} className="dia-sigla-col" role="columnheader">
                  {dia}
                </span>
              ))}
            </div>

            {/* Células de Dias */}
            <div className="sagres-grid-dias-corpo" role="rowgroup">
              {celulasMes.map((c, idx) => {
                const temEvento = c.mesRelativo === 'atual' && diasComEvento.has(c.dia);
                const hoje = ehHoje(c.dia, c.mesRelativo);

                return (
                  <div
                    key={`${c.mesRelativo}-${c.dia}-${idx}`}
                    className={`celula-dia ${
                      c.mesRelativo !== 'atual' ? 'celula-dia--outro-mes' : ''
                    } ${temEvento ? 'celula-dia--evento' : ''} ${
                      hoje ? 'celula-dia--hoje' : ''
                    }`}
                    role="gridcell"
                  >
                    <span>{c.dia}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lado Direito: Lista de Eventos Acadêmicos do Mês */}
        <div className="sagres-eventos-lista-bloco" aria-label="Eventos do Mês">
          {eventosDoMes.length === 0 ? (
            <div className="sem-eventos-mes">
              <p>Nenhum evento registrado para este mês.</p>
            </div>
          ) : (
            <div className="eventos-cards-container">
              {eventosDoMes.map(ev => (
                <div key={ev.id} className="evento-item-card">
                  <span className="evento-marcador-seta" aria-hidden="true">▶</span>
                  <span className="evento-titulo-texto">{ev.titulo}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
