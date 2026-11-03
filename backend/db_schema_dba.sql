CREATE DATABASE IF NOT EXISTS sga_edu
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sga_edu;


CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    status ENUM('ativo', 'inativo', 'bloqueado') NOT NULL DEFAULT 'ativo',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE perfil (
    id_perfil INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao VARCHAR(255) NULL
);

CREATE TABLE permissao (
    id_permissao INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(255) NULL
);

CREATE TABLE usuario_perfil (
    id_usuario INT NOT NULL,
    id_perfil INT NOT NULL,
    atribuido_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_perfil)
);

CREATE TABLE perfil_permissao (
    id_perfil INT NOT NULL,
    id_permissao INT NOT NULL,
    PRIMARY KEY (id_perfil, id_permissao)
);


CREATE TABLE sala (
    id_sala INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    bloco_predio VARCHAR(50) NOT NULL,
    capacidade INT NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'AULA'
);

CREATE TABLE curso (
    id_curso INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(120) NOT NULL,
    grau VARCHAR(50) NOT NULL
);

CREATE TABLE matriz_curricular (
    id_matriz INT AUTO_INCREMENT PRIMARY KEY,
    id_curso INT NOT NULL,
    versao_ano VARCHAR(10) NOT NULL,
    carga_horaria_total INT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_matriz_curso_versao UNIQUE (id_curso, versao_ano)
);

CREATE TABLE disciplina (
    id_disciplina INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(120) NOT NULL,
    ementa TEXT NULL
);

CREATE TABLE matriz_disciplina (
    id_matriz INT NOT NULL,
    id_disciplina INT NOT NULL,
    semestre_ideal INT NOT NULL,
    carga_horaria INT NOT NULL,
    obrigatoria BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_matriz, id_disciplina)
);


CREATE TABLE aluno (
    id_aluno INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    matricula VARCHAR(30) NOT NULL UNIQUE,
    nome_completo VARCHAR(150) NOT NULL,
    cpf CHAR(11) NOT NULL UNIQUE,
    data_nascimento DATE NOT NULL,
    telefone VARCHAR(20) NULL
);

CREATE TABLE professor (
    id_professor INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    matricula_funcional VARCHAR(30) NOT NULL UNIQUE,
    nome_completo VARCHAR(150) NOT NULL,
    cpf CHAR(11) NOT NULL UNIQUE,
    titulacao VARCHAR(50) NULL
);

CREATE TABLE turma (
    id_turma INT AUTO_INCREMENT PRIMARY KEY,
    id_disciplina INT NOT NULL,
    id_professor INT NOT NULL,
    id_sala INT NOT NULL,
    semestre_letivo VARCHAR(10) NOT NULL,
    codigo_turma VARCHAR(20) NOT NULL,
    dia_semana ENUM('SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    vagas_totais INT NOT NULL
);

CREATE TABLE matricula_turma (
    id_matricula_turma INT AUTO_INCREMENT PRIMARY KEY,
    id_aluno INT NOT NULL,
    id_turma INT NOT NULL,
    nota_final DECIMAL(4,2) NULL,
    frequencia DECIMAL(5,2) NULL,
    situacao ENUM('matriculado', 'aprovado', 'reprovado_nota', 'reprovado_falta', 'trancado') NOT NULL DEFAULT 'matriculado',
    CONSTRAINT uk_aluno_turma UNIQUE (id_aluno, id_turma)
);

ALTER TABLE usuario_perfil 
    ADD CONSTRAINT fk_up_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    ADD CONSTRAINT fk_up_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id_perfil) ON DELETE CASCADE;

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
    ADD CONSTRAINT fk_md_matriz FOREIGN KEY (id_matriz) REFERENCES matriz_curricular (id_matriz) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_md_disciplina FOREIGN KEY (id_disciplina) REFERENCES disciplina (id_disciplina) ON DELETE RESTRICT;

ALTER TABLE turma 
    ADD CONSTRAINT fk_turma_disciplina FOREIGN KEY (id_disciplina) REFERENCES disciplina (id_disciplina),
    ADD CONSTRAINT fk_turma_professor FOREIGN KEY (id_professor) REFERENCES professor (id_professor),
    ADD CONSTRAINT fk_turma_sala FOREIGN KEY (id_sala) REFERENCES sala (id_sala);

ALTER TABLE matricula_turma 
    ADD CONSTRAINT fk_mt_aluno FOREIGN KEY (id_aluno) REFERENCES aluno (id_aluno),
    ADD CONSTRAINT fk_mt_turma FOREIGN KEY (id_turma) REFERENCES turma (id_turma);


DELIMITER $$
CREATE TRIGGER trg_matriz_curricular_unica_ativa_bi
BEFORE INSERT ON matriz_curricular
FOR EACH ROW
BEGIN
    IF NEW.ativo = TRUE THEN
        UPDATE matriz_curricular 
        SET ativo = FALSE 
        WHERE id_curso = NEW.id_curso;
    END IF;
END$$

CREATE TRIGGER trg_matriz_curricular_unica_ativa_bu
BEFORE UPDATE ON matriz_curricular
FOR EACH ROW
BEGIN
    IF NEW.ativo = TRUE AND OLD.ativo = FALSE THEN
        UPDATE matriz_curricular 
        SET ativo = FALSE 
        WHERE id_curso = NEW.id_curso AND id_matriz <> NEW.id_matriz;
    END IF;
END$$
DELIMITER ;