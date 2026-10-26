const express = require('express');
const router = express.Router();
const db = require('../config/database');

/*
========================================
1. ATUALIZAR / INSERIR LOCALIZAÇÃO
========================================
*/
router.post('/', async (req, res) => {
    try {
        const viagem_id = req.body.viagem_id || req.body.viagemId;
        const latitude = parseFloat(req.body.latitude);
        const longitude = parseFloat(req.body.longitude);

        if (!viagem_id || isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                erro: 'Informe a viagem e coordenadas válidas (latitude e longitude).'
            });
        }

        const resultado = await db.query(
            `
            INSERT INTO localizacoes (viagem_id, latitude, longitude)
            VALUES ($1, $2, $3)
            RETURNING id, viagem_id, latitude, longitude, created_at
            `,
            [viagem_id, latitude, longitude]
        );

        res.status(201).json({
            mensagem: 'Localização atualizada com sucesso',
            dados: resultado.rows[0]
        });

    } catch (err) {
        console.error('Erro ao atualizar localização:', err);
        res.status(500).json({
            erro: 'Erro interno ao salvar localização'
        });
    }
});

/*
========================================
2. OBTER ÚLTIMA LOCALIZAÇÃO DA VIAGEM
========================================
*/
router.get('/:viagemId', async (req, res) => {
    try {
        const { viagemId } = req.params;

        if (isNaN(viagemId)) {
            return res.status(400).json({ erro: 'ID de viagem inválido' });
        }

        const resultado = await db.query(
            `
            SELECT id, viagem_id, latitude, longitude, created_at
            FROM localizacoes
            WHERE viagem_id = $1
            ORDER BY id DESC
            LIMIT 1
            `,
            [viagemId]
        );

        if (resultado.rows.length === 0) {
            return res.json({});
        }

        res.json(resultado.rows[0]);

    } catch (err) {
        console.error('Erro ao buscar localização:', err);
        res.status(500).json({
            erro: 'Erro interno ao consultar localização'
        });
    }
});

module.exports = router;