"""
Verifica, contra a API rodando de verdade (MySQL), que a ÚLTIMA vaga de uma turma
nunca é dada a duas pessoas ao mesmo tempo.

Os testes automáticos (pytest) usam SQLite e não conseguem reproduzir esse caso,
porque ele depende do travamento de linhas e do isolamento de transações do MySQL.

Como usar (com a API no ar e o `py -m app.seed_demo` já executado):

    py scripts/verificar_corrida_vagas.py                  # API em http://127.0.0.1:8000
    py scripts/verificar_corrida_vagas.py http://127.0.0.1:8765

Cria alunos e turmas de teste, dispara matrículas simultâneas e apaga tudo no fim.
Saída com código 0 = passou; código 1 = alguma vaga foi dada a mais de uma pessoa.
"""

import concurrent.futures as cf
import sys
import time
from datetime import time as hora
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func, select  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.models.curriculo import Disciplina  # noqa: E402
from app.models.pessoas import Aluno, Professor  # noqa: E402
from app.models.sala import Sala  # noqa: E402
from app.models.turma import DiaSemana, MatriculaTurma, SituacaoMatricula, Turma  # noqa: E402
from app.models.usuario import Usuario  # noqa: E402

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
RODADAS = [DiaSemana.QUA, DiaSemana.QUI, DiaSemana.SEX]  # um dia por rodada (sem conflito de horário)
TURMAS_POR_RODADA = 8  # 8 horários seguidos, das 06h às 14h
SENHA = "Senha@123"
SUFIXO = str(int(time.time()))


def login(email: str, senha: str = SENHA) -> dict:
    r = httpx.post(f"{URL}/auth/login", data={"username": email, "password": senha}, timeout=60)
    r.raise_for_status()
    return {"Authorization": "Bearer " + r.json()["access_token"]}


def main() -> int:
    secretaria = login("secretaria@uneb.br")
    emails = [f"corrida{SUFIXO}a@uneb.br", f"corrida{SUFIXO}b@uneb.br"]
    for i, email in enumerate(emails):
        r = httpx.post(
            f"{URL}/usuarios/alunos",
            headers=secretaria,
            timeout=60,
            json={
                "email": email,
                "senha": SENHA,
                "matricula": f"CORR{SUFIXO}{i}",
                "nome_completo": f"Aluno Corrida {i}",
                "cpf": f"{int(SUFIXO) % 10**9:09d}{i}0",
                "data_nascimento": "2000-01-01",
            },
        )
        r.raise_for_status()
    tokens = [login(e) for e in emails]

    db = SessionLocal()
    turmas_criadas: list[int] = []
    disciplina = None
    try:
        professor = db.scalar(select(Professor).limit(1))
        sala = db.scalar(select(Sala).limit(1))
        if professor is None or sala is None:
            print("Faltam professor/sala no banco. Rode: py -m app.seed_demo")
            return 1

        disciplina = Disciplina(codigo=f"CORR{SUFIXO}", nome="Disciplina de teste de corrida")
        db.add(disciplina)
        db.flush()
        for dia in RODADAS:
            for k in range(TURMAS_POR_RODADA):
                t = Turma(
                    id_disciplina=disciplina.id_disciplina,
                    id_professor=professor.id_professor,
                    id_sala=sala.id_sala,
                    semestre_letivo="2099.1",
                    codigo_turma=f"C{SUFIXO[-5:]}-{dia.value}{k}",
                    dia_semana=dia,
                    hora_inicio=hora(6 + k),
                    hora_fim=hora(7 + k),
                    vagas_totais=1,
                )
                db.add(t)
                db.flush()
                turmas_criadas.append(t.id_turma)
        db.commit()

        def tentar(args):
            id_turma, cabecalho = args
            r = httpx.post(f"{URL}/matriculas", json={"id_turma": id_turma}, headers=cabecalho, timeout=60)
            return id_turma, r.status_code

        tarefas = [(t, h) for t in turmas_criadas for h in tokens]
        with cf.ThreadPoolExecutor(max_workers=16) as ex:
            resultados = list(ex.map(tentar, tarefas))

        duplicadas = erros_500 = outras = 0
        for t in turmas_criadas:
            codigos = sorted(c for tt, c in resultados if tt == t)
            ocupadas = db.scalar(
                select(func.count())
                .select_from(MatriculaTurma)
                .where(MatriculaTurma.id_turma == t, MatriculaTurma.situacao == SituacaoMatricula.matriculado)
            )
            if codigos == [201, 409] and ocupadas == 1:
                continue
            print(f"FALHOU  turma {t}: respostas {codigos}, matriculados no banco = {ocupadas}")
            if ocupadas > 1:
                duplicadas += 1
            elif 500 in codigos:
                erros_500 += 1
            else:
                outras += 1

        total = len(turmas_criadas)
        if duplicadas or erros_500 or outras:
            print(f"\nDe {total} turmas: {duplicadas} com vaga dada a mais de uma pessoa, "
                  f"{erros_500} com erro 500 (deadlock?), {outras} com outro resultado inesperado.")
            return 1
        print(f"OK: nas {total} turmas de 1 vaga, exatamente 1 aluno entrou e o outro recebeu 409.")
        return 0
    finally:
        # limpeza: remove tudo o que este script criou
        db.rollback()
        if turmas_criadas:
            db.query(MatriculaTurma).filter(MatriculaTurma.id_turma.in_(turmas_criadas)).delete(synchronize_session=False)
            db.query(Turma).filter(Turma.id_turma.in_(turmas_criadas)).delete(synchronize_session=False)
        if disciplina is not None and disciplina.id_disciplina:
            db.query(Disciplina).filter(Disciplina.id_disciplina == disciplina.id_disciplina).delete(synchronize_session=False)
        ids_usuarios = [u for (u,) in db.execute(select(Usuario.id_usuario).where(Usuario.email.in_(emails)))]
        if ids_usuarios:
            db.query(Aluno).filter(Aluno.id_usuario.in_(ids_usuarios)).delete(synchronize_session=False)
            db.query(Usuario).filter(Usuario.id_usuario.in_(ids_usuarios)).delete(synchronize_session=False)
        db.commit()
        db.close()


if __name__ == "__main__":
    sys.exit(main())
