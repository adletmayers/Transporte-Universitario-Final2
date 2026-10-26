const express = require('express');
const router = express.Router();

const db = require('../config/database');

/*
========================================
LISTAR VIAGENS ATIVAS
========================================
*/

router.get('/', async (req, res) => {

    try {

        const resultado = await db.query(
            `
            SELECT *
            FROM viagens
            WHERE status = 'ATIVA'
            ORDER BY data_ida
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
BUSCAR PASSAGENS
========================================
*/

router.get('/buscar/filtro', async (req, res) => {

    try {

        const {
            origem = '',
            destino = '',
            data
        } = req.query;

        let query = `
            SELECT *
            FROM viagens
            WHERE status = 'ATIVA'
            AND origem ILIKE $1
            AND destino ILIKE $2
        `;

        const params = [
            `%${origem}%`,
            `%${destino}%`
        ];

        if (data) {

            query += `
                AND data_ida = $3
            `;

            params.push(data);

        }

        query += `
            ORDER BY data_ida
        `;

        const resultado =
        await db.query(
            query,
            params
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
LISTAR ORIGENS
========================================
*/

router.get('/origens/lista', async (req, res) => {

    try {

        const resultado = await db.query(
            `
            SELECT DISTINCT origem
            FROM viagens
            WHERE status = 'ATIVA'
            ORDER BY origem
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
LISTAR DESTINOS
========================================
*/

router.get('/destinos/lista', async (req, res) => {

    try {

        const resultado = await db.query(
            `
            SELECT DISTINCT destino
            FROM viagens
            WHERE status = 'ATIVA'
            ORDER BY destino
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
BUSCAR VIAGEM POR ID
========================================
*/

router.get('/:id', async (req, res) => {

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
CRIAR VIAGEM
========================================
*/

router.post('/', async (req, res) => {

    try {

        const {
            origem,
            destino,
            data_ida,
            valor,
            vagas
        } = req.body;

        if (
            !origem ||
            !destino ||
            !data_ida
        ) {

            return res.status(400).json({
                erro: 'Preencha os campos obrigatórios'
            });

        }

        const dataViagem =
        new Date(data_ida);

        const hoje =
        new Date();

        hoje.setHours(
            0,0,0,0
        );

        if(dataViagem < hoje){

            return res.status(400).json({
                erro:'A data da viagem não pode ser no passado'
            });

        }

        if(Number(vagas) <= 0){

            return res.status(400).json({
                erro:'Informe uma quantidade válida de vagas'
            });

        }

        const viagem = await db.query(
            `
            INSERT INTO viagens
            (
                origem,
                destino,
                data_ida,
                valor,
                vagas,
                vagas_disponiveis,
                status
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                'ATIVA'
            )
            RETURNING *
            `,
            [
                origem,
                destino,
                data_ida,
                valor || 0,
                vagas,
                vagas
            ]
        );

        res.status(201).json({

            mensagem:
            'Viagem criada com sucesso',

            viagem:
            viagem.rows[0]

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
CANCELAR VIAGEM
========================================
*/

router.put('/cancelar/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const viagem = await db.query(
            `
            SELECT *
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

        const compras = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM compras
            WHERE viagem_id = $1
            `,
            [id]
        );

        if(
            Number(
                compras.rows[0].total
            ) > 0
        ){

            return res.status(400).json({
                erro:'Existem passageiros cadastrados nesta viagem'
            });

        }

        await db.query(
            `
            UPDATE viagens
            SET status = 'CANCELADA'
            WHERE id = $1
            `,
            [id]
        );

        res.json({
            mensagem:
            'Viagem cancelada com sucesso'
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro interno do servidor'
        });

    }

});

module.exports = router;