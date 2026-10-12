from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_perfis
from app.db.session import get_db
from app.models.curriculo import Curso, Disciplina, MatrizCurricular, MatrizDisciplina
from app.schemas.curriculo import (
    CursoCreate,
    CursoRead,
    CursoUpdate,
    DisciplinaCreate,
    DisciplinaRead,
    DisciplinaUpdate,
    MatrizCurricularCreate,
    MatrizCurricularRead,
    MatrizCurricularUpdate,
    MatrizDisciplinaCreate,
    MatrizDisciplinaRead,
)

router = APIRouter(tags=["curriculo"])

# Quem pode ler a estrutura curricular: qualquer usuário autenticado
# (aluno/professor consultam, secretaria/admin gerenciam).
pode_ler = Depends(get_current_user)
# Quem pode criar/editar/excluir: só secretaria e admin.
pode_escrever = Depends(require_perfis("SECRETARIA", "ADMIN"))


def _buscar_ou_404(db: Session, model, pk_valor: int, pk_nome: str, rotulo: str):
    obj = db.get(model, pk_valor)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{rotulo} não encontrado(a)")
    return obj


# =========================== Curso ===========================

@router.get("/cursos", response_model=list[CursoRead], dependencies=[pode_ler])
def listar_cursos(db: Session = Depends(get_db)):
    return db.scalars(select(Curso)).all()


@router.get("/cursos/{id_curso}", response_model=CursoRead, dependencies=[pode_ler])
def obter_curso(id_curso: int, db: Session = Depends(get_db)):
    return _buscar_ou_404(db, Curso, id_curso, "id_curso", "Curso")


@router.post("/cursos", response_model=CursoRead, status_code=status.HTTP_201_CREATED, dependencies=[pode_escrever])
def criar_curso(dados: CursoCreate, db: Session = Depends(get_db)):
    curso = Curso(**dados.model_dump())
    db.add(curso)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe um curso com esse código")
    db.refresh(curso)
    return curso


@router.put("/cursos/{id_curso}", response_model=CursoRead, dependencies=[pode_escrever])
def atualizar_curso(id_curso: int, dados: CursoUpdate, db: Session = Depends(get_db)):
    curso = _buscar_ou_404(db, Curso, id_curso, "id_curso", "Curso")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(curso, campo, valor)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe um curso com esse código")
    db.refresh(curso)
    return curso


@router.delete("/cursos/{id_curso}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[pode_escrever])
def excluir_curso(id_curso: int, db: Session = Depends(get_db)):
    curso = _buscar_ou_404(db, Curso, id_curso, "id_curso", "Curso")
    db.delete(curso)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Não é possível excluir: existem matrizes curriculares vinculadas a este curso",
        )


# ========================= Disciplina =========================

@router.get("/disciplinas", response_model=list[DisciplinaRead], dependencies=[pode_ler])
def listar_disciplinas(db: Session = Depends(get_db)):
    return db.scalars(select(Disciplina)).all()


@router.get("/disciplinas/{id_disciplina}", response_model=DisciplinaRead, dependencies=[pode_ler])
def obter_disciplina(id_disciplina: int, db: Session = Depends(get_db)):
    return _buscar_ou_404(db, Disciplina, id_disciplina, "id_disciplina", "Disciplina")


@router.post(
    "/disciplinas",
    response_model=DisciplinaRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[pode_escrever],
)
def criar_disciplina(dados: DisciplinaCreate, db: Session = Depends(get_db)):
    disciplina = Disciplina(**dados.model_dump())
    db.add(disciplina)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe uma disciplina com esse código")
    db.refresh(disciplina)
    return disciplina


@router.put("/disciplinas/{id_disciplina}", response_model=DisciplinaRead, dependencies=[pode_escrever])
def atualizar_disciplina(id_disciplina: int, dados: DisciplinaUpdate, db: Session = Depends(get_db)):
    disciplina = _buscar_ou_404(db, Disciplina, id_disciplina, "id_disciplina", "Disciplina")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(disciplina, campo, valor)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe uma disciplina com esse código")
    db.refresh(disciplina)
    return disciplina


@router.delete("/disciplinas/{id_disciplina}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[pode_escrever])
def excluir_disciplina(id_disciplina: int, db: Session = Depends(get_db)):
    disciplina = _buscar_ou_404(db, Disciplina, id_disciplina, "id_disciplina", "Disciplina")
    db.delete(disciplina)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Não é possível excluir: a disciplina está vinculada a uma matriz curricular ou turma",
        )


# ====================== Matriz Curricular ======================

@router.get("/matrizes", response_model=list[MatrizCurricularRead], dependencies=[pode_ler])
def listar_matrizes(id_curso: int | None = None, db: Session = Depends(get_db)):
    stmt = select(MatrizCurricular)
    if id_curso is not None:
        stmt = stmt.where(MatrizCurricular.id_curso == id_curso)
    return db.scalars(stmt).all()


@router.get("/matrizes/{id_matriz}", response_model=MatrizCurricularRead, dependencies=[pode_ler])
def obter_matriz(id_matriz: int, db: Session = Depends(get_db)):
    return _buscar_ou_404(db, MatrizCurricular, id_matriz, "id_matriz", "Matriz curricular")


@router.post(
    "/matrizes",
    response_model=MatrizCurricularRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[pode_escrever],
)
def criar_matriz(dados: MatrizCurricularCreate, db: Session = Depends(get_db)):
    if db.get(Curso, dados.id_curso) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Curso não encontrado")

    matriz = MatrizCurricular(**dados.model_dump())
    db.add(matriz)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Já existe uma matriz com essa versão para este curso"
        )
    db.refresh(matriz)
    # Nota: se 'ativo=True', o trigger do banco (trg_matriz_curricular_unica_ativa_bi)
    # já desativa automaticamente as outras matrizes do mesmo curso.
    return matriz


@router.put("/matrizes/{id_matriz}", response_model=MatrizCurricularRead, dependencies=[pode_escrever])
def atualizar_matriz(id_matriz: int, dados: MatrizCurricularUpdate, db: Session = Depends(get_db)):
    matriz = _buscar_ou_404(db, MatrizCurricular, id_matriz, "id_matriz", "Matriz curricular")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(matriz, campo, valor)
    db.commit()
    db.refresh(matriz)
    # Idem: ativar esta matriz (ativo=True) aciona o trigger de desativação
    # automática das demais matrizes do mesmo curso.
    return matriz


@router.delete("/matrizes/{id_matriz}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[pode_escrever])
def excluir_matriz(id_matriz: int, db: Session = Depends(get_db)):
    matriz = _buscar_ou_404(db, MatrizCurricular, id_matriz, "id_matriz", "Matriz curricular")
    db.delete(matriz)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Não é possível excluir: a matriz tem disciplinas vinculadas",
        )


# ================= Disciplinas dentro da Matriz =================

@router.get(
    "/matrizes/{id_matriz}/disciplinas",
    response_model=list[MatrizDisciplinaRead],
    dependencies=[pode_ler],
)
def listar_disciplinas_da_matriz(id_matriz: int, db: Session = Depends(get_db)):
    _buscar_ou_404(db, MatrizCurricular, id_matriz, "id_matriz", "Matriz curricular")
    stmt = select(MatrizDisciplina).where(MatrizDisciplina.id_matriz == id_matriz)
    return db.scalars(stmt).all()


@router.post(
    "/matrizes/{id_matriz}/disciplinas",
    response_model=MatrizDisciplinaRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[pode_escrever],
)
def adicionar_disciplina_na_matriz(id_matriz: int, dados: MatrizDisciplinaCreate, db: Session = Depends(get_db)):
    _buscar_ou_404(db, MatrizCurricular, id_matriz, "id_matriz", "Matriz curricular")
    if db.get(Disciplina, dados.id_disciplina) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Disciplina não encontrada")

    vinculo = MatrizDisciplina(id_matriz=id_matriz, **dados.model_dump())
    db.add(vinculo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Essa disciplina já está nessa matriz")
    db.refresh(vinculo)
    return vinculo


@router.delete(
    "/matrizes/{id_matriz}/disciplinas/{id_disciplina}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[pode_escrever],
)
def remover_disciplina_da_matriz(id_matriz: int, id_disciplina: int, db: Session = Depends(get_db)):
    vinculo = db.get(MatrizDisciplina, (id_matriz, id_disciplina))
    if vinculo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vínculo não encontrado")
    db.delete(vinculo)
    db.commit()
