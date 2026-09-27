-- Schema recebido do responsável por Banco de Dados/Segurança (Sprint 1).
-- Mantido aqui como referência. A fonte de verdade para migrations passa a
-- ser o Alembic (gerado a partir dos models em app/models/). Se o DBA alterar
-- o schema, atualize os models e gere uma nova revisão do Alembic — não
-- edite o banco na mão.
CREATE TABLE usuario (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    status ENUM('ativo', 'inativo', 'bloqueado') NOT NULL DEFAULT 'ativo',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE perfil (
    id_perfil INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao VARCHAR(255)
);

CREATE TABLE permissao (
    id_permissao INT PRIMARY KEY AUTO_INCREMENT,
    slug VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(255)
);

CREATE TABLE usuario_perfil (
    id_perfil INT NOT NULL,
    id_usuario INT NOT NULL,
    atribuido_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_perfil, id_usuario)
);

CREATE TABLE perfil_permissao (
    id_perfil INT NOT NULL,
    id_permissao INT NOT NULL,
    PRIMARY KEY (id_perfil, id_permissao)
);

CREATE TABLE aluno (
    id_aluno INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL UNIQUE,
    matricula VARCHAR(30) NOT NULL UNIQUE,
    nome_completo VARCHAR(150) NOT NULL,
    cpf CHAR(11) NOT NULL UNIQUE,
    data_nascimento DATE NOT NULL,
    telefone VARCHAR(20)
);

CREATE TABLE professor (
    id_professor INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL UNIQUE,
    matricula_funcional VARCHAR(30) NOT NULL UNIQUE,
    nome_completo VARCHAR(150) NOT NULL,
    cpf CHAR(11) NOT NULL UNIQUE,
    titulacao VARCHAR(50)
);

CREATE TABLE curso (
    id_curso INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(120) NOT NULL,
    grau VARCHAR(50) NOT NULL
);

CREATE TABLE matriz_curricular (
    id_matriz INT PRIMARY KEY AUTO_INCREMENT,
    id_curso INT NOT NULL,
    versao_ano VARCHAR(10) NOT NULL,
    carga_horaria_total INT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE disciplina (
    id_disciplina INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(120) NOT NULL,
    ementa TEXT
);

CREATE TABLE matriz_disciplina (
    id_matriz INT NOT NULL,
    id_disciplina INT NOT NULL,
    semestre_ideal INT NOT NULL,
    carga_horaria INT NOT NULL,
    obrigatoria BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_matriz, id_disciplina)
);

CREATE TABLE turma (
    id_turma INT PRIMARY KEY AUTO_INCREMENT,
    id_professor INT NOT NULL,
    id_disciplina INT NOT NULL,
    semestre_letivo VARCHAR(10) NOT NULL,
    codigo_turma VARCHAR(20) NOT NULL,
    vagas_totais INT NOT NULL
);

CREATE TABLE matricula_turma (
    id_matricula_turma INT PRIMARY KEY AUTO_INCREMENT,
    id_aluno INT NOT NULL,
    id_turma INT NOT NULL,
    nota_final DECIMAL(4,2) NULL,
    frequencia DECIMAL(5,2) NULL,
    situacao ENUM('matriculado', 'aprovado', 'reprovado_nota', 'reprovado_falta', 'trancado') NOT NULL DEFAULT 'matriculado',
    UNIQUE KEY uk_aluno_turma (id_aluno, id_turma)
);

-- ========================================================
-- CHAVES ESTRANGEIRAS (FOREIGN KEYS)
-- ========================================================

ALTER TABLE usuario_perfil 
    ADD CONSTRAINT fk_up_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id_perfil) ON DELETE CASCADE,
    ADD CONSTRAINT fk_up_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE;

ALTER TABLE perfil_permissao 
    ADD CONSTRAINT fk_pp_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id_perfil) ON DELETE CASCADE,
    ADD CONSTRAINT fk_pp_permissao FOREIGN KEY (id_permissao) REFERENCES permissao (id_permissao) ON DELETE CASCADE;

ALTER TABLE aluno 
    ADD CONSTRAINT fk_aluno_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario);

ALTER TABLE professor 
    ADD CONSTRAINT fk_professor_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario);

ALTER TABLE matriz_curricular 
    ADD CONSTRAINT fk_matriz_curso FOREIGN KEY (id_curso) REFERENCES curso (id_curso);

ALTER TABLE matriz_disciplina 
    ADD CONSTRAINT fk_md_matriz FOREIGN KEY (id_matriz) REFERENCES matriz_curricular (id_matriz),
    ADD CONSTRAINT fk_md_disciplina FOREIGN KEY (id_disciplina) REFERENCES disciplina (id_disciplina);

ALTER TABLE turma 
    ADD CONSTRAINT fk_turma_professor FOREIGN KEY (id_professor) REFERENCES professor (id_professor),
    ADD CONSTRAINT fk_turma_disciplina FOREIGN KEY (id_disciplina) REFERENCES disciplina (id_disciplina);

ALTER TABLE matricula_turma 
    ADD CONSTRAINT fk_mt_aluno FOREIGN KEY (id_aluno) REFERENCES aluno (id_aluno),
    ADD CONSTRAINT fk_mt_turma FOREIGN KEY (id_turma) REFERENCES turma (id_turma);