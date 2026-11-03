from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.usuario import StatusUsuario


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    email: EmailStr
    status: StatusUsuario
    perfis: list[str]

    @classmethod
    def from_orm_usuario(cls, usuario) -> "UsuarioRead":
        return cls(
            id_usuario=usuario.id_usuario,
            email=usuario.email,
            status=usuario.status,
            perfis=usuario.nomes_perfis,
        )
