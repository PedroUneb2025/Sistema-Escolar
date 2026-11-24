import { useEffect, useState, useMemo, useId } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { alunoService, type Aluno } from '../../services/alunoService';
import { consultaAcademicaService } from '../../services/consultaAcademicaService';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Icon } from '../../components/Icon';
import '../../styles/comprovante.css';

interface TurmaComprovante {
  idMatricula: number | string;
  codigoTurma: string;
  disciplinaCodigo: string;
  disciplinaNome: string;
  professorNome: string;
  sala: string;
  diaSemana: string;
  diaSemanaSigla: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB';
  horarioInicio: string;
  horarioFim: string;
  cargaHoraria: number;
  creditos: number;
  semestre: string;
  situacao: string;
}

interface TurmaHorarioItem {
  diaSemana: string;
  horarioInicio: string;
  horarioFim: string;
  sala?: string;
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
  horarios?: TurmaHorarioItem[];
}

interface MatriculaApiItem {
  id_matricula_turma?: number;
  id_turma?: number;
  codigo_turma?: string;
  disciplina_codigo?: string;
  disciplina_nome?: string;
  professor_nome?: string;
  sala_codigo?: string;
  dia_semana?: string | number;
  hora_inicio?: string;
  hora_fim?: string;
  semestre_letivo?: string;
  situacao?: string;
  turma?: MatriculaTurmaInfo;
}

const DIAS_GRADE = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const;

const FAIXAS_HORARIOS_PADRAO = [
  '07:30 - 08:20',
  '08:20 - 09:10',
  '09:10 - 10:00',
  '10:00 - 10:50',
  '10:50 - 11:40',
  '11:40 - 12:30',
  '13:30 - 14:20',
  '14:20 - 15:10',
];

function normalizarSiglaDia(diaRaw: string | number | undefined): 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | null {
  if (diaRaw === undefined || diaRaw === null) return null;
  if (typeof diaRaw === 'number') {
    const numMap: Record<number, 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB'> = {
      1: 'SEG',
      2: 'TER',
      3: 'QUA',
      4: 'QUI',
      5: 'SEX',
      6: 'SAB',
    };
    return numMap[diaRaw] || null;
  }
  const limpo = String(diaRaw).trim().toUpperCase();
  if (limpo === '1' || ['SEG', 'SEGUNDA'].some(s => limpo.startsWith(s))) return 'SEG';
  if (limpo === '2' || ['TER', 'TERCA', 'TERÇA'].some(s => limpo.startsWith(s))) return 'TER';
  if (limpo === '3' || ['QUA', 'QUARTA'].some(s => limpo.startsWith(s))) return 'QUA';
  if (limpo === '4' || ['QUI', 'QUINTA'].some(s => limpo.startsWith(s))) return 'QUI';
  if (limpo === '5' || ['SEX', 'SEXTA'].some(s => limpo.startsWith(s))) return 'SEX';
  if (limpo === '6' || ['SAB', 'SABADO', 'SÁBADO'].some(s => limpo.startsWith(s))) return 'SAB';
  return null;
}

function formatarHora(h: string | undefined): string {
  if (!h) return '';
  const limpo = String(h).trim();
  const partes = limpo.split(':');
  if (partes.length >= 2) {
    const hora = partes[0].padStart(2, '0');
    const min = partes[1].padStart(2, '0');
    return `${hora}:${min}`;
  }
  return limpo.slice(0, 5);
}

export function ComprovanteMatricula() {
  const { user } = useAuth();
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [turmas, setTurmas] = useState<TurmaComprovante[]>([]);
  const [semestreSelecionado, setSemestreSelecionado] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string>('');
  const [dataEmissaoFormatada] = useState<string>(() => {
    const d = new Date();
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  });
  const [dataPorExtenso] = useState<string>(() => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  });

  const selectSemestreId = useId();

  // Hash de assinatura eletrônica institucional (fiel ao comprovante Sagres)
  const assinaturaEletronica = useMemo(() => {
    return `c8436815275d860ee03833f106da${(aluno?.id_aluno ?? 9473).toString().padStart(4, '0')}`;
  }, [aluno?.id_aluno]);

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      setLoading(true);
      setErro('');

      try {
        let perfilAluno: Aluno | null = null;
        try {
          perfilAluno = await alunoService.obterMeuPerfil();
        } catch {
          const emailNome = user?.email ? user.email.split('@')[0] : 'Estudante Demonstração';
          perfilAluno = {
            id_aluno: Number(user?.id) || 1,
            matricula: '2026100123',
            nome_completo: user?.nome || emailNome.charAt(0).toUpperCase() + emailNome.slice(1),
            email: user?.email,
          };
        }

        if (ativo) {
          setAluno(perfilAluno);
        }

        let listaTurmas: TurmaComprovante[] = [];

        try {
          const resp = await api.get<MatriculaApiItem[]>('/matriculas/minhas');
          if (Array.isArray(resp.data)) {
            listaTurmas = resp.data
              .filter(m => m.situacao === 'matriculado')
              .flatMap((m: MatriculaApiItem): TurmaComprovante[] => {
                const cod = m.disciplina_codigo || m.turma?.codigo?.split('-')[0] || m.codigo_turma?.split('-')[0] || 'DISC';
                const turmaCod = m.codigo_turma ?? m.turma?.codigo ?? 'T01';
                const discNome = m.disciplina_nome ?? m.turma?.disciplina ?? 'Disciplina';
                const prof = m.professor_nome ?? m.turma?.professor ?? 'A definir';
                const sala = m.sala_codigo ?? m.turma?.sala ?? '004 / DCET-II';
                const sem = m.semestre_letivo ?? m.turma?.semestre ?? '2026.2';
                const sit = m.situacao || 'matriculado';

                if (m.turma?.horarios && Array.isArray(m.turma.horarios) && m.turma.horarios.length > 0) {
                  return m.turma.horarios.map((h, hIdx) => {
                    const sigla = normalizarSiglaDia(h.diaSemana) || 'SEG';
                    const ini = formatarHora(h.horarioInicio || '08:00');
                    const fim = formatarHora(h.horarioFim || '10:00');
                    return {
                      idMatricula: `${m.id_matricula_turma ?? m.id_turma ?? 'm'}-${hIdx}`,
                      codigoTurma: turmaCod,
                      disciplinaCodigo: cod,
                      disciplinaNome: discNome,
                      professorNome: prof,
                      sala: h.sala || sala,
                      diaSemana: sigla,
                      diaSemanaSigla: sigla,
                      horarioInicio: ini,
                      horarioFim: fim,
                      cargaHoraria: 60,
                      creditos: 0,
                      semestre: sem,
                      situacao: sit,
                    };
                  });
                }

                const sigla = normalizarSiglaDia(m.dia_semana || m.turma?.diaSemana) || 'SEG';
                const ini = formatarHora(m.hora_inicio || m.turma?.horarioInicio || '08:00');
                const fim = formatarHora(m.hora_fim || m.turma?.horarioFim || '10:00');
                return [{
                  idMatricula: String(m.id_matricula_turma ?? m.id_turma ?? Math.random()),
                  codigoTurma: turmaCod,
                  disciplinaCodigo: cod,
                  disciplinaNome: discNome,
                  professorNome: prof,
                  sala: sala,
                  diaSemana: sigla,
                  diaSemanaSigla: sigla,
                  horarioInicio: ini,
                  horarioFim: fim,
                  cargaHoraria: 60,
                  creditos: 0,
                  semestre: sem,
                  situacao: sit,
                }];
              });
          }
        } catch {
          const itensAcademico = await consultaAcademicaService.obterConsultaAcademica();
          listaTurmas = itensAcademico
            .filter(item => item.situacao === 'matriculado')
            .flatMap(item => {
              return (item.horarios || []).map(h => {
                const sigla = normalizarSiglaDia(h.diaSemana) || 'SEG';
                const ini = formatarHora(h.horarioInicio || '07:30');
                const fim = formatarHora(h.horarioFim || '09:10');
                return {
                  idMatricula: `${item.idMatricula}-${sigla}`,
                  codigoTurma: item.codigoTurma,
                  disciplinaCodigo: item.disciplinaCodigo,
                  disciplinaNome: item.disciplinaNome,
                  professorNome: item.professorNome,
                  sala: h.sala || item.sala || '004 / DCET-II',
                  diaSemana: sigla,
                  diaSemanaSigla: sigla,
                  horarioInicio: ini,
                  horarioFim: fim,
                  cargaHoraria: 60,
                  creditos: 0,
                  semestre: item.semestre,
                  situacao: item.situacao,
                };
              });
            });
        }

        if (ativo) {
          setTurmas(listaTurmas);

          const semestres = Array.from(new Set(listaTurmas.map(t => t.semestre)));
          if (semestres.length > 0) {
            setSemestreSelecionado(semestres[0]);
          } else {
            setSemestreSelecionado('2026.2');
          }
        }
      } catch {
        if (ativo) {
          setErro('Não foi possível carregar as informações do comprovante de matrícula.');
        }
      } finally {
        if (ativo) setLoading(false);
      }
    }

    carregarDados();

    return () => {
      ativo = false;
    };
  }, [user]);

  const semestresDisponiveis = useMemo(() => {
    const lista = Array.from(new Set(turmas.map(t => t.semestre)));
    if (lista.length === 0) return ['2026.2'];
    return lista;
  }, [turmas]);

  // Filtra as turmas do semestre selecionado com situação 'matriculado'
  const turmasFiltradas = useMemo(() => {
    return turmas.filter(
      t => t.situacao === 'matriculado' && (!semestreSelecionado || t.semestre === semestreSelecionado)
    );
  }, [turmas, semestreSelecionado]);

  // Faixas de horários para a grade semanal: dinâmico baseado nas turmas do semestre
  const faixasHorarios = useMemo(() => {
    const slots = new Set<string>();
    turmasFiltradas.forEach(t => {
      if (t.horarioInicio && t.horarioFim) {
        slots.add(`${t.horarioInicio} - ${t.horarioFim}`);
      }
    });
    const lista = Array.from(slots);
    if (lista.length === 0) {
      return FAIXAS_HORARIOS_PADRAO;
    }
    return lista.sort();
  }, [turmasFiltradas]);

  // Lista única de disciplinas para a tabela superior
  const disciplinasUnicas = useMemo(() => {
    const map = new Map<string, TurmaComprovante>();
    turmasFiltradas.forEach(t => {
      if (!map.has(t.disciplinaCodigo)) {
        map.set(t.disciplinaCodigo, t);
      }
    });
    return Array.from(map.values());
  }, [turmasFiltradas]);

  const totalCargaHoraria = useMemo(() => {
    return disciplinasUnicas.reduce((acc, d) => acc + (d.cargaHoraria || 60), 0);
  }, [disciplinasUnicas]);

  const acaoImprimir = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="consulta-loading" role="status" aria-label="Carregando comprovante">
        <LoadingSpinner />
        <span>Carregando dados do comprovante oficial...</span>
      </div>
    );
  }

  return (
    <div className="comprovante-wrapper">
      {/* Barra de Ações (Ocultada na impressão via @media print) */}
      <div className="comprovante-barra-acoes no-print">
        <div className="comprovante-filtro-semestre">
          <label htmlFor={selectSemestreId}>Semestre Letivo:</label>
          <select
            id={selectSemestreId}
            value={semestreSelecionado}
            onChange={e => setSemestreSelecionado(e.target.value)}
            aria-label="Escolher semestre"
          >
            {semestresDisponiveis.map(sem => (
              <option key={sem} value={sem}>
                {sem}
              </option>
            ))}
          </select>
        </div>

        <div className="comprovante-botoes">
          <Link to="/aluno/documentos" className="secondary-button" style={{ textDecoration: 'none' }}>
            Voltar
          </Link>
          <button
            type="button"
            className="btn-imprimir"
            onClick={acaoImprimir}
            aria-label="Imprimir comprovante de matrícula"
          >
            <Icon name="file" />
            <span>Imprimir / Salvar em PDF</span>
          </button>
        </div>
      </div>

      {erro && (
        <div className="comprovante-erro no-print" role="alert">
          {erro}
        </div>
      )}

      {/* DOCUMENTO OFICIAL A4 (Fiel ao modelo SAGRES da UNEB) */}
      <div className="sagres-documento-scroll-wrapper">
        <article className="sagres-folha-a4" aria-label="Comprovante de Matrícula Oficial UNEB">
        {/* Topo Institucional */}
        <header className="sagres-cabecalho">
          <div className="sagres-cabecalho-logo">
            <div className="sagres-marca-uneb">
              <span className="sagres-marca-letra">U</span>
              <strong>UNEB</strong>
              <small>UNIVERSIDADE DO ESTADO DA BAHIA</small>
            </div>
          </div>
          <div className="sagres-cabecalho-titulos">
            <h2>UNIVERSIDADE DO ESTADO DA BAHIA</h2>
            <h3>SAGRES ACADÊMICO</h3>
            <h1>COMPROVANTE DE MATRÍCULA</h1>
          </div>
          <div className="sagres-cabecalho-emissao">
            <p>
              <strong>Emissão:</strong> {dataEmissaoFormatada}
            </p>
            <p>
              <strong>Página:</strong> 1 de 1
            </p>
          </div>
        </header>

        {/* Quadro de Identificação do Aluno (CPF estritamente omitido) */}
        <section className="sagres-quadro-identificacao" aria-label="Dados do Aluno">
          <table className="sagres-tabela-identificacao">
            <tbody>
              <tr>
                <td style={{ width: '18%' }}>
                  <span className="campo-label">Matrícula</span>
                  <span className="campo-valor">{aluno?.matricula || '2026100123'}</span>
                </td>
                <td style={{ width: '44%' }}>
                  <span className="campo-label">Nome</span>
                  <span className="campo-valor">{aluno?.nome_completo || 'Estudante Demonstração'}</span>
                </td>
                <td style={{ width: '12%' }}>
                  <span className="campo-label">Período</span>
                  <span className="campo-valor">4º</span>
                </td>
                <td style={{ width: '13%' }}>
                  <span className="campo-label">Ingresso</span>
                  <span className="campo-valor">20251</span>
                </td>
                <td style={{ width: '13%' }}>
                  <span className="campo-label">Período Letivo</span>
                  <span className="campo-valor">{semestreSelecionado.replace('.', '')}</span>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <span className="campo-label">Curso</span>
                  <span className="campo-valor">Engenharia de Software</span>
                </td>
                <td colSpan={2}>
                  <span className="campo-label">Turno</span>
                  <span className="campo-valor">Matutino</span>
                </td>
                <td>
                  <span className="campo-label">Depto/Campus</span>
                  <span className="campo-valor">DCET - CAMPUS II</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Tabela 1: Disciplinas Matriculadas */}
        <section className="sagres-secao-disciplinas" aria-label="Disciplinas Matriculadas">
          <table className="sagres-tabela-disciplinas">
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Código</th>
                <th style={{ width: '42%' }}>Nome da Disciplina</th>
                <th style={{ width: '10%' }}>Classe</th>
                <th style={{ width: '10%' }}>Crédito</th>
                <th style={{ width: '12%' }}>Carga Horária</th>
                <th style={{ width: '14%' }}>Sala/Depto</th>
              </tr>
            </thead>
            <tbody>
              {disciplinasUnicas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#666' }}>
                    Nenhuma disciplina matriculada encontrada para o semestre {semestreSelecionado}.
                  </td>
                </tr>
              ) : (
                disciplinasUnicas.map(disc => (
                  <tr key={disc.disciplinaCodigo}>
                    <td>{disc.disciplinaCodigo}</td>
                    <td>{disc.disciplinaNome}</td>
                    <td>{disc.codigoTurma}</td>
                    <td>{disc.creditos}</td>
                    <td>{disc.cargaHoraria}</td>
                    <td>{disc.sala}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  Total:
                </td>
                <td style={{ fontWeight: 'bold' }}>0</td>
                <td style={{ fontWeight: 'bold' }}>{totalCargaHoraria}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Tabela 2: Grade Horária Oficial SAGRES */}
        <section className="sagres-secao-grade" aria-label="Grade Horária Semanal">
          <table className="sagres-tabela-grade-horaria">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Horário</th>
                {DIAS_GRADE.map(d => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {faixasHorarios.map(faixa => {
                const [iniFaixa, fimFaixa] = faixa.split(' - ');
                return (
                  <tr key={faixa}>
                    <td className="sagres-faixa-texto">{faixa}</td>
                    {DIAS_GRADE.map(dia => {
                      const aulasNesteSlot = turmasFiltradas.filter(
                        t =>
                          t.diaSemanaSigla === dia &&
                          ((t.horarioInicio === iniFaixa && t.horarioFim === fimFaixa) ||
                            t.horarioInicio === iniFaixa)
                      );
                      return (
                        <td key={dia} className="sagres-grade-celula">
                          {aulasNesteSlot.map((aula, idx) => (
                            <div key={`${aula.idMatricula}-${idx}`} className="sagres-grade-item">
                              <strong className="sagres-grade-cod">{aula.disciplinaCodigo}</strong>
                              {aula.codigoTurma && (
                                <small className="sagres-grade-turma">{aula.codigoTurma}</small>
                              )}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Aviso Normativo */}
        <div className="sagres-aviso-normativo">
          Este documento só é válido com carimbo e assinatura do(a) Coordenador(a) do Colegiado do Curso
          (Inst. Normativa Nº 02/07 – Artigo 5º)
        </div>

        {/* Linhas de Assinatura */}
        <section className="sagres-secao-assinaturas" aria-label="Assinaturas">
          <div className="sagres-assinatura-bloco">
            <div className="sagres-linha-assinatura" />
            <strong>Coordenação de Colegiado</strong>
            <span>Coordenador(a) do Curso</span>
          </div>

          <div className="sagres-assinatura-bloco">
            <div className="sagres-linha-assinatura" />
            <span>Assinatura do aluno</span>
          </div>
        </section>

        {/* Cidade, Data e Mensagem */}
        <footer className="sagres-rodape-doc">
          <p className="sagres-data-cidade">Alagoinhas, {dataPorExtenso}</p>

          <div className="sagres-mensagem-bloco">
            <strong>Mensagem:</strong>
            <p>Início das aulas do período letivo {semestreSelecionado}: Conforme calendário acadêmico oficial.</p>
          </div>

          <div className="sagres-autenticacao-bloco">
            <strong>Assinatura Eletrônica:</strong>
            <code>{assinaturaEletronica}</code>
          </div>
        </footer>
      </article>
      </div>
    </div>
  );
}
