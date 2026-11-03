-- Alterações do DBA (Sprint 3) para aplicar em um banco que JÁ tem o schema do sga_new.sql.
--
-- NÃO incluído de propósito:
--   ALTER TABLE turma ADD COLUMN dia_semana ...
-- A coluna dia_semana já existe na tabela turma (veio no sga_new.sql), então esse
-- ALTER falharia com "Duplicate column name". Além disso, ele inclui o valor 'DOM',
-- que o model Python (DiaSemana) não tem. Confirmar com o DBA se domingo é desejado.

CREATE TABLE IF NOT EXISTS disciplina_prerequisito (
    id_disciplina INT NOT NULL,
    id_prerequisito INT NOT NULL,
    PRIMARY KEY (id_disciplina, id_prerequisito),
    CONSTRAINT chk_nao_autoreferencia CHECK (id_disciplina <> id_prerequisito),
    CONSTRAINT fk_dp_disciplina FOREIGN KEY (id_disciplina) REFERENCES disciplina (id_disciplina) ON DELETE CASCADE,
    CONSTRAINT fk_dp_prerequisito FOREIGN KEY (id_prerequisito) REFERENCES disciplina (id_disciplina) ON DELETE CASCADE
);

-- matricula_turma: listagem de chamada / relatórios por turma
CREATE INDEX idx_matricula_turma_relatorio ON matricula_turma (id_turma, situacao, frequencia);
-- matricula_turma: histórico do aluno, média/frequência e validação de pré-requisitos
CREATE INDEX idx_matricula_aluno_desempenho ON matricula_turma (id_aluno, situacao, nota_final);
-- turma: quadro de horários, alocação de salas e conflitos
CREATE INDEX idx_turma_periodo_sala ON turma (semestre_letivo, dia_semana, id_sala, hora_inicio, hora_fim);
-- turma: portal do docente / turmas ofertadas por disciplina
CREATE INDEX idx_turma_professor_oferta ON turma (semestre_letivo, id_professor, id_disciplina);
