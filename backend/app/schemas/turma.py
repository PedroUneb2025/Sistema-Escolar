from pydantic import BaseModel, Field


class TurmaWrite(BaseModel):
    """Corpo de POST/PUT /turmas (contrato combinado com o front)."""

    codigo: str = Field(min_length=1, max_length=20)
    idDisciplina: int
    idProfessor: int
    idSala: int
    semestre: str = Field(min_length=1, max_length=10)
    diaSemana: str  # por extenso: "Segunda-feira"
    horarioInicio: str  # HH:MM
    horarioFim: str  # HH:MM
    vagas: int
    status: str = "aberta"


class TurmaRead(BaseModel):
    id: str  # o tipo Turma do front exige string
    codigo: str
    disciplina: str
    professor: str
    semestre: str
    diaSemana: str
    horarioInicio: str
    horarioFim: str
    sala: str
    vagas: int
    vagasOcupadas: int
    status: str
    idDisciplina: int
    idProfessor: int
    idSala: int


class VagasRead(BaseModel):
    vagasTotais: int
    vagasOcupadas: int
    vagasDisponiveis: int


class NotaFrequenciaUpdate(BaseModel):
    nota_final: float | None = None
    frequencia: float | None = None


class MatriculaNotasRead(BaseModel):
    id_matricula_turma: int
    id_turma: int
    id_aluno: int
    situacao: str
    nota_final: float | None
    frequencia: float | None


class ResumoTurmaRead(BaseModel):
    idTurma: int
    totalAlunos: int
    mediaNotas: float | None
    frequenciaMedia: float | None
    contagemPorSituacao: dict[str, int]
