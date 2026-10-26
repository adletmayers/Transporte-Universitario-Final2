const express = require('express');
const router = express.Router();

const db = require('../config/database');

/*
========================================
BUSCAR CARTEIRINHA
========================================
*/

router.get('/:usuarioId', async (req, res) => {

    try {

        const { usuarioId } = req.params;

        const resultado = await db.query(
            `
            SELECT
                nome,
                matricula,
                universidade,
                curso,
                turno,
                validade_carteirinha,
                foto_perfil
            FROM usuarios
            WHERE id = $1
            `,
            [usuarioId]
        );

        if(resultado.rows.length === 0){

            return res.status(404).json({
                erro:'Usuário não encontrado'
            });

        }

        res.json(resultado.rows[0]);

    } catch(err){

        console.error(err);

        res.status(500).json({
            erro:'Erro interno'
        });

    }

});
/*
========================================
CRIAR / ATUALIZAR
========================================
*/

/*router.post('/', async (req, res) => {

    try {

        const {
            usuario_id,
            matricula,
            curso,
            instituicao,
            validade
        } = req.body;

        await db.query(
            `
            INSERT INTO carteirinhas
            (
                usuario_id,
                matricula,
                curso,
                instituicao,
                validade
            )
            VALUES
            (
                $1,$2,$3,$4,$5
            )

            ON CONFLICT(usuario_id)

            DO UPDATE SET

            matricula = EXCLUDED.matricula,
            curso = EXCLUDED.curso,
            instituicao = EXCLUDED.instituicao,
            validade = EXCLUDED.validade
            `,
            [
                usuario_id,
                matricula,
                curso,
                instituicao,
                validade
            ]
        );

        res.json({
            mensagem:'Carteirinha salva'
        });

    } catch(err){

        console.error(err);

        res.status(500).json({
            erro:'Erro interno'
        });

    }

});
*/
module.exports = router;
