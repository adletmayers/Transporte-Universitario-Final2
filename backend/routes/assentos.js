const express = require('express');
const router = express.Router();

const db = require('../config/database');

/*
========================================
LISTAR ASSENTOS DA VIAGEM
========================================
*/

router.get('/viagem/:viagemId', async (req, res) => {

    try {

        const { viagemId } = req.params;

        const viagem = await db.query(
            `
            SELECT id
            FROM viagens
            WHERE id = $1
            `,
            [viagemId]
        );

        if (viagem.rows.length === 0) {

            return res.status(404).json({
                erro: 'Viagem não encontrada'
            });

        }

        const resultado = await db.query(
            `
            SELECT *
            FROM assentos
            WHERE viagem_id = $1
            ORDER BY numero
            `,
            [viagemId]
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
DETALHES DE UM ASSENTO
========================================
*/

router.get('/detalhe/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const resultado = await db.query(
            `
            SELECT *
            FROM assentos
            WHERE id = $1
            `,
            [id]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                erro: 'Assento não encontrado'
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
OCUPAR ASSENTO
========================================
*/

router.put('/ocupar', async (req, res) => {

    try {

        const {
            viagem_id,
            numero
        } = req.body;

        const assento = await db.query(
            `
            SELECT *
            FROM assentos
            WHERE viagem_id = $1
            AND numero = $2
            `,
            [
                viagem_id,
                numero
            ]
        );

        if (assento.rows.length === 0) {

            return res.status(404).json({
                erro: 'Assento não encontrado'
            });

        }

        if (assento.rows[0].ocupado) {

            return res.status(400).json({
                erro: 'Assento já está ocupado'
            });

        }

        await db.query(
            `
            UPDATE assentos
            SET ocupado = TRUE
            WHERE viagem_id = $1
            AND numero = $2
            `,
            [
                viagem_id,
                numero
            ]
        );

        await db.query(
            `
            UPDATE viagens
            SET vagas_disponiveis = GREATEST(
                vagas_disponiveis - 1,
                0
            )
            WHERE id = $1
            `,
            [viagem_id]
        );

        res.json({
            mensagem: 'Assento reservado com sucesso'
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
LIBERAR ASSENTO
========================================
*/

router.put('/liberar', async (req, res) => {

    try {

        const {
            viagem_id,
            numero
        } = req.body;

        const assento = await db.query(
            `
            SELECT *
            FROM assentos
            WHERE viagem_id = $1
            AND numero = $2
            `,
            [
                viagem_id,
                numero
            ]
        );

        if (assento.rows.length === 0) {

            return res.status(404).json({
                erro: 'Assento não encontrado'
            });

        }

        if (!assento.rows[0].ocupado) {

            return res.status(400).json({
                erro: 'Assento já está livre'
            });

        }

        await db.query(
            `
            UPDATE assentos
            SET ocupado = FALSE
            WHERE viagem_id = $1
            AND numero = $2
            `,
            [
                viagem_id,
                numero
            ]
        );

        await db.query(
            `
            UPDATE viagens
            SET vagas_disponiveis = LEAST(
                vagas_disponiveis + 1,
                vagas_totais
            )
            WHERE id = $1
            `,
            [viagem_id]
        );

        res.json({
            mensagem: 'Assento liberado com sucesso'
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
CRIAR ASSENTOS DA VIAGEM
========================================
*/

router.post('/gerar', async (req, res) => {

    try {

        const {
            viagem_id,
            quantidade
        } = req.body;

        if (!viagem_id || !quantidade) {

            return res.status(400).json({
                erro: 'Informe viagem e quantidade'
            });

        }

        const viagem = await db.query(
            `
            SELECT id
            FROM viagens
            WHERE id = $1
            `,
            [viagem_id]
        );

        if (viagem.rows.length === 0) {

            return res.status(404).json({
                erro: 'Viagem não encontrada'
            });

        }

        const existe = await db.query(
            `
            SELECT id
            FROM assentos
            WHERE viagem_id = $1
            LIMIT 1
            `,
            [viagem_id]
        );

        if (existe.rows.length > 0) {

            return res.status(400).json({
                erro: 'Esta viagem já possui assentos cadastrados'
            });

        }

        for (let i = 1; i <= Number(quantidade); i++) {

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
                    viagem_id,
                    i
                ]
            );

        }

        res.status(201).json({
            mensagem: `${quantidade} assentos criados com sucesso`
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

module.exports = router;