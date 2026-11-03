from pydantic import BaseModel

from app.models.turma import SituacaoMatricula

# Os nomes dos campos estão em camelCase DE PROPÓSITO: este é o contrato que o
# painel de consulta do front já usa (src/types/consultaAcademica.ts).


class HorarioAula(BaseModel):
    diaSemana: str            # "Segunda-feira"
    diaSemanaNumero: int      # 1 (segunda) a 6 (sábado)
    horarioInicio: str        # "08:00"
    horarioFim: str           # "10:00"
    sala: str
    codigoTurma: str


class ItemConsultaAcademica(BaseModel):
    idMatricula: int
    codigoTurma: str
    disciplinaCodigo: str
    disciplinaNome: str
    professorNome: str
    semestre: str
    sala: str
    # O banco guarda só a nota final; não há nota por avaliação (nota1/nota2).
    nota1: float | None = None
    nota2: float | None = None
    notaFinal: float | None = None
    frequencia: float | None = None
    situacao: SituacaoMatricula
    horarios: list[HorarioAula]
