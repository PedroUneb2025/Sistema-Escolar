from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_perfis
from app.core.security import hash_password
from app.db.session import get_db
from app.models.pessoas import Aluno, Professor
from app.models.rbac import Perfil
from app.models.usuario import StatusUsuario, Usuario
from app.schemas.usuarios import AlunoCreate, FuncionarioCreate, ProfessorCreate, UsuarioCriado

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

# Não existe cadastro público: as contas são criadas por quem administra a
# instituição. Secretaria/Admin cadastram aluno e professor; só o Admin cria
# contas de funcionários (que dão acesso à gestão).
gestor = Depends(require_perfis("SECRETARIA", "ADMIN"))
somente_admin = Depends(require_perfis("ADMIN"))


def _perfil_ou_400(db: Session, nome: str) -> Perfil:
    perfil = db.scalar(select(Perfil).where(Perfil.nome == nome))
    if perfil is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"O perfil {nome} não existe no banco. Rode o seed (python -m app.seed).",
        )
    return perfil


def _existe(db: Session, coluna, valor) -> bool:
    return db.scalar(select(coluna).where(coluna == valor)) is not None


def _checar_email_livre(db: Session, email: str) -> None:
    if _existe(db, Usuario.email, email):
        raise HTTPException(status.HTTP_409_CONFLICT, "E-mail já cadastrado")


def _novo_usuario(email: str, senha: str, perfis: list[Perfil]) -> Usuario:
    usuario = Usuario(email=email, senha_hash=hash_password(senha), status=StatusUsuario.ativo)
    usuario.perfis.extend(perfis)
    return usuario


@router.post("/alunos", response_model=UsuarioCriado, status_code=status.HTTP_201_CREATED, dependencies=[gestor])
def cadastrar_aluno(dados: AlunoCreate, db: Session = Depends(get_db)):
    perfil = _perfil_ou_400(db, "ALUNO")
    _checar_email_livre(db, dados.email)
    if _existe(db, Aluno.matricula, dados.matricula):
        raise HTTPException(status.HTTP_409_CONFLICT, "Matrícula já cadastrada")
    if _existe(db, Aluno.cpf, dados.cpf):
        raise HTTPException(status.HTTP_409_CONFLICT, "CPF já cadastrado")

    # Conta + registro do aluno na mesma transação: ou cria os dois ou nenhum.
    usuario = _novo_usuario(dados.email, dados.senha, [perfil])
    db.add(usuario)
    try:
        db.flush()  # gera o id_usuario
        aluno = Aluno(
            id_usuario=usuario.id_usuario,
            matricula=dados.matricula,
            nome_completo=dados.nome_completo,
            cpf=dados.cpf,
            data_nascimento=dados.data_nascimento,
            telefone=dados.telefone,
        )
        db.add(aluno)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "E-mail, matrícula ou CPF já cadastrados")

    return UsuarioCriado(
        id_usuario=usuario.id_usuario,
        email=usuario.email,
        perfis=usuario.nomes_perfis,
        id_aluno=aluno.id_aluno,
        nome_completo=aluno.nome_completo,
    )


@router.post("/professores", response_model=UsuarioCriado, status_code=status.HTTP_201_CREATED, dependencies=[gestor])
def cadastrar_professor(dados: ProfessorCreate, db: Session = Depends(get_db)):
    perfil = _perfil_ou_400(db, "PROFESSOR")
    _checar_email_livre(db, dados.email)
    if _existe(db, Professor.matricula_funcional, dados.matricula_funcional):
        raise HTTPException(status.HTTP_409_CONFLICT, "Matrícula funcional já cadastrada")
    if _existe(db, Professor.cpf, dados.cpf):
        raise HTTPException(status.HTTP_409_CONFLICT, "CPF já cadastrado")

    usuario = _novo_usuario(dados.email, dados.senha, [perfil])
    db.add(usuario)
    try:
        db.flush()
        professor = Professor(
            id_usuario=usuario.id_usuario,
            matricula_funcional=dados.matricula_funcional,
            nome_completo=dados.nome_completo,
            cpf=dados.cpf,
            titulacao=dados.titulacao,
        )
        db.add(professor)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "E-mail, matrícula funcional ou CPF já cadastrados")

    return UsuarioCriado(
        id_usuario=usuario.id_usuario,
        email=usuario.email,
        perfis=usuario.nomes_perfis,
        id_professor=professor.id_professor,
        nome_completo=professor.nome_completo,
    )


@router.post(
    "/funcionarios",
    response_model=UsuarioCriado,
    status_code=status.HTTP_201_CREATED,
    dependencies=[somente_admin],
)
def cadastrar_funcionario(dados: FuncionarioCreate, db: Session = Depends(get_db)):
    nomes = sorted(set(dados.perfis))  # tira repetidos
    perfis = [_perfil_ou_400(db, nome) for nome in nomes]
    _checar_email_livre(db, dados.email)

    usuario = _novo_usuario(dados.email, dados.senha, perfis)
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "E-mail já cadastrado")
    db.refresh(usuario)

    return UsuarioCriado(id_usuario=usuario.id_usuario, email=usuario.email, perfis=usuario.nomes_perfis)
