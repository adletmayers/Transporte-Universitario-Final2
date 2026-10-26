const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router(); // <--- Essencial para o Express reconhecer o roteador
const db = require('../config/database');

/*
========================================
CADASTRO (Inscrição)
========================================
*/
router.post('/', async (req, res) => {
    const client = await db.connect();

    try {
        const {
            nome,
            email,
            senha,
            matricula,
            universidade,
            curso,
            turno,
            tipo // <--- 1. Capturando o tipo enviado pelo front-end
        } = req.body;

        if (!nome || !email || !senha) {
            client.release();
            return res.status(400).json({
                erro: 'Preencha os campos obrigatórios: nome, email e senha'
            });
        }

        if (senha.length < 6) {
            client.release();
            return res.status(400).json({
                erro: 'A senha deve possuir pelo menos 6 caracteres'
            });
        }

        const existe = await client.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );

        if (existe.rows.length > 0) {
            client.release();
            return res.status(400).json({
                erro: 'Email já cadastrado'
            });
        }

        const hash = await bcrypt.hash(senha, 10);

        await client.query('BEGIN');

        // 2. Incluindo a coluna 'tipo' no INSERT e $8 no array de valores
        const novoUsuario = await client.query(
            `
            INSERT INTO usuarios
            (nome, email, senha, matricula, universidade, curso, turno, tipo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
            `,
            [
                nome,
                email,
                hash,
                matricula || null,
                universidade || null,
                curso || null,
                turno || null,
                tipo || 'ALUNO' // Define 'ALUNO' como padrão se vier vazio
            ]
        );

        const usuarioId = novoUsuario.rows[0].id;

        await client.query(
            `
            INSERT INTO carteiras (usuario_id, saldo)
            VALUES ($1, 0)
            `,
            [usuarioId]
        );

        await client.query('COMMIT');
        client.release();

        return res.status(201).json({
            mensagem: 'Cadastro realizado com sucesso'
        });

    } catch (err) {
        await client.query('ROLLBACK');
        client.release();
        console.error('Erro no cadastro:', err);
        return res.status(500).json({
            erro: 'Erro interno do servidor ao realizar cadastro'
        });
    }
});

/*
========================================
LOGIN
========================================
*/
router.post('/login', async (req, res) => {
    const client = await db.connect();
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            client.release();
            return res.status(400).json({
                erro: 'Informe email e senha'
            });
        }

        const resultado = await client.query(
            `
            SELECT u.*, COALESCE(c.saldo, 0) AS saldo
            FROM usuarios u
            LEFT JOIN carteiras c ON c.usuario_id = u.id
            WHERE u.email = $1
            `,
            [email]
        );

        if (resultado.rows.length === 0) {
            client.release();
            return res.status(401).json({
                erro: 'Email ou senha inválidos'
            });
        }

        const usuario = resultado.rows[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            client.release();
            return res.status(401).json({
                erro: 'Email ou senha inválidos'
            });
        }

        client.release();

        return res.json({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            cpf: usuario.cpf,
            data_nascimento: usuario.data_nascimento,
            matricula: usuario.matricula,
            universidade: usuario.universidade,
            curso: usuario.curso,
            turno: usuario.turno,
            validade_carteirinha: usuario.validade_carteirinha,
            tipo: usuario.tipo || 'ALUNO',
            tema: usuario.tema || 'dark',
            saldo: parseFloat(usuario.saldo) || 0,
            foto_perfil: usuario.foto_perfil
        });

    } catch (err) {
        client.release();
        console.error('Erro no login:', err);
        return res.status(500).json({
            erro: 'Erro interno do servidor ao realizar login'
        });
    }
});

/*
========================================
ALTERAR SENHA
========================================
*/
router.put('/alterar-senha', async (req, res) => {
    const client = await db.connect();
    try {
        const { id, senhaAtual, novaSenha } = req.body;

        if (!id || !senhaAtual || !novaSenha) {
            client.release();
            return res.status(400).json({
                erro: 'Preencha todos os campos obrigatórios'
            });
        }

        if (novaSenha.length < 6) {
            client.release();
            return res.status(400).json({
                erro: 'A nova senha deve possuir pelo menos 6 caracteres'
            });
        }

        const resultado = await client.query(
            'SELECT senha FROM usuarios WHERE id = $1',
            [id]
        );

        if (resultado.rows.length === 0) {
            client.release();
            return res.status(404).json({
                erro: 'Usuário não encontrado'
            });
        }

        const senhaValida = await bcrypt.compare(senhaAtual, resultado.rows[0].senha);

        if (!senhaValida) {
            client.release();
            return res.status(400).json({
                erro: 'Senha atual incorreta'
            });
        }

        const hash = await bcrypt.hash(novaSenha, 10);

        await client.query(
            'UPDATE usuarios SET senha = $1 WHERE id = $2',
            [hash, id]
        );

        client.release();
        return res.json({
            mensagem: 'Senha alterada com sucesso'
        });

    } catch (err) {
        client.release();
        console.error('Erro ao alterar senha:', err);
        return res.status(500).json({
            erro: 'Erro interno do servidor ao alterar senha'
        });
    }
});

/*
========================================
ATUALIZAR PERFIL
========================================
*/
router.put('/:id', async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const {
            nome,
            email,
            cpf,
            data_nascimento,
            tema,
            matricula,
            universidade,
            curso,
            turno,
            validade_carteirinha,
            tipo // <--- Adicionado para permitir atualizar o tipo de usuário no perfil também
        } = req.body;

        if (!nome || !email) {
            client.release();
            return res.status(400).json({
                erro: 'Nome e email são obrigatórios'
            });
        }

        const verificaEmail = await client.query(
            'SELECT id FROM usuarios WHERE email = $1 AND id <> $2',
            [email, id]
        );

        if (verificaEmail.rows.length > 0) {
            client.release();
            return res.status(400).json({
                erro: 'Este email já está sendo utilizado por outro usuário'
            });
        }

        await client.query(
            `
            UPDATE usuarios
            SET
                nome = $1,
                email = $2,
                cpf = $3,
                data_nascimento = $4,
                tema = $5,
                matricula = $6,
                universidade = $7,
                curso = $8,
                turno = $9,
                validade_carteirinha = $10,
                tipo = $11
            WHERE id = $12
            `,
            [
                nome,
                email,
                cpf || null,
                data_nascimento || null,
                tema || 'dark',
                matricula || null,
                universidade || null,
                curso || null,
                turno || null,
                validade_carteirinha || null,
                tipo || 'ALUNO',
                id
            ]
        );

        client.release();
        return res.json({
            mensagem: 'Perfil atualizado com sucesso'
        });

    } catch (err) {
        client.release();
        console.error('Erro ao atualizar perfil:', err);
        return res.status(500).json({
            erro: 'Erro interno do servidor ao atualizar perfil'
        });
    }
});

/*
========================================
BUSCAR USUÁRIO POR ID
========================================
*/
router.get('/:id', async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;

        const resultado = await client.query(
            `
            SELECT
                u.id,
                u.nome,
                u.email,
                u.cpf,
                u.data_nascimento,
                u.matricula,
                u.universidade,
                u.curso,
                u.turno,
                u.validade_carteirinha,
                u.tipo,
                u.tema,
                u.foto_perfil,
                COALESCE(c.saldo, 0) AS saldo
            FROM usuarios u
            LEFT JOIN carteiras c ON c.usuario_id = u.id
            WHERE u.id = $1
            `,
            [id]
        );

        if (resultado.rows.length === 0) {
            client.release();
            return res.status(404).json({
                erro: 'Usuário não encontrado'
            });
        }

        const usuario = resultado.rows[0];
        usuario.saldo = parseFloat(usuario.saldo) || 0;

        client.release();
        return res.json(usuario);

    } catch (err) {
        client.release();
        console.error('Erro ao buscar usuário:', err);
        return res.status(500).json({
            erro: 'Erro interno do servidor ao buscar usuário'
        });
    }
});
/*
========================================
ATUALIZAR FOTO DE PERFIL
========================================
*/
router.patch('/:id/foto', async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const { foto_perfil } = req.body;

        if (!foto_perfil) {
            client.release();
            return res.status(400).json({ erro: 'Nenhuma imagem foi enviada' });
        }

        await client.query(
            'UPDATE usuarios SET foto_perfil = $1 WHERE id = $2',
            [foto_perfil, id]
        );

        client.release();
        return res.json({ mensagem: 'Foto de perfil atualizada com sucesso' });

    } catch (err) {
        client.release();
        console.error('Erro ao salvar foto de perfil:', err);
        return res.status(500).json({ erro: 'Erro interno ao salvar foto' });
    }
});
module.exports = router;