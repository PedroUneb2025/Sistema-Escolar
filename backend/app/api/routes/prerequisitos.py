from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_perfis
from app.db.session import get_db
from app.models.curriculo import Disciplina
from app.models.prerequisito import DisciplinaPrerequisito
from app.schemas.curriculo import DisciplinaRead
from app.schemas.prerequisito import PrerequisitoCreate, PrerequisitoRead

router = APIRouter(prefix="/disciplinas/{id_disciplina}/prerequisitos", tags=["prerequisitos"])

pode_ler = Depends(get_current_user)
pode_escrever = Depends(require_perfis("SECRETARIA", "COORDENACAO", "ADMIN"))


def _criaria_ciclo(db: Session, id_disciplina: int, id_prerequisito: int) -> bool:
    """Dizer que 'id_disciplina exige id_prerequisito' cria um ciclo quando o
    próprio id_prerequisito já exige id_disciplina, direta ou indiretamente
    (ex: A exige B, B exige C; adicionar 'C exige A' fecharia o ciclo).
    Percorre a cadeia de pré-requisitos a partir de id_prerequisito.
    """
    visitados: set[int] = set()
    pilha = [id_prerequisito]
    while pilha:
        atual = pilha.pop()
        if atual == id_disciplina:
            return True
        if atual in visitados:
            continue
        visitados.add(atual)
        pilha.extend(
            db.scalars(
                select(DisciplinaPrerequisito.id_prerequisito).where(
                    DisciplinaPrerequisito.id_disciplina == atual
                )
            ).all()
        )
    return False


@router.get("", response_model=list[DisciplinaRead], dependencies=[pode_ler])
def listar_prerequisitos(id_disciplina: int, db: Session = Depends(get_db)):
    """Disciplinas que são pré-requisito da disciplina informada."""
    if db.get(Disciplina, id_disciplina) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Disciplina não encontrada")
    return db.scalars(
        select(Disciplina)
        .join(DisciplinaPrerequisito, DisciplinaPrerequisito.id_prerequisito == Disciplina.id_disciplina)
        .where(DisciplinaPrerequisito.id_disciplina == id_disciplina)
        .order_by(Disciplina.nome)
    ).all()


@router.post(
    "",
    response_model=PrerequisitoRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[pode_escrever],
)
def adicionar_prerequisito(id_disciplina: int, dados: PrerequisitoCreate, db: Session = Depends(get_db)):
    if dados.id_prerequisito == id_disciplina:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uma disciplina não pode ser pré-requisito de si mesma")
    if db.get(Disciplina, id_disciplina) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Disciplina não encontrada")
    if db.get(Disciplina, dados.id_prerequisito) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Disciplina pré-requisito não encontrada")
    if db.get(DisciplinaPrerequisito, (id_disciplina, dados.id_prerequisito)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Esse pré-requisito já está cadastrado")
    if _criaria_ciclo(db, id_disciplina, dados.id_prerequisito):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Esse pré-requisito criaria um ciclo (as disciplinas exigiriam uma à outra)",
        )

    vinculo = DisciplinaPrerequisito(id_disciplina=id_disciplina, id_prerequisito=dados.id_prerequisito)
    db.add(vinculo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Esse pré-requisito já está cadastrado")
    return vinculo


@router.delete("/{id_prerequisito}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[pode_escrever])
def remover_prerequisito(id_disciplina: int, id_prerequisito: int, db: Session = Depends(get_db)):
    vinculo = db.get(DisciplinaPrerequisito, (id_disciplina, id_prerequisito))
    if vinculo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pré-requisito não encontrado")
    db.delete(vinculo)
    db.commit()
