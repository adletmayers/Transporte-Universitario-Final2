const express = require('express');
const router = express.Router();
const db = require('../config/database');

/*
========================================
CONSULTAR SALDO
========================================
*/
router.get('/saldo/:usuarioId', async (req, res) => {
    const client = await db.connect();
    try {
        const { usuarioId } = req.params;

        const resultado = await client.query(
            `
            SELECT saldo
            FROM carteiras
            WHERE usuario_id = $1
            `,
            [usuarioId]
        );

        if (resultado.rows.length === 0) {
            client.release();
            return res.json({
                saldo: 0
            });
        }

        client.release();
        res.json({
            saldo: resultado.rows[0].saldo
        });

    } catch (erro) {
        client.release();
        console.error(erro);
        res.status(500).json({
            erro: 'Erro interno do servidor'
        });
    }
});

/*
========================================
CONSULTAR MOVIMENTAÇÕES
========================================
*/
router.get('/movimentacoes/:usuarioId', async (req, res) => {
    const client = await db.connect();
    try {
        const { usuarioId } = req.params;

        const resultado = await client.query(
            `
            SELECT *
            FROM movimentacoes_carteira
            WHERE usuario_id = $1
            ORDER BY created_at DESC
            `,
            [usuarioId]
        );

        client.release();
        res.json(resultado.rows);

    } catch (erro) {
        client.release();
        console.error(erro);
        res.status(500).json({
            erro: 'Erro interno do servidor'
        });
    }
});

/*
========================================
CONSULTAR CARTEIRA COMPLETA
========================================
*/
router.get('/:usuarioId', async (req, res) => {
    const client = await db.connect();
    try {
        const { usuarioId } = req.params;

        const usuario = await client.query(
            `
            SELECT id
            FROM usuarios
            WHERE id = $1
            `,
            [usuarioId]
        );

        if (usuario.rows.length === 0) {
            client.release();
            return res.status(404).json({
                erro: 'Usuário não encontrado'
            });
        }

        const carteira = await client.query(
            `
            SELECT *
            FROM carteiras
            WHERE usuario_id = $1
            `,
            [usuarioId]
        );

        if (carteira.rows.length === 0) {
            client.release();
            return res.json({
                saldo: 0,
                movimentacoes: []
            });
        }

        client.release();
        res.json(carteira.rows);

    } catch (erro) {
        client.release();
        console.error(erro);
        res.status(500).json({
            erro: 'Erro interno do servidor'
        });
    }
});

/*
========================================
ADICIONAR SALDO (RECARGA) COM TRANSAÇÃO
========================================
*/
router.post('/recarga', async (req, res) => {
    const client = await db.connect();
    try {
        const {
            usuario_id,
            valor
        } = req.body;

        if (!usuario_id || !valor) {
            client.release();
            return res.status(400).json({
                erro: 'Informe usuário e valor'
            });
        }

        await client.query('BEGIN');

        await client.query(
            `
            UPDATE carteiras
            SET saldo = saldo + $1
            WHERE usuario_id = $2
            `,
            [valor, usuario_id]
        );

        // REGISTRA MOVIMENTAÇÃO
        await client.query(
            `
            INSERT INTO movimentacoes_carteira
            (
                usuario_id,
                tipo,
                valor
            )
            VALUES
            (
                $1,
                'RECARGA',
                $2
            )
            `,
            [usuario_id, valor]
        );

        await client.query('COMMIT');
        client.release();

        res.json({
            mensagem: 'Recarga realizada com sucesso'
        });

    } catch (erro) {
        await client.query('ROLLBACK');
        client.release();
        console.error(erro);
        res.status(500).json({
            erro: 'Erro interno do servidor'
        });
    }
});

/*
========================================
DEBITAR SALDO COM TRANSAÇÃO
========================================
*/
router.post('/debito', async (req, res) => {
    const client = await db.connect();
    try {
        const {
            usuario_id,
            valor
        } = req.body;

        if (!usuario_id || !valor) {
            client.release();
            return res.status(400).json({
                erro: 'Informe usuário e valor'
            });
        }

        await client.query('BEGIN');

        const carteira = await client.query(
            `
            SELECT saldo
            FROM carteiras
            WHERE usuario_id = $1
            FOR UPDATE
            `,
            [usuario_id]
        );

        if (carteira.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({
                erro: 'Carteira não encontrada'
            });
        }

        const saldoAtual = Number(carteira.rows[0].saldo);

        if (saldoAtual < Number(valor)) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(400).json({
                erro: 'Saldo insuficiente'
            });
        }

        await client.query(
            `
            UPDATE carteiras
            SET saldo = saldo - $1
            WHERE usuario_id = $2
            `,
            [valor, usuario_id]
        );

        // REGISTRA MOVIMENTAÇÃO
        await client.query(
            `
            INSERT INTO movimentacoes_carteira
            (
                usuario_id,
                tipo,
                valor
            )
            VALUES
            (
                $1,
                'DEBITO',
                $2
            )
            `,
            [usuario_id, valor]
        );

        await client.query('COMMIT');
        client.release();

        res.json({
            mensagem: 'Débito realizado com sucesso'
        });

    } catch (erro) {
        await client.query('ROLLBACK');
        client.release();
        console.error(erro);
        res.status(500).json({
            erro: 'Erro interno do servidor'
        });
    }
});

module.exports = router;