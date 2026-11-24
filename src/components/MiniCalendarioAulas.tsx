import { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { consultaAcademicaService } from '../services/consultaAcademicaService';
import { getApiError } from '../services/apiError';
import { LoadingSpinner } from './LoadingSpinner';
import { Icon } from './Icon';
import '../styles/miniCalendario.css';

export interface AulaItem {
  id: string | number;
  codigoTurma: string;
  disciplinaCodigo: string;
  disciplinaNome: string;
  professorNome: string;
  sala: string;
  diaSemanaSigla: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB';
  horarioInicio: string;
  horarioFim: string;
  situacao: string;
  corIndex: number;
}

interface MatriculaTurmaInfo {
  id?: string;
  codigo?: string;
  disciplina?: string;
  professor?: string;
  sala?: string;
  diaSemana?: string;
  horarioInicio?: string;
  horarioFim?: string;
  semestre?: string;
}

interface MatriculaApiItem {
  id_matricula_turma?: number;
  id_turma?: number;
  codigo_turma?: string;
  disciplina_codigo?: string;
  disciplina_nome?: string;
  professor_nome?: string;
  sala_codigo?: string;
  dia_semana?: string;
  hora_inicio?: string;
  hora_fim?: string;
  semestre_letivo?: string;
  situacao?: string;
  turma?: MatriculaTurmaInfo;
}

const DIAS_COLUNAS = [
  { sigla: 'SEG' as const, nome: 'Segunda-feira', curto: 'SEG', diaIndex: 1 },
  { sigla: 'TER' as const, nome: 'Terça-feira', curto: 'TER', diaIndex: 2 },
  { sigla: 'QUA' as const, nome: 'Quarta-feira', curto: 'QUA', diaIndex: 3 },
  { sigla: 'QUI' as const, nome: 'Quinta-feira', curto: 'QUI', diaIndex: 4 },
  { sigla: 'SEX' as const, nome: 'Sexta-feira', curto: 'SEX', diaIndex: 5 },
  { sigla: 'SAB' as const, nome: 'Sábado', curto: 'SAB', diaIndex: 6 },
];

const CORES_DISCIPLINAS = [
  { bg: '#fef08a', border: '#eab308', text: '#713f12' }, // Amarelo
  { bg: '#bbf7d0', border: '#4ade80', text: '#14532d' }, // Verde claro
  { bg: '#fecdd3', border: '#fb7185', text: '#881337' }, // Coral / Salmão
  { bg: '#fed7aa', border: '#fb923c', text: '#7c2d12' }, // Laranja claro
  { bg: '#bfdbfe', border: '#60a5fa', text: '#1e3a8a' }, // Azul claro
  { bg: '#e9d5ff', border: '#c084fc', text: '#581c87' }, // Roxo claro
  { bg: '#cffafe', border: '#22d3ee', text: '#155e75' }, // Ciano claro
];

function normalizarSiglaDia(diaRaw: string | undefined): 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | null {
  if (!diaRaw) return null;
  const limpo = diaRaw.trim().toUpperCase();
  if (['SEG', 'SEGUNDA', 'SEGUNDA-FEIRA'].some(s => limpo.startsWith(s))) return 'SEG';
  if (['TER', 'TERCA', 'TERÇA', 'TERÇA-FEIRA', 'TERCA-FEIRA'].some(s => limpo.startsWith(s))) return 'TER';
  if (['QUA', 'QUARTA', 'QUARTA-FEIRA'].some(s => limpo.startsWith(s))) return 'QUA';
  if (['QUI', 'QUINTA', 'QUINTA-FEIRA'].some(s => limpo.startsWith(s))) return 'QUI';
  if (['SEX', 'SEXTA', 'SEXTA-FEIRA'].some(s => limpo.startsWith(s))) return 'SEX';
  if (['SAB', 'SABADO', 'SÁBADO'].some(s => limpo.startsWith(s))) return 'SAB';
  return null;
}

function formatarHora(horaRaw: string | undefined): string {
  if (!horaRaw) return '';
  return horaRaw.slice(0, 5);
}

export function MiniCalendarioAulas() {
  const [aulas, setAulas] = useState<AulaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carregarAulas = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let listaAulas: AulaItem[] = [];
      const codigosMap = new Map<string, number>();

      const getCorIndex = (codigo: string) => {
        if (!codigosMap.has(codigo)) {
          codigosMap.set(codigo, codigosMap.size % CORES_DISCIPLINAS.length);
        }
        return codigosMap.get(codigo)!;
      };

      try {
        const response = await api.get<MatriculaApiItem[]>('/matriculas/minhas');
        if (Array.isArray(response.data)) {
          listaAulas = response.data
            .filter(m => m.situacao === 'matriculado')
            .map(m => {
              const sigla = normalizarSiglaDia(m.dia_semana || m.turma?.diaSemana) || 'SEG';
              const codDisc = m.disciplina_codigo || m.turma?.codigo?.split('-')[0] || 'DISC';
              return {
                id: m.id_matricula_turma ?? m.id_turma ?? Math.random(),
                codigoTurma: m.codigo_turma ?? m.turma?.codigo ?? 'T01',
                disciplinaCodigo: codDisc,
                disciplinaNome: m.disciplina_nome ?? m.turma?.disciplina ?? 'Disciplina',
                professorNome: m.professor_nome ?? m.turma?.professor ?? 'A definir',
                sala: m.sala_codigo ?? m.turma?.sala ?? 'A definir',
                diaSemanaSigla: sigla,
                horarioInicio: formatarHora(m.hora_inicio ?? m.turma?.horarioInicio ?? '07:30'),
                horarioFim: formatarHora(m.hora_fim ?? m.turma?.horarioFim ?? '09:10'),
                situacao: m.situacao || 'matriculado',
                corIndex: getCorIndex(codDisc),
              };
            });
        }
      } catch {
        const itensAcademico = await consultaAcademicaService.obterConsultaAcademica();
        listaAulas = itensAcademico
          .filter(item => item.situacao === 'matriculado')
          .flatMap(item => {
            const corIdx = getCorIndex(item.disciplinaCodigo);
            return (item.horarios || []).map(h => {
              const sigla = normalizarSiglaDia(h.diaSemana) || 'SEG';
              return {
                id: `${item.idMatricula}-${h.diaSemanaNumero ?? sigla}`,
                codigoTurma: item.codigoTurma,
                disciplinaCodigo: item.disciplinaCodigo,
                disciplinaNome: item.disciplinaNome,
                professorNome: item.professorNome,
                sala: h.sala || item.sala,
                diaSemanaSigla: sigla,
                horarioInicio: formatarHora(h.horarioInicio),
                horarioFim: formatarHora(h.horarioFim),
                situacao: item.situacao,
                corIndex: corIdx,
              };
            });
          });
      }

      setAulas(listaAulas);
    } catch (err) {
      setError(getApiError(err, 'Erro ao carregar o calendário de horários.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarAulas();
  }, [carregarAulas]);

  const hojeIndex = useMemo(() => new Date().getDay(), []);

  // Lista única de disciplinas com cores para a legenda
  const disciplinasLegenda = useMemo(() => {
    const map = new Map<string, AulaItem>();
    aulas.forEach(a => {
      if (!map.has(a.disciplinaCodigo)) {
        map.set(a.disciplinaCodigo, a);
      }
    });
    return Array.from(map.values());
  }, [aulas]);

  // Horários únicos para as linhas da grade
  const faixasHorarios = useMemo(() => {
    const slots = new Set<string>();
    aulas.forEach(a => {
      slots.add(`${a.horarioInicio} - ${a.horarioFim}`);
    });
    const lista = Array.from(slots);
    if (lista.length === 0) {
      return [
        '07:30 - 08:20',
        '08:20 - 09:10',
        '09:10 - 10:00',
        '10:00 - 10:50',
        '10:50 - 11:40',
        '11:40 - 12:30',
        '13:30 - 14:20',
        '14:20 - 15:10',
      ];
    }
    return lista.sort();
  }, [aulas]);

  return (
    <section className="mini-calendario-section" aria-label="Mini calendário de aulas e horários">
      <div className="mini-calendario-card">
        {/* Cabeçalho no padrão UNEB SAGRES */}
        <header className="mini-calendario-header">
          <div>
            <span className="section-label">Quadro de Horários</span>
            <h2>Meus horários</h2>
            <p>Grade semanal com horários de aula, salas e turmas do semestre.</p>
          </div>
          <div className="mini-calendario-header__actions">
            <button
              type="button"
              className="mini-calendario-btn-refresh"
              onClick={carregarAulas}
              disabled={loading}
              aria-label="Atualizar horários"
            >
              <Icon name="clock" />
              <span>Atualizar</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="mini-calendario-alert-erro" role="alert">
            <span>{error}</span>
            <button type="button" onClick={carregarAulas}>
              Tentar novamente
            </button>
          </div>
        )}

        {loading ? (
          <div className="mini-calendario-loading" role="status" aria-label="Carregando horários">
            <LoadingSpinner />
            <span>Carregando grade de aulas...</span>
          </div>
        ) : aulas.length === 0 && !error ? (
          <div className="mini-calendario-vazio" role="region" aria-label="Sem aulas">
            <Icon name="clock" />
            <p>Você não possui aulas com matrícula ativa para este semestre.</p>
          </div>
        ) : (
          <>
            {/* Tabela de Grade de Horários (Grid estilo Sagres) */}
            <div className="sagres-grade-container" role="region" aria-label="Tabela de horários semanal">
              <table className="sagres-grade-tabela">
                <thead>
                  <tr>
                    <th scope="col" className="col-horario">
                      Horário
                    </th>
                    {DIAS_COLUNAS.map(dia => {
                      const ehHoje = hojeIndex === dia.diaIndex;
                      return (
                        <th
                          key={dia.sigla}
                          scope="col"
                          className={`col-dia ${ehHoje ? 'col-dia--hoje' : ''}`}
                        >
                          <div className="dia-col-header">
                            <span>{dia.curto}</span>
                            {ehHoje && <span className="badge-hoje-tag">Hoje</span>}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {faixasHorarios.map(faixa => {
                    const [iniFaixa] = faixa.split(' - ');
                    return (
                      <tr key={faixa}>
                        <td className="celula-horario">
                          <strong>{faixa}</strong>
                        </td>
                        {DIAS_COLUNAS.map(dia => {
                          const ehHoje = hojeIndex === dia.diaIndex;
                          // Aulas neste dia que iniciam neste horário ou cobrem a faixa
                          const aulasNesteSlot = aulas.filter(
                            a => a.diaSemanaSigla === dia.sigla && a.horarioInicio === iniFaixa
                          );

                          return (
                            <td
                              key={dia.sigla}
                              className={`celula-aula-slot ${ehHoje ? 'celula-aula-slot--hoje' : ''}`}
                            >
                              {aulasNesteSlot.length > 0 ? (
                                aulasNesteSlot.map(aula => {
                                  const cor = CORES_DISCIPLINAS[aula.corIndex];
                                  return (
                                    <div
                                      key={aula.id}
                                      className="bloco-aula-sagres"
                                      style={{
                                        backgroundColor: cor.bg,
                                        borderColor: cor.border,
                                        color: cor.text,
                                      }}
                                      title={`${aula.disciplinaCodigo} - ${aula.disciplinaNome} (${aula.sala})`}
                                    >
                                      <span className="bloco-cod-disc">{aula.disciplinaCodigo}</span>
                                      <span className="bloco-turma">{aula.codigoTurma}</span>
                                    </div>
                                  );
                                })
                              ) : (
                                <span className="slot-vazio-ponto" aria-hidden="true" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legenda detalhada de disciplinas e salas no padrão UNEB Sagres */}
            <div className="sagres-legenda-secao" aria-label="Legenda das disciplinas e salas">
              <h4 className="sagres-legenda-titulo">Detalhamento das Turmas e Salas</h4>
              <div className="sagres-legenda-grid">
                {disciplinasLegenda.map(item => {
                  const cor = CORES_DISCIPLINAS[item.corIndex];
                  return (
                    <div key={item.disciplinaCodigo} className="sagres-legenda-item">
                      <span
                        className="legenda-cor-indicador"
                        style={{ backgroundColor: cor.bg, borderColor: cor.border }}
                        aria-hidden="true"
                      />
                      <div className="legenda-detalhes">
                        <strong>
                          {item.disciplinaCodigo} - {item.disciplinaNome}
                        </strong>
                        <p>
                          {item.codigoTurma} :: DCET-II, {item.sala}
                          {item.professorNome ? ` · ${item.professorNome}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
