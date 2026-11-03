from datetime import date, time

from app.core.security import hash_password
from app.models.curriculo import Disciplina
from app.models.pessoas import Aluno, Professor
from app.models.rbac import Perfil
from app.models.sala import Sala
from app.models.turma import DiaSemana, Turma
from app.models.usuario import StatusUsuario, Usuario


# ----------------------------- helpers -----------------------------

def _usuario(db, email: str, perfil_nome: str) -> Usuario:
    perfil = db.query(Perfil).filter_by(nome=perfil_nome).first()
    if perfil is None:
        perfil = Perfil(nome=perfil_nome)
        db.add(perfil)
    usuario = Usuario(email=email, senha_hash=hash_password("senha123"), status=StatusUsuario.ativo)
    usuario.perfis.append(perfil)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def _aluno(db, n: int) -> Aluno:
    usuario = _usuario(db, f"aluno{n}@sga.edu", "ALUNO")
    aluno = Aluno(
        id_usuario=usuario.id_usuario,
        matricula=f"2026{n:04d}",
        nome_completo=f"Aluno {n}",
        cpf=f"{n:011d}",
        data_nascimento=date(2000, 1, 1),
    )
    db.add(aluno)
    db.commit()
    db.refresh(aluno)
    return aluno


def _professor(db, n: int) -> Professor:
    usuario = _usuario(db, f"prof{n}@sga.edu", "PROFESSOR")
    prof = Professor(
        id_usuario=usuario.id_usuario,
        matricula_funcional=f"F{n:04d}",
        nome_completo=f"Professor {n}",
        cpf=f"9{n:010d}",
    )
    db.add(prof)
    db.commit()
    db.refresh(prof)
    return prof


def _disciplina(db, codigo: str, nome: str | None = None) -> Disciplina:
    disciplina = Disciplina(codigo=codigo, nome=nome or f"Disciplina {codigo}")
    db.add(disciplina)
    db.commit()
    db.refresh(disciplina)
    return disciplina


def _turma(db, professor: Professor, codigo: str, dia=DiaSemana.SEG, ini=time(8), fim=time(10), vagas=30,
           disciplina: Disciplina | None = None, semestre="2026.2") -> Turma:
    if disciplina is None:
        disciplina = _disciplina(db, f"D-{codigo}", f"Disciplina {codigo}")
    sala = Sala(codigo=f"S-{codigo}", bloco_predio="A", capacidade=40)
    db.add(sala)
    db.commit()
    turma = Turma(
        id_disciplina=disciplina.id_disciplina,
        id_professor=professor.id_professor,
        id_sala=sala.id_sala,
        semestre_letivo=semestre,
        codigo_turma=codigo,
        dia_semana=dia,
        hora_inicio=ini,
        hora_fim=fim,
        vagas_totais=vagas,
    )
    db.add(turma)
    db.commit()
    db.refresh(turma)
    return turma


def _headers(client, email: str) -> dict:
    token = client.post("/auth/login", data={"username": email, "password": "senha123"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
