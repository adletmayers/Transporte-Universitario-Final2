const express = require('express');
const router = express.Router();

const db = require('../config/database');

/*
========================================
LISTAR TODAS AS ROTAS
========================================
*/

router.get('/', async (req, res) => {

    try {

        const resultado = await db.query(
            `
            SELECT *
            FROM rotas
            ORDER BY id
            `
        );

        res.json(resultado.rows);

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

/*
========================================
BUSCAR ROTA POR ID
========================================
*/

router.get('/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const resultado = await db.query(
            `
            SELECT *
            FROM rotas
            WHERE id = $1
            `,
            [id]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                erro: 'Rota não encontrada'
            });

        }

        res.json(resultado.rows[0]);

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

/*
========================================
CADASTRAR NOVA ROTA
========================================
*/

router.post('/', async (req, res) => {

    try {

        const {
            origem,
            destino,
            horario,
            vagas
        } = req.body;

        if (
            !origem ||
            !destino ||
            !horario
        ) {

            return res.status(400).json({
                erro: 'Preencha todos os campos obrigatórios'
            });

        }

        const novaRota = await db.query(
            `
            INSERT INTO rotas
            (
                origem,
                destino,
                horario,
                vagas
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4
            )
            RETURNING *
            `,
            [
                origem,
                destino,
                horario,
                vagas || 0
            ]
        );

        res.status(201).json({
            mensagem: 'Rota cadastrada com sucesso',
            rota: novaRota.rows[0]
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

/*
========================================
ATUALIZAR ROTA
========================================
*/

router.put('/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const {
            origem,
            destino,
            horario,
            vagas
        } = req.body;

        const rota = await db.query(
            `
            SELECT id
            FROM rotas
            WHERE id = $1
            `,
            [id]
        );

        if (rota.rows.length === 0) {

            return res.status(404).json({
                erro: 'Rota não encontrada'
            });

        }

        await db.query(
            `
            UPDATE rotas
            SET
                origem = $1,
                destino = $2,
                horario = $3,
                vagas = $4
            WHERE id = $5
            `,
            [
                origem,
                destino,
                horario,
                vagas,
                id
            ]
        );

        res.json({
            mensagem: 'Rota atualizada com sucesso'
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

/*
========================================
EXCLUIR ROTA
========================================
*/

router.delete('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Apaga registros vinculados primeiro (ex: carteiras)
        await client.query('DELETE FROM carteiras WHERE usuario_id = $1', [id]);

        // Se houver outras tabelas vinculadas, apague-as aqui também:
        // await client.query('DELETE FROM passagens WHERE usuario_id = $1', [id]);

        // 2. Apaga o usuário principal
        const resultado = await client.query('DELETE FROM usuarios WHERE id = $1', [id]);

        if (resultado.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        await client.query('COMMIT');
        res.json({ mensagem: 'Usuário e dados vinculados excluídos com sucesso!' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao excluir usuário:', err);

        // Erro 23503 do Postgres: Violação de Chave Estrangeira
        if (err.code === '23503') {
            return res.status(400).json({
                erro: 'Não é possível excluir este usuário pois ele possui históricos vinculados no sistema.'
            });
        }

        res.status(500).json({ erro: 'Erro interno do servidor ao excluir usuário' });
    } finally {
        client.release();
    }
});

/*
========================================
FILTRAR POR ORIGEM E DESTINO
========================================
*/

router.get('/buscar/filtro', async (req, res) => {

    try {

        const {
            origem,
            destino
        } = req.query;

        const resultado = await db.query(
            `
            SELECT *
            FROM rotas
            WHERE origem ILIKE $1
            AND destino ILIKE $2
            ORDER BY horario
            `,
            [
                `%${origem || ''}%`,
                `%${destino || ''}%`
            ]
        );

        res.json(resultado.rows);

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

module.exports = router;