from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_perfis
from app.db.session import get_db
from app.models.pessoas import Professor
from app.models.sala import Sala
from app.models.turma import Turma
from app.schemas.sala import ProfessorResumo, SalaCreate, SalaRead, SalaUpdate
from app.services.sala_regras import validar_exclusao_sala, validar_sala
from app.services.turma_regras import RegraTurmaError

router = APIRouter(prefix="/salas", tags=["salas"])
professores_router = APIRouter(prefix="/professores", tags=["professores"])

PERFIS_ESCRITA = ("SECRETARIA", "COORDENACAO", "ADMIN")
leitura = Depends(get_current_user)
escrita = Depends(require_perfis(*PERFIS_ESCRITA))


def _http(erro: RegraTurmaError) -> HTTPException:
    return HTTPException(erro.status_code, erro.detail)


def _sala_ou_404(db: Session, id_sala: int) -> Sala:
    sala = db.get(Sala, id_sala)
    if sala is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sala não encontrada")
    return sala


def _garantir_codigo_livre(db: Session, codigo: str, ignorar_id: int | None = None) -> None:
    stmt = select(Sala.id_sala).where(Sala.codigo == codigo)
    if ignorar_id is not None:
        stmt = stmt.where(Sala.id_sala != ignorar_id)
    if db.scalar(stmt) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Já existe uma sala com o código {codigo}")


@router.get("", response_model=list[SalaRead], dependencies=[leitura])
def listar_salas(
    busca: str | None = Query(default=None, description="Código ou bloco/prédio"),
    limite: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(Sala).order_by(Sala.codigo).limit(limite).offset(offset)
    if busca:
        padrao = f"%{busca}%"
        stmt = stmt.where(or_(Sala.codigo.ilike(padrao), Sala.bloco_predio.ilike(padrao)))
    return db.scalars(stmt).all()


@router.get("/{id_sala}", response_model=SalaRead, dependencies=[leitura])
def obter_sala(id_sala: int, db: Session = Depends(get_db)):
    return _sala_ou_404(db, id_sala)


@router.post("", response_model=SalaRead, status_code=status.HTTP_201_CREATED, dependencies=[escrita])
def criar_sala(dados: SalaCreate, db: Session = Depends(get_db)):
    try:
        validar_sala(dados.codigo, dados.capacidade)
    except RegraTurmaError as e:
        raise _http(e)
    _garantir_codigo_livre(db, dados.codigo)
    sala = Sala(**dados.model_dump())
    db.add(sala)
    db.commit()
    db.refresh(sala)
    return sala


@router.put("/{id_sala}", response_model=SalaRead, dependencies=[escrita])
def editar_sala(id_sala: int, dados: SalaUpdate, db: Session = Depends(get_db)):
    sala = _sala_ou_404(db, id_sala)
    campos = dados.model_dump(exclude_unset=True)
    try:
        validar_sala(
            campos.get("codigo", sala.codigo),
            campos.get("capacidade", sala.capacidade),
        )
    except RegraTurmaError as e:
        raise _http(e)
    if "codigo" in campos:
        _garantir_codigo_livre(db, campos["codigo"], ignorar_id=id_sala)
    for campo, valor in campos.items():
        if valor is not None:
            setattr(sala, campo, valor)
    db.commit()
    db.refresh(sala)
    return sala


@router.delete("/{id_sala}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[escrita])
def excluir_sala(id_sala: int, db: Session = Depends(get_db)):
    sala = _sala_ou_404(db, id_sala)
    total = db.scalar(select(func.count()).select_from(Turma).where(Turma.id_sala == id_sala))
    try:
        validar_exclusao_sala(total)
    except RegraTurmaError as e:
        raise _http(e)
    db.delete(sala)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@professores_router.get("", response_model=list[ProfessorResumo], dependencies=[escrita])
def listar_professores(
    limite: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Somente leitura, para o select de professor do formulário de turma.

    Só id, nome e matrícula funcional (CPF fica de fora, RNF02).
    """
    linhas = db.execute(
        select(Professor.id_professor, Professor.nome_completo, Professor.matricula_funcional)
        .order_by(Professor.nome_completo)
        .limit(limite)
        .offset(offset)
    ).all()
    return [ProfessorResumo(**l._mapping) for l in linhas]
