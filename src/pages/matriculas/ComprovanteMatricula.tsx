import { useEffect, useState, useMemo, useId } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { alunoService, type Aluno } from '../../services/alunoService';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Icon } from '../../components/Icon';
import '../../styles/comprovante.css';

const DIAS_GRADE = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const;
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).transform(valor => valor.slice(0, 5));
const turmaSchema = z.object({
  id_matricula_turma: z.number().int().positive(),
  semestre_letivo: z.string().min(1),
  codigo_turma: z.string().min(1),
  disciplina_codigo: z.string().min(1),
  disciplina_nome: z.string().min(1),
  sala_codigo: z.string(),
  dia_semana: z.enum(DIAS_GRADE),
  hora_inicio: hora,
  hora_fim: hora,
  situacao: z.string(),
});
type TurmaComprovante = z.infer<typeof turmaSchema>;

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

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      setLoading(true);
      setErro('');
      setAluno(null);

      try {
        const perfilAluno = await alunoService.obterMeuPerfil();
        if (!ativo) return;
        if (!Number.isInteger(perfilAluno?.id_aluno) || perfilAluno.id_aluno <= 0 ||
            !perfilAluno.matricula?.trim() || !perfilAluno.nome_completo?.trim()) {
          throw new Error('Cadastro de aluno incompleto.');
        }
        setAluno(perfilAluno);

        const { data } = await api.get('/matriculas/minhas');
        const listaTurmas = z.array(turmaSchema).parse(data).filter(t => t.situacao === 'matriculado');
        if (ativo) {
          setTurmas(listaTurmas);
          setSemestreSelecionado(listaTurmas[0]?.semestre_letivo ?? '');
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
    const lista = Array.from(new Set(turmas.map(t => t.semestre_letivo)));
    return lista;
  }, [turmas]);

  // Filtra as turmas do semestre selecionado com situação 'matriculado'
  const turmasFiltradas = useMemo(() => {
    return turmas.filter(
      t => t.situacao === 'matriculado' && (!semestreSelecionado || t.semestre_letivo === semestreSelecionado)
    );
  }, [turmas, semestreSelecionado]);

  // Faixas de horários para a grade semanal: dinâmico baseado nas turmas do semestre
  const faixasHorarios = useMemo(() => {
    const slots = new Set<string>();
    turmasFiltradas.forEach(t => {
      if (t.hora_inicio && t.hora_fim) {
        slots.add(`${t.hora_inicio} - ${t.hora_fim}`);
      }
    });
    const lista = Array.from(slots);
    return lista.sort();
  }, [turmasFiltradas]);

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

  if (erro || !aluno) {
    return (
      <div className="comprovante-wrapper">
        <p className="comprovante-erro" role="alert">
          {erro || 'Não foi possível confirmar os dados do aluno.'}
        </p>
        <Link to="/aluno/documentos" className="secondary-button">Voltar para Documentos</Link>
      </div>
    );
  }

  if (!turmas.length) {
    return <div className="comprovante-wrapper">
      <p>Nenhuma matrícula ativa disponível para emitir o comprovante.</p>
      <Link to="/aluno/documentos" className="secondary-button">Voltar para Documentos</Link>
    </div>;
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
                  <span className="campo-valor">{aluno.matricula}</span>
                </td>
                <td style={{ width: '44%' }}>
                  <span className="campo-label">Nome</span>
                  <span className="campo-valor">{aluno.nome_completo}</span>
                </td>
                <td>
                  <span className="campo-label">Período Letivo</span>
                  <span className="campo-valor">{semestreSelecionado.replace('.', '')}</span>
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
                <th style={{ width: '14%' }}>Sala/Depto</th>
              </tr>
            </thead>
            <tbody>
              {turmasFiltradas.map(disc => (
                  <tr key={disc.id_matricula_turma}>
                    <td>{disc.disciplina_codigo}</td>
                    <td>{disc.disciplina_nome}</td>
                    <td>{disc.codigo_turma}</td>
                    <td>{disc.sala_codigo}</td>
                  </tr>
                ))}
            </tbody>
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
                          t.dia_semana === dia &&
                          t.hora_inicio === iniFaixa && t.hora_fim === fimFaixa
                      );
                      return (
                        <td key={dia} className="sagres-grade-celula">
                          {aulasNesteSlot.map((aula, idx) => (
                            <div key={`${aula.id_matricula_turma}-${idx}`} className="sagres-grade-item">
                              <strong className="sagres-grade-cod">{aula.disciplina_codigo}</strong>
                              {aula.codigo_turma && (
                                <small className="sagres-grade-turma">{aula.codigo_turma}</small>
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

        </footer>
      </article>
      </div>
    </div>
  );
}
