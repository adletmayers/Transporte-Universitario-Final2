const express = require('express');
const router = express.Router();

const db = require('../config/database');

/*
========================================
CRIAR VIAGEM
========================================
*/

router.post('/viagens', async (req, res) => {

    try {

        const {
            origem,
            destino,
            data_ida,
            horario_saida,
            horario_chegada,
            valor,
            vagas,
            vagas_totais
        } = req.body;

        console.log('BODY:', req.body);

        // aceita tanto vagas quanto vagas_totais
        const quantidadeVagas = Number(
            vagas ?? vagas_totais
        );

        console.log('VAGAS:', vagas);
        console.log('VAGAS_TOTAIS:', vagas_totais);
        console.log('QUANTIDADE:', quantidadeVagas);

        if (
            !origem ||
            !destino ||
            !data_ida ||
            !horario_saida ||
            !horario_chegada
        ) {

            return res.status(400).json({
                erro: 'Preencha todos os campos obrigatórios'
            });

        }

        if (
            isNaN(quantidadeVagas) ||
            quantidadeVagas <= 0
        ) {

            return res.status(400).json({
                erro: 'Quantidade de vagas inválida',
                recebido: req.body
            });

        }

        const resultado = await db.query(
            `
            INSERT INTO viagens
            (
                origem,
                destino,
                data_ida,
                horario_saida,
                horario_chegada,
                valor,
                vagas_totais,
                vagas_disponiveis,
                status
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$7,'ATIVA'
            )
            RETURNING *
            `,
            [
                origem,
                destino,
                data_ida,
                horario_saida,
                horario_chegada,
                valor || 0,
                quantidadeVagas
            ]
        );

        const novaViagem = resultado.rows[0];

        // gera os assentos automaticamente
        for (let i = 1; i <= quantidadeVagas; i++) {

            await db.query(
                `
                INSERT INTO assentos
                (
                    viagem_id,
                    numero,
                    ocupado
                )
                VALUES
                (
                    $1,
                    $2,
                    FALSE
                )
                `,
                [
                    novaViagem.id,
                    i
                ]
            );

        }

        res.status(201).json({
            mensagem: 'Viagem criada com sucesso',
            viagem: novaViagem
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: err.message
        });

    }

});
/*
========================================
BUSCAR VIAGEM
========================================
*/
router.get('/viagens', async (req, res) => {

    try {

        const resultado = await db.query(`
            SELECT *
            FROM viagens
            ORDER BY data_ida
        `);

        res.json(resultado.rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});
router.get('/viagens/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const resultado = await db.query(
            `
            SELECT *
            FROM viagens
            WHERE id = $1
            `,
            [id]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                erro: 'Viagem não encontrada'
            });

        }

        res.json(resultado.rows[0]);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

/*
========================================
ATUALIZAR VIAGEM
========================================
*/

router.put('/viagens/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const viagem = await db.query(
            `
            SELECT id
            FROM viagens
            WHERE id = $1
            `,
            [id]
        );

        if (viagem.rows.length === 0) {

            return res.status(404).json({
                erro: 'Viagem não encontrada'
            });

        }

        const {
            origem,
            destino,
            data_ida,
            horario_saida,
            horario_chegada,
            valor,
            vagas_totais
        } = req.body;

        await db.query(
            `
            UPDATE viagens
            SET
                origem = $1,
                destino = $2,
                data_ida = $3,
                horario_saida = $4,
                horario_chegada = $5,
                valor = $6,
                vagas_totais = $7
            WHERE id = $8
            `,
            [
                origem,
                destino,
                data_ida,
                horario_saida,
                horario_chegada,
                valor,
                vagas_totais,
                id
            ]
        );

        res.json({
            mensagem: 'Viagem atualizada com sucesso'
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

/*
========================================
EXCLUIR VIAGEM
========================================
*/

router.delete('/viagens/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const viagem = await db.query(
            `
            SELECT id
            FROM viagens
            WHERE id = $1
            `,
            [id]
        );

        if (viagem.rows.length === 0) {

            return res.status(404).json({
                erro: 'Viagem não encontrada'
            });

        }

        await db.query(
            'DELETE FROM assentos WHERE viagem_id = $1',
            [id]
        );

        await db.query(
            'DELETE FROM compras WHERE viagem_id = $1',
            [id]
        );

        await db.query(
            'DELETE FROM passagens WHERE viagem_id = $1',
            [id]
        );

        await db.query(
            'DELETE FROM viagens WHERE id = $1',
            [id]
        );

        res.json({
            mensagem: 'Viagem removida com sucesso'
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: err.message
        });

    }

});
/*
========================================
LISTAR USUÁRIOS
========================================
*/

router.get('/usuarios', async (req, res) => {

    try {

        const resultado = await db.query(
            `
            SELECT
                id,
                nome,
                email,
                tipo
            FROM usuarios
            ORDER BY id
            `
        );

        res.json(resultado.rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

/*
========================================
PROMOVER ADMIN
========================================
*/

router.put('/usuarios/:id/admin', async (req, res) => {

    try {

        const { id } = req.params;

        const usuario = await db.query(
            `
            SELECT id
            FROM usuarios
            WHERE id = $1
            `,
            [id]
        );

        if (usuario.rows.length === 0) {

            return res.status(404).json({
                erro: 'Usuário não encontrado'
            });

        }

        await db.query(
            `
            UPDATE usuarios
            SET tipo = 'ADMIN'
            WHERE id = $1
            `,
            [id]
        );

        res.json({
            mensagem: 'Usuário promovido para administrador'
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

/*
========================================
EXCLUIR USUÁRIO
========================================
*/

router.delete('/usuarios/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const usuario = await db.query(
            `
            SELECT id
            FROM usuarios
            WHERE id = $1
            `,
            [id]
        );

        if (usuario.rows.length === 0) {

            return res.status(404).json({
                erro: 'Usuário não encontrado'
            });

        }

        await db.query(
            `
            DELETE FROM usuarios
            WHERE id = $1
            `,
            [id]
        );

        res.json({
            mensagem: 'Usuário removido com sucesso'
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

/*
========================================
DASHBOARD ADMIN
========================================
*/

router.get('/relatorios', async (req, res) => {

    try {

        const usuarios = await db.query(
            'SELECT COUNT(*) FROM usuarios'
        );

        const viagens = await db.query(
            'SELECT COUNT(*) FROM viagens'
        );

        const compras = await db.query(
            'SELECT COUNT(*) FROM compras'
        );

        const faturamento = await db.query(
            `
            SELECT
                COALESCE(SUM(valor),0) AS total
            FROM compras
            `
        );

        res.json({
            usuarios: Number(usuarios.rows[0].count),
            viagens: Number(viagens.rows[0].count),
            compras: Number(compras.rows[0].count),
            faturamento: Number(faturamento.rows[0].total)
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

module.exports = router;