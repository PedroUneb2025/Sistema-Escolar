DROP TRIGGER IF EXISTS trg_matriz_curricular_unica_ativa_bi;
DROP TRIGGER IF EXISTS trg_matriz_curricular_unica_ativa_bu;

DELIMITER $$
CREATE TRIGGER trg_matriz_curricular_unica_ativa_ai
AFTER INSERT ON matriz_curricular
FOR EACH ROW
BEGIN
    IF NEW.ativo = TRUE THEN
        UPDATE matriz_curricular
        SET ativo = FALSE
        WHERE id_curso = NEW.id_curso AND id_matriz <> NEW.id_matriz;
    END IF;
END$$

CREATE TRIGGER trg_matriz_curricular_unica_ativa_au
AFTER UPDATE ON matriz_curricular
FOR EACH ROW
BEGIN
    IF NEW.ativo = TRUE AND OLD.ativo = FALSE THEN
        UPDATE matriz_curricular
        SET ativo = FALSE
        WHERE id_curso = NEW.id_curso AND id_matriz <> NEW.id_matriz;
    END IF;
END$$
DELIMITER ;
