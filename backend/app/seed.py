"""
Cria os perfis básicos e um usuário admin inicial.
Rodar após 'alembic upgrade head':

    python -m app.seed

Ajuste a lista de PERFIS com o que a coordenação/secretaria confirmar.
"""

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.rbac import Perfil
from app.models.usuario import StatusUsuario, Usuario

PERFIS = ["ADMIN", "SECRETARIA", "PROFESSOR", "ALUNO"]  # nomes iguais ao UserRole do front

ADMIN_EMAIL = "admin@uneb.br"
ADMIN_SENHA = "SGA-EDU@2026"  # trocar após o primeiro login


def run() -> None:
    db = SessionLocal()
    try:
        perfis_existentes = {p.nome: p for p in db.query(Perfil).all()}
        for nome in PERFIS:
            if nome not in perfis_existentes:
                perfis_existentes[nome] = Perfil(nome=nome)
                db.add(perfis_existentes[nome])
        db.commit()

        admin = db.query(Usuario).filter_by(email=ADMIN_EMAIL).first()
        if admin is None:
            admin = Usuario(
                email=ADMIN_EMAIL,
                senha_hash=hash_password(ADMIN_SENHA),
                status=StatusUsuario.ativo,
            )
            admin.perfis.append(perfis_existentes["ADMIN"])
            db.add(admin)
            db.commit()
            print(f"Admin criado: {ADMIN_EMAIL} / {ADMIN_SENHA}")
        else:
            print("Admin já existe, nada a fazer.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
