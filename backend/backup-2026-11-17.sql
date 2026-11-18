-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: sga_edu
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alembic_version`
--

DROP TABLE IF EXISTS `alembic_version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alembic_version` (
  `version_num` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`version_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alembic_version`
--

LOCK TABLES `alembic_version` WRITE;
/*!40000 ALTER TABLE `alembic_version` DISABLE KEYS */;
INSERT INTO `alembic_version` VALUES ('a1c3d5e7f901');
/*!40000 ALTER TABLE `alembic_version` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `aluno`
--

DROP TABLE IF EXISTS `aluno`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aluno` (
  `id_aluno` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `matricula` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_completo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cpf` char(11) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_nascimento` date NOT NULL,
  `telefone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_aluno`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  UNIQUE KEY `matricula` (`matricula`),
  UNIQUE KEY `cpf` (`cpf`),
  CONSTRAINT `fk_aluno_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aluno`
--

LOCK TABLES `aluno` WRITE;
/*!40000 ALTER TABLE `aluno` DISABLE KEYS */;
INSERT INTO `aluno` VALUES (1,6,'20260001','Aluno Demonstração','11111111111','2000-01-15',NULL);
/*!40000 ALTER TABLE `aluno` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `curso`
--

DROP TABLE IF EXISTS `curso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `curso` (
  `id_curso` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `grau` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_curso`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `curso`
--

LOCK TABLES `curso` WRITE;
/*!40000 ALTER TABLE `curso` DISABLE KEYS */;
/*!40000 ALTER TABLE `curso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `disciplina`
--

DROP TABLE IF EXISTS `disciplina`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `disciplina` (
  `id_disciplina` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ementa` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_disciplina`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `disciplina`
--

LOCK TABLES `disciplina` WRITE;
/*!40000 ALTER TABLE `disciplina` DISABLE KEYS */;
INSERT INTO `disciplina` VALUES (1,'PROG1','Programação I','Lógica de programação.');
/*!40000 ALTER TABLE `disciplina` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `disciplina_prerequisito`
--

DROP TABLE IF EXISTS `disciplina_prerequisito`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `disciplina_prerequisito` (
  `id_disciplina` int NOT NULL,
  `id_prerequisito` int NOT NULL,
  PRIMARY KEY (`id_disciplina`,`id_prerequisito`),
  KEY `fk_dp_prerequisito` (`id_prerequisito`),
  CONSTRAINT `fk_dp_disciplina` FOREIGN KEY (`id_disciplina`) REFERENCES `disciplina` (`id_disciplina`) ON DELETE CASCADE,
  CONSTRAINT `fk_dp_prerequisito` FOREIGN KEY (`id_prerequisito`) REFERENCES `disciplina` (`id_disciplina`) ON DELETE CASCADE,
  CONSTRAINT `chk_nao_autoreferencia` CHECK ((`id_disciplina` <> `id_prerequisito`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `disciplina_prerequisito`
--

LOCK TABLES `disciplina_prerequisito` WRITE;
/*!40000 ALTER TABLE `disciplina_prerequisito` DISABLE KEYS */;
/*!40000 ALTER TABLE `disciplina_prerequisito` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `frequencia_aula`
--

DROP TABLE IF EXISTS `frequencia_aula`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `frequencia_aula` (
  `id_frequencia` int NOT NULL AUTO_INCREMENT,
  `id_matricula_turma` int NOT NULL,
  `data_aula` date NOT NULL,
  `quantidade_faltas` int NOT NULL DEFAULT '0',
  `conteudo_ministrado` text COLLATE utf8mb4_unicode_ci,
  `justificativa` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_frequencia`),
  UNIQUE KEY `uk_frequencia_matricula_data` (`id_matricula_turma`,`data_aula`),
  KEY `idx_frequencia_matricula_data` (`id_matricula_turma`,`data_aula`,`quantidade_faltas`),
  CONSTRAINT `fk_fa_matricula_turma` FOREIGN KEY (`id_matricula_turma`) REFERENCES `matricula_turma` (`id_matricula_turma`) ON DELETE CASCADE,
  CONSTRAINT `chk_faltas_nao_negativas` CHECK ((`quantidade_faltas` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `frequencia_aula`
--

LOCK TABLES `frequencia_aula` WRITE;
/*!40000 ALTER TABLE `frequencia_aula` DISABLE KEYS */;
/*!40000 ALTER TABLE `frequencia_aula` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matricula_turma`
--

DROP TABLE IF EXISTS `matricula_turma`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matricula_turma` (
  `id_matricula_turma` int NOT NULL AUTO_INCREMENT,
  `id_aluno` int NOT NULL,
  `id_turma` int NOT NULL,
  `nota_final` decimal(4,2) DEFAULT NULL,
  `frequencia` decimal(5,2) DEFAULT NULL,
  `situacao` enum('matriculado','aprovado','reprovado_nota','reprovado_falta','trancado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'matriculado',
  PRIMARY KEY (`id_matricula_turma`),
  UNIQUE KEY `uk_aluno_turma` (`id_aluno`,`id_turma`),
  KEY `idx_matricula_turma_relatorio` (`id_turma`,`situacao`,`frequencia`),
  KEY `idx_matricula_aluno_desempenho` (`id_aluno`,`situacao`,`nota_final`),
  CONSTRAINT `fk_mt_aluno` FOREIGN KEY (`id_aluno`) REFERENCES `aluno` (`id_aluno`),
  CONSTRAINT `fk_mt_turma` FOREIGN KEY (`id_turma`) REFERENCES `turma` (`id_turma`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matricula_turma`
--

LOCK TABLES `matricula_turma` WRITE;
/*!40000 ALTER TABLE `matricula_turma` DISABLE KEYS */;
/*!40000 ALTER TABLE `matricula_turma` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matriz_curricular`
--

DROP TABLE IF EXISTS `matriz_curricular`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matriz_curricular` (
  `id_matriz` int NOT NULL AUTO_INCREMENT,
  `id_curso` int NOT NULL,
  `versao_ano` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `carga_horaria_total` int NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_matriz`),
  UNIQUE KEY `uk_matriz_curso_versao` (`id_curso`,`versao_ano`),
  CONSTRAINT `fk_matriz_curso` FOREIGN KEY (`id_curso`) REFERENCES `curso` (`id_curso`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matriz_curricular`
--

LOCK TABLES `matriz_curricular` WRITE;
/*!40000 ALTER TABLE `matriz_curricular` DISABLE KEYS */;
/*!40000 ALTER TABLE `matriz_curricular` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matriz_disciplina`
--

DROP TABLE IF EXISTS `matriz_disciplina`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matriz_disciplina` (
  `id_matriz` int NOT NULL,
  `id_disciplina` int NOT NULL,
  `semestre_ideal` int NOT NULL,
  `carga_horaria` int NOT NULL,
  `obrigatoria` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_matriz`,`id_disciplina`),
  KEY `fk_md_disciplina` (`id_disciplina`),
  CONSTRAINT `fk_md_disciplina` FOREIGN KEY (`id_disciplina`) REFERENCES `disciplina` (`id_disciplina`) ON DELETE RESTRICT,
  CONSTRAINT `fk_md_matriz` FOREIGN KEY (`id_matriz`) REFERENCES `matriz_curricular` (`id_matriz`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matriz_disciplina`
--

LOCK TABLES `matriz_disciplina` WRITE;
/*!40000 ALTER TABLE `matriz_disciplina` DISABLE KEYS */;
/*!40000 ALTER TABLE `matriz_disciplina` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `perfil`
--

DROP TABLE IF EXISTS `perfil`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `perfil` (
  `id_perfil` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_perfil`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `perfil`
--

LOCK TABLES `perfil` WRITE;
/*!40000 ALTER TABLE `perfil` DISABLE KEYS */;
INSERT INTO `perfil` VALUES (1,'ADMIN',NULL),(2,'SECRETARIA',NULL),(3,'PROFESSOR',NULL),(4,'ALUNO',NULL),(5,'COORDENACAO',NULL),(6,'FINANCEIRO',NULL);
/*!40000 ALTER TABLE `perfil` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `perfil_permissao`
--

DROP TABLE IF EXISTS `perfil_permissao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `perfil_permissao` (
  `id_perfil` int NOT NULL,
  `id_permissao` int NOT NULL,
  PRIMARY KEY (`id_perfil`,`id_permissao`),
  KEY `fk_pp_permissao` (`id_permissao`),
  CONSTRAINT `fk_pp_perfil` FOREIGN KEY (`id_perfil`) REFERENCES `perfil` (`id_perfil`) ON DELETE CASCADE,
  CONSTRAINT `fk_pp_permissao` FOREIGN KEY (`id_permissao`) REFERENCES `permissao` (`id_permissao`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `perfil_permissao`
--

LOCK TABLES `perfil_permissao` WRITE;
/*!40000 ALTER TABLE `perfil_permissao` DISABLE KEYS */;
/*!40000 ALTER TABLE `perfil_permissao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissao`
--

DROP TABLE IF EXISTS `permissao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissao` (
  `id_permissao` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_permissao`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissao`
--

LOCK TABLES `permissao` WRITE;
/*!40000 ALTER TABLE `permissao` DISABLE KEYS */;
/*!40000 ALTER TABLE `permissao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `professor`
--

DROP TABLE IF EXISTS `professor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `professor` (
  `id_professor` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `matricula_funcional` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_completo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cpf` char(11) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulacao` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_professor`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  UNIQUE KEY `matricula_funcional` (`matricula_funcional`),
  UNIQUE KEY `cpf` (`cpf`),
  CONSTRAINT `fk_professor_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `professor`
--

LOCK TABLES `professor` WRITE;
/*!40000 ALTER TABLE `professor` DISABLE KEYS */;
INSERT INTO `professor` VALUES (1,5,'F0001','Professor Demonstração','22222222222','Mestre');
/*!40000 ALTER TABLE `professor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sala`
--

DROP TABLE IF EXISTS `sala`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sala` (
  `id_sala` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bloco_predio` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacidade` int NOT NULL,
  `tipo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AULA',
  PRIMARY KEY (`id_sala`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sala`
--

LOCK TABLES `sala` WRITE;
/*!40000 ALTER TABLE `sala` DISABLE KEYS */;
INSERT INTO `sala` VALUES (1,'A101','Bloco A',40,'AULA');
/*!40000 ALTER TABLE `sala` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `turma`
--

DROP TABLE IF EXISTS `turma`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `turma` (
  `id_turma` int NOT NULL AUTO_INCREMENT,
  `id_disciplina` int NOT NULL,
  `id_professor` int NOT NULL,
  `id_sala` int NOT NULL,
  `semestre_letivo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_turma` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dia_semana` enum('SEG','TER','QUA','QUI','SEX','SAB') COLLATE utf8mb4_unicode_ci NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fim` time NOT NULL,
  `vagas_totais` int NOT NULL,
  `status` enum('aberta','fechada','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'aberta',
  PRIMARY KEY (`id_turma`),
  KEY `fk_turma_disciplina` (`id_disciplina`),
  KEY `fk_turma_professor` (`id_professor`),
  KEY `fk_turma_sala` (`id_sala`),
  KEY `idx_turma_periodo_sala` (`semestre_letivo`,`dia_semana`,`id_sala`,`hora_inicio`,`hora_fim`),
  KEY `idx_turma_professor_oferta` (`semestre_letivo`,`id_professor`,`id_disciplina`),
  CONSTRAINT `fk_turma_disciplina` FOREIGN KEY (`id_disciplina`) REFERENCES `disciplina` (`id_disciplina`),
  CONSTRAINT `fk_turma_professor` FOREIGN KEY (`id_professor`) REFERENCES `professor` (`id_professor`),
  CONSTRAINT `fk_turma_sala` FOREIGN KEY (`id_sala`) REFERENCES `sala` (`id_sala`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `turma`
--

LOCK TABLES `turma` WRITE;
/*!40000 ALTER TABLE `turma` DISABLE KEYS */;
INSERT INTO `turma` VALUES (1,1,1,1,'2026.2','PROG1-A','SEG','08:00:00','10:00:00',40,'aberta');
/*!40000 ALTER TABLE `turma` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario`
--

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ativo','inativo','bloqueado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativo',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES (1,'admin@uneb.br','$argon2id$v=19$m=65536,t=3,p=4$eDzXNTU7IKB3XAJeUwE7qQ$S7wnmGOTTNedQb4kphU5bA9LkRqVrX5cA+VDQ3FKhFI','ativo','2026-11-17 03:02:39','2026-11-17 03:38:45'),(2,'secretaria@uneb.br','$argon2id$v=19$m=65536,t=3,p=4$SQz3mMhcm+aub853kUa1aA$FRwYZ3n6dkLLW1805nANmvdR3yukl5nJ/m2027zyArs','ativo','2026-11-17 03:02:42','2026-11-17 03:38:45'),(3,'coordenacao@uneb.br','$argon2id$v=19$m=65536,t=3,p=4$SQz3mMhcm+aub853kUa1aA$FRwYZ3n6dkLLW1805nANmvdR3yukl5nJ/m2027zyArs','ativo','2026-11-17 03:02:43','2026-11-17 03:38:45'),(4,'financeiro@uneb.br','$argon2id$v=19$m=65536,t=3,p=4$SQz3mMhcm+aub853kUa1aA$FRwYZ3n6dkLLW1805nANmvdR3yukl5nJ/m2027zyArs','ativo','2026-11-17 03:02:43','2026-11-17 03:38:45'),(5,'professor@uneb.br','$argon2id$v=19$m=65536,t=3,p=4$SQz3mMhcm+aub853kUa1aA$FRwYZ3n6dkLLW1805nANmvdR3yukl5nJ/m2027zyArs','ativo','2026-11-17 03:02:43','2026-11-17 03:38:45'),(6,'aluno@uneb.br','$argon2id$v=19$m=65536,t=3,p=4$SQz3mMhcm+aub853kUa1aA$FRwYZ3n6dkLLW1805nANmvdR3yukl5nJ/m2027zyArs','ativo','2026-11-17 03:02:43','2026-11-17 03:38:45');
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario_perfil`
--

DROP TABLE IF EXISTS `usuario_perfil`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario_perfil` (
  `id_usuario` int NOT NULL,
  `id_perfil` int NOT NULL,
  `atribuido_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`,`id_perfil`),
  KEY `fk_up_perfil` (`id_perfil`),
  CONSTRAINT `fk_up_perfil` FOREIGN KEY (`id_perfil`) REFERENCES `perfil` (`id_perfil`) ON DELETE CASCADE,
  CONSTRAINT `fk_up_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario_perfil`
--

LOCK TABLES `usuario_perfil` WRITE;
/*!40000 ALTER TABLE `usuario_perfil` DISABLE KEYS */;
INSERT INTO `usuario_perfil` VALUES (1,1,'2026-11-17 03:02:39'),(2,2,'2026-11-17 03:02:42'),(3,5,'2026-11-17 03:02:43'),(4,6,'2026-11-17 03:02:43'),(5,3,'2026-11-17 03:02:43'),(6,4,'2026-11-17 03:02:43');
/*!40000 ALTER TABLE `usuario_perfil` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'sga_edu'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-17 21:32:46
