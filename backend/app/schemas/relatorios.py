from pydantic import BaseModel

from app.models.turma import SituacaoMatricula


class AlunoResumo(BaseModel):
    # CPF e data de nascimento ficam de fora de propósito (RNF02: dados pessoais
    # só devem sair da API quando houver necessidade real).
    id_aluno: int
    matricula: str
    nome_completo: str
    email: str


class AlunoNaTurma(BaseModel):
    id_matricula_turma: int
    id_aluno: int
    matricula: str
    nome_completo: str
    situacao: SituacaoMatricula
    nota_final: float | None
    frequencia: float | None


class TurmaAlunosRead(BaseModel):
    id_turma: int
    codigo_turma: str
    semestre_letivo: str
    disciplina_nome: str
    vagas_totais: int
    total_alunos: int
    alunos: list[AlunoNaTurma]


class MatriculadoRow(BaseModel):
    id_matricula_turma: int
    id_aluno: int
    matricula: str
    nome_completo: str
    id_turma: int
    codigo_turma: str
    semestre_letivo: str
    disciplina_codigo: str
    disciplina_nome: str
    situacao: SituacaoMatricula
