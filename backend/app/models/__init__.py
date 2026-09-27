# Importar todos os models aqui garante que o Alembic (autogenerate) os
# enxergue via Base.metadata, mesmo sem uso direto neste arquivo.
from app.models.associations import perfil_permissao, usuario_perfil  # noqa: F401
from app.models.pessoas import Aluno, Professor  # noqa: F401
from app.models.rbac import Perfil, Permissao  # noqa: F401
from app.models.usuario import StatusUsuario, Usuario  # noqa: F401
