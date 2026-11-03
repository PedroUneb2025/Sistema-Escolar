from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_perfis
from app.api.routes.matriculas import minhas_matriculas
from app.db.session import get_db
from app.models.turma import DiaSemana
from app.models.usuario import Usuario
from app.schemas.academico import HorarioAula, ItemConsultaAcademica

router = APIRouter(prefix="/academico", tags=["academico"])

DIAS = {
    DiaSemana.SEG: ("Segunda-feira", 1),
    DiaSemana.TER: ("Terça-feira", 2),
    DiaSemana.QUA: ("Quarta-feira", 3),
    DiaSemana.QUI: ("Quinta-feira", 4),
    DiaSemana.SEX: ("Sexta-feira", 5),
    DiaSemana.SAB: ("Sábado", 6),
}


@router.get("/minhas-turmas", response_model=list[ItemConsultaAcademica])
def minhas_turmas(
    usuario: Usuario = Depends(require_perfis("ALUNO")),
    db: Session = Depends(get_db),
):
    """Painel unificado do aluno (disciplinas, notas e horários).

    Mesmos dados de GET /matriculas/minhas, no formato que o painel do front
    já consome (camelCase, dia da semana por extenso e horário HH:MM).
    """
    itens = []
    for m in minhas_matriculas(usuario=usuario, db=db):
        dia, numero = DIAS[m.dia_semana]
        itens.append(
            ItemConsultaAcademica(
                idMatricula=m.id_matricula_turma,
                codigoTurma=m.codigo_turma,
                disciplinaCodigo=m.disciplina_codigo,
                disciplinaNome=m.disciplina_nome,
                professorNome=m.professor_nome,
                semestre=m.semestre_letivo,
                sala=m.sala_codigo,
                notaFinal=m.nota_final,
                frequencia=m.frequencia,
                situacao=m.situacao,
                horarios=[
                    HorarioAula(
                        diaSemana=dia,
                        diaSemanaNumero=numero,
                        horarioInicio=m.hora_inicio.strftime("%H:%M"),
                        horarioFim=m.hora_fim.strftime("%H:%M"),
                        sala=m.sala_codigo,
                        codigoTurma=m.codigo_turma,
                    )
                ],
            )
        )
    return itens
