"""
Dados de DEMONSTRAÇÃO para desenvolvimento e para a apresentação.
Rodar depois do seed normal:

    python -m app.seed
    python -m app.seed_demo

Cria (se ainda não existirem; pode rodar várias vezes):
  - todos os perfis usados pelo front (inclusive COORDENACAO e FINANCEIRO)
  - uma conta por perfil, todas com a mesma senha de teste
  - um aluno e um professor vinculados às contas
  - uma sala, uma disciplina e uma turma, para testar a matrícula

NÃO rode em ambiente de produção: as senhas são conhecidas.
"""

from datetime import date, time

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.curriculo import Disciplina
from app.models.pessoas import Aluno, Professor
from app.models.rbac import Perfil
from app.models.sala import Sala
from app.models.turma import DiaSemana, Turma
from app.models.usuario import StatusUsuario, Usuario

SENHA_DEMO = "Senha@123"

PERFIS = ["ADMIN", "SECRETARIA", "COORDENACAO", "PROFESSOR", "ALUNO", "FINANCEIRO"]

CONTAS = {
    "secretaria@uneb.br": "SECRETARIA",
    "coordenacao@uneb.br": "COORDENACAO",
    "financeiro@uneb.br": "FINANCEIRO",
    "professor@uneb.br": "PROFESSOR",
    "aluno@uneb.br": "ALUNO",
}


def _perfil(db, nome: str) -> Perfil:
    perfil = db.query(Perfil).filter_by(nome=nome).first()
    if perfil is None:
        perfil = Perfil(nome=nome)
        db.add(perfil)
        db.flush()
    return perfil


def _conta(db, email: str, perfil_nome: str) -> Usuario:
    usuario = db.query(Usuario).filter_by(email=email).first()
    if usuario is None:
        usuario = Usuario(email=email, senha_hash=hash_password(SENHA_DEMO), status=StatusUsuario.ativo)
        usuario.perfis.append(_perfil(db, perfil_nome))
        db.add(usuario)
        db.flush()
    return usuario


def run() -> None:
    db = SessionLocal()
    try:
        for nome in PERFIS:
            _perfil(db, nome)

        contas = {email: _conta(db, email, perfil) for email, perfil in CONTAS.items()}

        aluno_usuario = contas["aluno@uneb.br"]
        if not db.query(Aluno).filter_by(id_usuario=aluno_usuario.id_usuario).first():
            db.add(Aluno(
                id_usuario=aluno_usuario.id_usuario,
                matricula="20260001",
                nome_completo="Aluno Demonstração",
                cpf="11111111111",
                data_nascimento=date(2000, 1, 15),
            ))

        prof_usuario = contas["professor@uneb.br"]
        professor = db.query(Professor).filter_by(id_usuario=prof_usuario.id_usuario).first()
        if professor is None:
            professor = Professor(
                id_usuario=prof_usuario.id_usuario,
                matricula_funcional="F0001",
                nome_completo="Professor Demonstração",
                cpf="22222222222",
                titulacao="Mestre",
            )
            db.add(professor)
            db.flush()

        sala = db.query(Sala).filter_by(codigo="A101").first()
        if sala is None:
            sala = Sala(codigo="A101", bloco_predio="Bloco A", capacidade=40)
            db.add(sala)
            db.flush()

        disciplina = db.query(Disciplina).filter_by(codigo="PROG1").first()
        if disciplina is None:
            disciplina = Disciplina(codigo="PROG1", nome="Programação I", ementa="Lógica de programação.")
            db.add(disciplina)
            db.flush()

        turma = db.query(Turma).filter_by(
            id_disciplina=disciplina.id_disciplina, semestre_letivo="2026.2", codigo_turma="PROG1-A"
        ).first()
        if turma is None:
            db.add(Turma(
                id_disciplina=disciplina.id_disciplina,
                id_professor=professor.id_professor,
                id_sala=sala.id_sala,
                semestre_letivo="2026.2",
                codigo_turma="PROG1-A",
                dia_semana=DiaSemana.SEG,
                hora_inicio=time(8, 0),
                hora_fim=time(10, 0),
                vagas_totais=40,
            ))

        db.commit()
    finally:
        db.close()

    print("Seed de demonstração concluído. Contas (senha de todas: %s):" % SENHA_DEMO)
    for email, perfil in CONTAS.items():
        print(f"  {perfil:<12} {email}")


if __name__ == "__main__":
    run()
