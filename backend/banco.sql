CREATE DATABASE transporte_universitario;

USE transporte_universitario;

CREATE TABLE usuarios(
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    senha VARCHAR(255),
    tipo ENUM('aluno','admin')
);

CREATE TABLE rotas(
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    horario TIME,
    capacidade INT,
    lotacao INT DEFAULT 0
);

CREATE TABLE reservas(
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    rota_id INT,
    data_reserva DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(usuario_id)
    REFERENCES usuarios(id),

    FOREIGN KEY(rota_id)
    REFERENCES rotas(id)
);

CREATE TABLE avisos(
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100),
    mensagem TEXT,
    data_envio DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE carteiras(

    id SERIAL PRIMARY KEY,

    usuario_id INTEGER UNIQUE,

    saldo NUMERIC(10,2)
    DEFAULT 0

);
ALTER TABLE compras
ADD COLUMN data_compra TIMESTAMP DEFAULT NOW();