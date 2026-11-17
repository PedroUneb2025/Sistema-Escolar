from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_perfis
from app.db.session import get_db
from app.models.pessoas import Professor
from app.models.usuario import StatusUsuario, Usuario
from app.schemas.professor import (
    ProfessorPatch,
    ProfessorRead,
    ProfessorResumo,
    ProfessorStatusUpdate,
    ProfessorUpdate,
)

router = APIRouter(prefix="/professores", tags=["professores"])

# Máximo por página. O front pagina de 500 em 500 (listarPaginas em turmaService.ts),
# então este valor não pode ser menor que 500.
LIMITE_MAXIMO = 500
LIMITE_PADRAO = 200

# A listagem alimenta o select de turma (SECRETARIA, COORDENACAO, ADMIN).
# O detalhe traz CPF e a escrita altera conta: só SECRETARIA e ADMIN, igual a
# POST /usuarios/professores.
listagem = Depends(require_perfis("SECRETARIA", "COORDENACAO", "ADMIN"))
gestor = Depends(require_perfis("SECRETARIA", "ADMIN"))

CAMPOS_OBRIGATORIOS_NO_PATCH = ("email", "matricula_funcional", "nome_completo", "cpf")


def _escapar_like(texto: str) -> str:
    return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _professor_ou_404(db: Session, id_professor: int) -> Professor:
    professor = db.get(Professor, id_professor)
    if professor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Professor não encontrado")
    return professor


def _para_read(professor: Professor) -> ProfessorRead:
    return ProfessorRead(
        id_professor=professor.id_professor,
        id_usuario=professor.id_usuario,
        nome_completo=professor.nome_completo,
        matricula_funcional=professor.matricula_funcional,
        cpf=professor.cpf,
        email=professor.usuario.email,
        titulacao=professor.titulacao,
        status=professor.usuario.status.value,
    )


def _checar_duplicidade(db: Session, professor: Professor, campos: dict) -> None:
    """409 se e-mail, matrícula funcional ou CPF já pertencem a OUTRO cadastro."""
    if "email" in campos and db.scalar(
        select(Usuario.id_usuario).where(
            Usuario.email == campos["email"], Usuario.id_usuario != professor.id_usuario
        )
    ) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "E-mail já cadastrado")
    if "matricula_funcional" in campos and db.scalar(
        select(Professor.id_professor).where(
            Professor.matricula_funcional == campos["matricula_funcional"],
            Professor.id_professor != professor.id_professor,
        )
    ) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Matrícula funcional já cadastrada")
    if "cpf" in campos and db.scalar(
        select(Professor.id_professor).where(
            Professor.cpf == campos["cpf"], Professor.id_professor != professor.id_professor
        )
    ) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "CPF já cadastrado")


def _atualizar(db: Session, professor: Professor, campos: dict) -> ProfessorRead:
    _checar_duplicidade(db, professor, campos)
    for campo, valor in campos.items():
        if campo == "email":
            professor.usuario.email = valor  # o e-mail mora na conta (usuario)
        else:
            setattr(professor, campo, valor)
    try:
        db.commit()
    except IntegrityError:
        # Corrida entre duas requisições: o banco também garante a unicidade.
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "E-mail, matrícula funcional ou CPF já cadastrados"
        )
    return _para_read(professor)


# ------------------------------- rotas -------------------------------

@router.get("", response_model=list[ProfessorResumo], dependencies=[listagem])
def listar_professores(
    busca: str | None = Query(default=None, max_length=100, description="Nome ou matrícula funcional"),
    status_conta: str | None = Query(
        default=None, alias="status", description="ativo, inativo ou bloqueado (sem filtro: todos)"
    ),
    limite: int = Query(default=LIMITE_PADRAO, ge=1, le=LIMITE_MAXIMO),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Lista professores com e-mail, titulação e status. Sem CPF (RNF02)."""
    stmt = (
        select(
            Professor.id_professor,
            Professor.nome_completo,
            Professor.matricula_funcional,
            Usuario.email,
            Professor.titulacao,
            Usuario.status,
        )
        .join(Usuario, Usuario.id_usuario == Professor.id_usuario)
        .order_by(Professor.nome_completo, Professor.id_professor)
        .limit(limite)
        .offset(offset)
    )
    if busca and busca.strip():
        padrao = f"%{_escapar_like(busca.strip())}%"
        stmt = stmt.where(
            or_(
                Professor.nome_completo.ilike(padrao, escape="\\"),
                Professor.matricula_funcional.ilike(padrao, escape="\\"),
            )
        )
    if status_conta:
        if status_conta not in {s.value for s in StatusUsuario}:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, f"Status inválido: {status_conta}."
            )
        stmt = stmt.where(Usuario.status == StatusUsuario(status_conta))
    return [
        ProfessorResumo(
            id_professor=l.id_professor,
            nome_completo=l.nome_completo,
            matricula_funcional=l.matricula_funcional,
            email=l.email,
            titulacao=l.titulacao,
            status=l.status.value,
        )
        for l in db.execute(stmt).all()
    ]


@router.get("/{id_professor}", response_model=ProfessorRead, dependencies=[gestor])
def obter_professor(id_professor: int, db: Session = Depends(get_db)):
    return _para_read(_professor_ou_404(db, id_professor))


@router.put("/{id_professor}", response_model=ProfessorRead, dependencies=[gestor])
def substituir_professor(id_professor: int, dados: ProfessorUpdate, db: Session = Depends(get_db)):
    professor = _professor_ou_404(db, id_professor)
    return _atualizar(db, professor, dados.model_dump())


@router.patch("/{id_professor}", response_model=ProfessorRead, dependencies=[gestor])
def atualizar_professor(id_professor: int, dados: ProfessorPatch, db: Session = Depends(get_db)):
    professor = _professor_ou_404(db, id_professor)
    campos = {campo: getattr(dados, campo) for campo in dados.model_fields_set}
    if not campos:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Informe ao menos um campo para alterar.")
    for campo in CAMPOS_OBRIGATORIOS_NO_PATCH:
        if campo in campos and campos[campo] is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"O campo {campo} não pode ser nulo.")
    return _atualizar(db, professor, campos)


@router.patch("/{id_professor}/status", response_model=ProfessorRead, dependencies=[gestor])
def alterar_status_professor(id_professor: int, dados: ProfessorStatusUpdate, db: Session = Depends(get_db)):
    """Ativa ou inativa o professor. Inativo não faz login (e o token dele deixa de valer)."""
    professor = _professor_ou_404(db, id_professor)
    usuario = professor.usuario
    if usuario.status == StatusUsuario.bloqueado:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Conta bloqueada: o desbloqueio deve ser feito pelo administrador do sistema.",
        )
    usuario.status = StatusUsuario(dados.status)
    db.commit()
    return _para_read(professor)
