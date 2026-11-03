from pydantic import BaseModel, ConfigDict, Field


# ---------- Curso ----------

class CursoCreate(BaseModel):
    codigo: str = Field(max_length=20)
    nome: str = Field(max_length=120)
    grau: str = Field(max_length=50)


class CursoUpdate(BaseModel):
    codigo: str | None = Field(default=None, max_length=20)
    nome: str | None = Field(default=None, max_length=120)
    grau: str | None = Field(default=None, max_length=50)


class CursoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_curso: int
    codigo: str
    nome: str
    grau: str


# ---------- Disciplina ----------

class DisciplinaCreate(BaseModel):
    codigo: str = Field(max_length=20)
    nome: str = Field(max_length=120)
    ementa: str | None = None


class DisciplinaUpdate(BaseModel):
    codigo: str | None = Field(default=None, max_length=20)
    nome: str | None = Field(default=None, max_length=120)
    ementa: str | None = None


class DisciplinaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_disciplina: int
    codigo: str
    nome: str
    ementa: str | None


# ---------- Matriz Curricular ----------

class MatrizCurricularCreate(BaseModel):
    id_curso: int
    versao_ano: str = Field(max_length=10)
    carga_horaria_total: int = Field(gt=0)
    ativo: bool = True


class MatrizCurricularUpdate(BaseModel):
    carga_horaria_total: int | None = Field(default=None, gt=0)
    ativo: bool | None = None


class MatrizCurricularRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_matriz: int
    id_curso: int
    versao_ano: str
    carga_horaria_total: int
    ativo: bool


# ---------- Matriz x Disciplina (associação) ----------

class MatrizDisciplinaCreate(BaseModel):
    id_disciplina: int
    semestre_ideal: int = Field(gt=0)
    carga_horaria: int = Field(gt=0)
    obrigatoria: bool = True


class MatrizDisciplinaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_matriz: int
    id_disciplina: int
    semestre_ideal: int
    carga_horaria: int
    obrigatoria: bool
    disciplina: DisciplinaRead
