from pydantic import BaseModel, ConfigDict


class PrerequisitoCreate(BaseModel):
    id_prerequisito: int


class PrerequisitoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_disciplina: int
    id_prerequisito: int
