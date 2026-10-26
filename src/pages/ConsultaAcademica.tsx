import { useEffect, useState, useMemo } from 'react';
import { consultaAcademicaService } from '../services/consultaAcademicaService';
import type { ItemConsultaAcademica } from '../types/consultaAcademica';
import { Icon } from '../components/Icon';
import { getApiError } from '../services/apiError';
import '../styles/consultaAcademica.css';

const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function ConsultaAcademica() {
  const [itens, setItens] = useState<ItemConsultaAcademica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'unificado' | 'notas' | 'horarios'>('unificado');
  const [busca, setBusca] = useState('');
  const [semestreFiltro, setSemestreFiltro] = useState('todos');

  useEffect(() => {
    let ativo = true;
    async function carregarDados() {
      setLoading(true);
      setError('');
      try {
        const dados = await consultaAcademicaService.obterConsultaAcademica();
        if (ativo) {
          setItens(dados);
        }
      } catch (err) {
        if (ativo) {
          setError(getApiError(err, 'Não foi possível carregar os dados de notas e horários.'));
        }
      } finally {
        if (ativo) setLoading(false);
      }
    }
    carregarDados();
    return () => {
      ativo = false;
    };
  }, []);

  // Lista de semestres disponíveis nos dados
  const semestresDisponiveis = useMemo(() => {
    const sets = new Set(itens.map((i) => i.semestre));
    return Array.from(sets);
  }, [itens]);

  // Itens filtrados por busca e semestre
  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      const matchBusca =
        item.disciplinaNome.toLowerCase().includes(busca.toLowerCase()) ||
        item.disciplinaCodigo.toLowerCase().includes(busca.toLowerCase()) ||
        item.professorNome.toLowerCase().includes(busca.toLowerCase()) ||
        item.codigoTurma.toLowerCase().includes(busca.toLowerCase());

      const matchSemestre = semestreFiltro === 'todos' || item.semestre === semestreFiltro;

      return matchBusca && matchSemestre;
    });
  }, [itens, busca, semestreFiltro]);

  // Cálculo de médias e totais gerais
  const metricas = useMemo(() => {
    const comNota = itensFiltrados.filter((i) => typeof i.notaFinal === 'number' && i.notaFinal !== null);
    const mediaGeral = comNota.length
      ? (comNota.reduce((acc, i) => acc + (i.notaFinal ?? 0), 0) / comNota.length).toFixed(1)
      : '—';

    const comFreq = itensFiltrados.filter((i) => typeof i.frequencia === 'number' && i.frequencia !== null);
    const mediaFrequencia = comFreq.length
      ? `${Math.round(comFreq.reduce((acc, i) => acc + (i.frequencia ?? 0), 0) / comFreq.length)}%`
      : '—';

    const matriculadas = itensFiltrados.length;

    return { mediaGeral, mediaFrequencia, matriculadas };
  }, [itensFiltrados]);

  // Mapeamento de aulas por dia da semana
  const aulasPorDia = useMemo(() => {
    const mapa: Record<string, { aula: ItemConsultaAcademica; horario: ItemConsultaAcademica['horarios'][0] }[]> = {};
    DIAS_SEMANA.forEach((dia) => {
      mapa[dia] = [];
    });

    itensFiltrados.forEach((item) => {
      item.horarios.forEach((h) => {
        // Encontra o dia correto suportando nomes completos ou siglas
        const diaEncontrado = DIAS_SEMANA.find((d) =>
          d.toLowerCase().startsWith(h.diaSemana.toLowerCase().substring(0, 3))
        );
        if (diaEncontrado && mapa[diaEncontrado]) {
          mapa[diaEncontrado].push({ aula: item, horario: h });
        }
      });
    });

    // Ordena por horário de início
    Object.keys(mapa).forEach((dia) => {
      mapa[dia].sort((a, b) => a.horario.horarioInicio.localeCompare(b.horario.horarioInicio));
    });

    return mapa;
  }, [itensFiltrados]);

  const renderBadgeNota = (nota: number | null | undefined) => {
    if (nota === null || nota === undefined) {
      return <span className="badge-nota badge-nota--pendente">—</span>;
    }
    const classe =
      nota >= 7 ? 'badge-nota--boa' : nota >= 5 ? 'badge-nota--media' : 'badge-nota--baixa';
    return <span className={`badge-nota ${classe}`}>{nota.toFixed(1)}</span>;
  };

  const renderBadgeStatus = (situacao: ItemConsultaAcademica['situacao']) => {
    const labels: Record<string, { label: string; classe: string }> = {
      matriculado: { label: 'Cursando', classe: 'badge-status--matriculado' },
      aprovado: { label: 'Aprovado', classe: 'badge-status--aprovado' },
      reprovado_nota: { label: 'Reprovado por Nota', classe: 'badge-status--reprovado' },
      reprovado_falta: { label: 'Reprovado por Falta', classe: 'badge-status--reprovado' },
      trancado: { label: 'Trancado', classe: 'badge-status--trancado' },
    };
    const config = labels[situacao] || { label: situacao, classe: 'badge-status--matriculado' };
    return <span className={`badge-status ${config.classe}`}>{config.label}</span>;
  };

  return (
    <div className="consulta-academica">
      <header className="consulta-header">
        <div>
          <span className="section-label">Portal do Aluno</span>
          <h1>Consulta Acadêmica Unificada</h1>
          <p>Acompanhe suas notas, médias, frequência e horários de aula em um único lugar.</p>
        </div>
      </header>

      {/* Cards de Métricas Gerais */}
      <section className="consulta-metricas" aria-label="Indicadores de desempenho acadêmico">
        <article className="metrica-card">
          <div className="metrica-card__icone">
            <Icon name="book" size={24} />
          </div>
          <div className="metrica-card__info">
            <small>Disciplinas Cursadas</small>
            <strong>{metricas.matriculadas}</strong>
          </div>
        </article>

        <article className="metrica-card">
          <div className="metrica-card__icone">
            <Icon name="chart" size={24} />
          </div>
          <div className="metrica-card__info">
            <small>Média Geral de Notas</small>
            <strong>{metricas.mediaGeral}</strong>
          </div>
        </article>

        <article className="metrica-card">
          <div className="metrica-card__icone">
            <Icon name="check" size={24} />
          </div>
          <div className="metrica-card__info">
            <small>Frequência Média</small>
            <strong>{metricas.mediaFrequencia}</strong>
          </div>
        </article>
      </section>

      {/* Abas de Navegação */}
      <nav className="consulta-tabs" aria-label="Opções de visualização">
        <button
          type="button"
          className={`consulta-tab-btn ${abaAtiva === 'unificado' ? 'consulta-tab-btn--active' : ''}`}
          onClick={() => setAbaAtiva('unificado')}
        >
          <Icon name="home" size={18} />
          <span>Visão Geral Unificada</span>
        </button>
        <button
          type="button"
          className={`consulta-tab-btn ${abaAtiva === 'notas' ? 'consulta-tab-btn--active' : ''}`}
          onClick={() => setAbaAtiva('notas')}
        >
          <Icon name="chart" size={18} />
          <span>Boletim & Notas</span>
        </button>
        <button
          type="button"
          className={`consulta-tab-btn ${abaAtiva === 'horarios' ? 'consulta-tab-btn--active' : ''}`}
          onClick={() => setAbaAtiva('horarios')}
        >
          <Icon name="calendar" size={18} />
          <span>Grade Semanal de Horários</span>
        </button>
      </nav>

      {/* Filtros de Pesquisa */}
      <div className="consulta-filtros">
        <div className="filtro-busca">
          <Icon name="search" size={18} />
          <input
            type="search"
            placeholder="Buscar por disciplina, código ou professor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar disciplina ou professor"
          />
        </div>

        <select
          value={semestreFiltro}
          onChange={(e) => setSemestreFiltro(e.target.value)}
          aria-label="Filtrar por período/semestre"
        >
          <option value="todos">Todos os semestres</option>
          {semestresDisponiveis.map((s) => (
            <option key={s} value={s}>
              Semestre {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="screen-feedback" role="status">
          <div className="loading-spinner" />
          <p style={{ marginTop: '1rem' }}>Carregando dados acadêmicos...</p>
        </div>
      ) : error ? (
        <div role="alert" className="form-alert">
          {error}
        </div>
      ) : itensFiltrados.length === 0 ? (
        <div className="screen-feedback">
          <p>Nenhuma disciplina encontrada com os filtros selecionados.</p>
        </div>
      ) : (
        <>
          {/* VISÃO GERAL / NOTAS */}
          {(abaAtiva === 'unificado' || abaAtiva === 'notas') && (
            <section style={{ marginBottom: abaAtiva === 'unificado' ? '3rem' : '0' }}>
              <div className="section-heading">
                <div>
                  <span className="section-label">Rendimento Escolar</span>
                  <h2>Boletim de Notas e Frequência</h2>
                </div>
              </div>

              <div className="tabela-card">
                <table className="tabela-academica">
                  <caption className="sr-only">Tabela de Notas e Frequência</caption>
                  <thead>
                    <tr>
                      <th>Disciplina / Turma</th>
                      <th>Docente</th>
                      <th>Semestre</th>
                      <th style={{ textAlign: 'center' }}>Nota 1</th>
                      <th style={{ textAlign: 'center' }}>Nota 2</th>
                      <th style={{ textAlign: 'center' }}>Nota Final</th>
                      <th style={{ textAlign: 'center' }}>Frequência</th>
                      <th style={{ textAlign: 'center' }}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensFiltrados.map((item) => (
                      <tr key={item.idMatricula}>
                        <td>
                          <span className="disc-codigo">{item.disciplinaCodigo}</span>
                          <span className="disc-nome">{item.disciplinaNome}</span>
                          <small style={{ display: 'block', color: 'var(--muted)', fontSize: '0.74rem' }}>
                            Turma: {item.codigoTurma}
                          </small>
                        </td>
                        <td>{item.professorNome}</td>
                        <td>{item.semestre}</td>
                        <td style={{ textAlign: 'center' }}>{renderBadgeNota(item.nota1)}</td>
                        <td style={{ textAlign: 'center' }}>{renderBadgeNota(item.nota2)}</td>
                        <td style={{ textAlign: 'center' }}>{renderBadgeNota(item.notaFinal)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <strong>{item.frequencia !== null && item.frequencia !== undefined ? `${item.frequencia}%` : '—'}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>{renderBadgeStatus(item.situacao)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* GRADE SEMANAL DE HORÁRIOS */}
          {(abaAtiva === 'unificado' || abaAtiva === 'horarios') && (
            <section>
              <div className="section-heading">
                <div>
                  <span className="section-label">Horários e Salas</span>
                  <h2>Grade Semanal de Aulas</h2>
                </div>
              </div>

              <div className="grade-horarios">
                {DIAS_SEMANA.map((dia) => {
                  const aulas = aulasPorDia[dia] || [];
                  return (
                    <article key={dia} className="coluna-dia">
                      <div className="coluna-dia__titulo">
                        <span>{dia}</span>
                        <span className="coluna-dia__badge">{aulas.length} {aulas.length === 1 ? 'aula' : 'aulas'}</span>
                      </div>

                      <div className="coluna-dia__lista">
                        {aulas.length === 0 ? (
                          <div className="dia-vazio">Sem aulas agendadas</div>
                        ) : (
                          aulas.map(({ aula, horario }, idx) => (
                            <div key={`${aula.idMatricula}-${idx}`} className="card-aula">
                              <span className="card-aula__horario">
                                <Icon name="clock" size={14} />
                                {horario.horarioInicio} - {horario.horarioFim}
                              </span>
                              <div className="card-aula__disciplina">{aula.disciplinaNome}</div>
                              <div className="card-aula__meta">
                                <span>{horario.sala || aula.sala}</span>
                                <small style={{ fontWeight: 700 }}>{aula.codigoTurma}</small>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
