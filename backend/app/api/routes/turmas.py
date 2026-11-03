from datetime import time

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_perfis
from app.db.session import get_db
from app.models.curriculo import Disciplina
from app.models.pessoas import Professor
from app.models.sala import Sala
from app.models.turma import DiaSemana, MatriculaTurma, SituacaoMatricula, StatusTurma, Turma
from app.schemas.turma import TurmaRead, TurmaWrite, VagasRead
from app.services.turma_regras import (
    DIA_CODIGO_PARA_EXTENSO,
    DIA_EXTENSO_PARA_CODIGO,
    Agenda,
    RegraTurmaError,
    calcular_vagas,
    hora_para_minutos,
    validar_conflito,
    validar_dia_e_status,
    validar_exclusao,
    validar_horario,
    validar_vagas,
)

router = APIRouter(prefix="/turmas", tags=["turmas"])

# Leitura: qualquer usuário logado. Escrita: só quem administra turmas.
leitura = Depends(get_current_user)
escrita = Depends(require_perfis("SECRETARIA", "COORDENACAO", "ADMIN"))


def _http(erro: RegraTurmaError) -> HTTPException:
    return HTTPException(erro.status_code, erro.detail)


def _para_time(valor: str) -> time:
    minutos = hora_para_minutos(valor)
    return time(minutos // 60, minutos % 60)


def _hhmm(valor: time) -> str:
    return valor.strftime("%H:%M")


# ----------------------------- consultas -----------------------------

def _select_turmas():
    """Turma + nomes + vagas ocupadas, numa única consulta agrupada.

    Só a situação 'matriculado' ocupa vaga (mesma condição de matriculas.py).
    """
    ocupadas = (
        select(MatriculaTurma.id_turma.label("id_turma"), func.count().label("ocupadas"))
        .where(MatriculaTurma.situacao == SituacaoMatricula.matriculado)
        .group_by(MatriculaTurma.id_turma)
        .subquery()
    )
    return (
        select(
            Turma.id_turma,
            Turma.codigo_turma,
            Turma.semestre_letivo,
            Turma.dia_semana,
            Turma.hora_inicio,
            Turma.hora_fim,
            Turma.vagas_totais,
            Turma.status,
            Turma.id_disciplina,
            Turma.id_professor,
            Turma.id_sala,
            Disciplina.nome.label("disciplina_nome"),
            Professor.nome_completo.label("professor_nome"),
            Sala.codigo.label("sala_codigo"),
            func.coalesce(ocupadas.c.ocupadas, 0).label("ocupadas"),
        )
        .join(Disciplina, Disciplina.id_disciplina == Turma.id_disciplina)
        .join(Professor, Professor.id_professor == Turma.id_professor)
        .join(Sala, Sala.id_sala == Turma.id_sala)
        .outerjoin(ocupadas, ocupadas.c.id_turma == Turma.id_turma)
    )


def _para_read(linha) -> TurmaRead:
    return TurmaRead(
        id=str(linha.id_turma),
        codigo=linha.codigo_turma,
        disciplina=linha.disciplina_nome,
        professor=linha.professor_nome,
        semestre=linha.semestre_letivo,
        diaSemana=DIA_CODIGO_PARA_EXTENSO[linha.dia_semana.value],
        horarioInicio=_hhmm(linha.hora_inicio),
        horarioFim=_hhmm(linha.hora_fim),
        sala=linha.sala_codigo,
        vagas=linha.vagas_totais,
        vagasOcupadas=int(linha.ocupadas),
        status=linha.status.value,
        idDisciplina=linha.id_disciplina,
        idProfessor=linha.id_professor,
        idSala=linha.id_sala,
    )


def _linha_ou_404(db: Session, id_turma: int):
    linha = db.execute(_select_turmas().where(Turma.id_turma == id_turma)).first()
    if linha is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Turma não encontrada")
    return linha


def _matriculados(db: Session, id_turma: int) -> int:
    return db.scalar(
        select(func.count())
        .select_from(MatriculaTurma)
        .where(
            MatriculaTurma.id_turma == id_turma,
            MatriculaTurma.situacao == SituacaoMatricula.matriculado,
        )
    )


def _agendas_em_conflito(
    db: Session, dados: TurmaWrite, ini: time, fim: time, ignorar_id: int | None
) -> list[Agenda]:
    """Turmas do mesmo semestre/dia que se sobrepõem e usam a mesma sala ou professor."""
    stmt = (
        select(
            Turma.id_turma,
            Turma.codigo_turma,
            Turma.semestre_letivo,
            Turma.dia_semana,
            Turma.hora_inicio,
            Turma.hora_fim,
            Turma.id_sala,
            Turma.id_professor,
            Turma.status,
            Sala.codigo.label("sala_codigo"),
            Professor.nome_completo.label("professor_nome"),
        )
        .join(Sala, Sala.id_sala == Turma.id_sala)
        .join(Professor, Professor.id_professor == Turma.id_professor)
        .where(
            Turma.semestre_letivo == dados.semestre,
            Turma.dia_semana == DiaSemana(DIA_EXTENSO_PARA_CODIGO[dados.diaSemana]),
            Turma.status != StatusTurma.cancelada,
            # sobreposição: cada uma começa antes de a outra terminar
            Turma.hora_inicio < fim,
            Turma.hora_fim > ini,
            or_(Turma.id_sala == dados.idSala, Turma.id_professor == dados.idProfessor),
        )
        .order_by(Turma.id_turma)
    )
    if ignorar_id is not None:
        stmt = stmt.where(Turma.id_turma != ignorar_id)
    return [
        Agenda(
            codigo=r.codigo_turma,
            semestre=r.semestre_letivo,
            dia_semana=DIA_CODIGO_PARA_EXTENSO[r.dia_semana.value],
            inicio=_hhmm(r.hora_inicio),
            fim=_hhmm(r.hora_fim),
            id_sala=r.id_sala,
            id_professor=r.id_professor,
            sala=r.sala_codigo,
            professor=r.professor_nome,
            status=r.status.value,
            id_turma=r.id_turma,
        )
        for r in db.execute(stmt).all()
    ]


def _validar_corpo(db: Session, dados: TurmaWrite, id_turma: int | None) -> tuple[time, time]:
    """Valida o corpo de criação/edição. Devolve (hora_inicio, hora_fim)."""
    try:
        validar_dia_e_status(dados.diaSemana, dados.status)
        validar_horario(dados.horarioInicio, dados.horarioFim)
    except RegraTurmaError as e:
        raise _http(e)

    if db.get(Disciplina, dados.idDisciplina) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Disciplina não encontrada")
    professor = db.get(Professor, dados.idProfessor)
    if professor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Professor não encontrado")
    sala = db.get(Sala, dados.idSala)
    if sala is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sala não encontrada")

    ini, fim = _para_time(dados.horarioInicio), _para_time(dados.horarioFim)
    nova = Agenda(
        codigo=dados.codigo,
        semestre=dados.semestre,
        dia_semana=dados.diaSemana,
        inicio=dados.horarioInicio,
        fim=dados.horarioFim,
        id_sala=dados.idSala,
        id_professor=dados.idProfessor,
        sala=sala.codigo,
        professor=professor.nome_completo,
        status=dados.status,
        id_turma=id_turma,
    )
    try:
        validar_vagas(dados.vagas, _matriculados(db, id_turma) if id_turma is not None else 0)
        # Turma cancelada não ocupa sala nem professor, então não precisa checar conflito.
        if dados.status != "cancelada":
            validar_conflito(nova, _agendas_em_conflito(db, dados, ini, fim, id_turma))
    except RegraTurmaError as e:
        raise _http(e)
    return ini, fim


# ------------------------------- rotas -------------------------------

@router.get("", response_model=list[TurmaRead], dependencies=[leitura])
def listar_turmas(
    semestre: str | None = None,
    status_turma: str | None = Query(default=None, alias="status"),
    busca: str | None = Query(default=None, description="Código da turma ou nome da disciplina"),
    limite: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = _select_turmas().order_by(Turma.semestre_letivo.desc(), Turma.codigo_turma).limit(limite).offset(offset)
    if semestre:
        stmt = stmt.where(Turma.semestre_letivo == semestre)
    if status_turma:
        if status_turma not in {s.value for s in StatusTurma}:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Status inválido: {status_turma}.")
        stmt = stmt.where(Turma.status == StatusTurma(status_turma))
    if busca:
        padrao = f"%{busca}%"
        stmt = stmt.where(or_(Turma.codigo_turma.ilike(padrao), Disciplina.nome.ilike(padrao)))
    return [_para_read(linha) for linha in db.execute(stmt).all()]


@router.get("/{id_turma}", response_model=TurmaRead, dependencies=[leitura])
def obter_turma(id_turma: int, db: Session = Depends(get_db)):
    return _para_read(_linha_ou_404(db, id_turma))


@router.get("/{id_turma}/vagas", response_model=VagasRead, dependencies=[leitura])
def vagas_da_turma(id_turma: int, db: Session = Depends(get_db)):
    """Vagas em tempo real. Só 'matriculado' ocupa vaga (igual à matrícula e ao DBA)."""
    linha = _linha_ou_404(db, id_turma)
    return calcular_vagas(linha.vagas_totais, int(linha.ocupadas))


@router.post("", response_model=TurmaRead, status_code=status.HTTP_201_CREATED, dependencies=[escrita])
def criar_turma(dados: TurmaWrite, db: Session = Depends(get_db)):
    ini, fim = _validar_corpo(db, dados, id_turma=None)
    turma = Turma(
        id_disciplina=dados.idDisciplina,
        id_professor=dados.idProfessor,
        id_sala=dados.idSala,
        semestre_letivo=dados.semestre,
        codigo_turma=dados.codigo,
        dia_semana=DiaSemana(DIA_EXTENSO_PARA_CODIGO[dados.diaSemana]),
        hora_inicio=ini,
        hora_fim=fim,
        vagas_totais=dados.vagas,
        status=StatusTurma(dados.status),
    )
    db.add(turma)
    db.commit()
    return _para_read(_linha_ou_404(db, turma.id_turma))


@router.put("/{id_turma}", response_model=TurmaRead, dependencies=[escrita])
def editar_turma(id_turma: int, dados: TurmaWrite, db: Session = Depends(get_db)):
    turma = db.get(Turma, id_turma)
    if turma is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Turma não encontrada")
    ini, fim = _validar_corpo(db, dados, id_turma=id_turma)

    turma.id_disciplina = dados.idDisciplina
    turma.id_professor = dados.idProfessor
    turma.id_sala = dados.idSala
    turma.semestre_letivo = dados.semestre
    turma.codigo_turma = dados.codigo
    turma.dia_semana = DiaSemana(DIA_EXTENSO_PARA_CODIGO[dados.diaSemana])
    turma.hora_inicio = ini
    turma.hora_fim = fim
    turma.vagas_totais = dados.vagas
    turma.status = StatusTurma(dados.status)
    db.commit()
    return _para_read(_linha_ou_404(db, id_turma))


@router.delete("/{id_turma}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[escrita])
def excluir_turma(id_turma: int, db: Session = Depends(get_db)):
    turma = db.get(Turma, id_turma)
    if turma is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Turma não encontrada")
    # Qualquer matrícula (de qualquer situação) bloqueia a exclusão.
    total = db.scalar(
        select(func.count()).select_from(MatriculaTurma).where(MatriculaTurma.id_turma == id_turma)
    )
    try:
        validar_exclusao(total)
    except RegraTurmaError as e:
        raise _http(e)
    db.delete(turma)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
