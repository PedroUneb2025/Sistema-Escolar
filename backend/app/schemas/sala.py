from pydantic import BaseModel, ConfigDict, Field


class SalaCreate(BaseModel):
    codigo: str = Field(max_length=20)
    bloco_predio: str = Field(max_length=50)
    capacidade: int
    tipo: str = Field(default="AULA", max_length=50)


class SalaUpdate(BaseModel):
    codigo: str | None = Field(default=None, max_length=20)
    bloco_predio: str | None = Field(default=None, max_length=50)
    capacidade: int | None = None
    tipo: str | None = Field(default=None, max_length=50)


class SalaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_sala: int
    codigo: str
    bloco_predio: str
    capacidade: int
    tipo: str


class ProfessorResumo(BaseModel):
    id_professor: int
    nome_completo: str
    matricula_funcional: str
