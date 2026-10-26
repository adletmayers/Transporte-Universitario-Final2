const express = require('express');
const router = express.Router();
// Certifique-se de que o caminho para importar o seu arquivo de conexão/pool do banco está correto (ex: '../db' ou similar)
const db = require('../config/database'); 

/*
========================================
1. REALIZAR COMPRA (Refatorado com Transação Segura)
========================================
*/
router.post('/', async (req, res) => {
    const client = await db.connect(); // Pega uma conexão exclusiva do pool

    try {
        const {
            usuario_id,
            viagem_id,
            assento_numero,
            valor,
            forma_pagamento
        } = req.body;

        if (!usuario_id || !viagem_id || !assento_numero || !valor || !forma_pagamento) {
            client.release();
            return res.status(400).json({ erro: 'Preencha todos os campos' });
        }

        // Inicia a transação isolada
        await client.query('BEGIN');

        // Verifica se o assento existe e bloqueia a linha para evitar concorrência (FOR UPDATE)
        const assento = await client.query(
            `
            SELECT *
            FROM assentos
            WHERE viagem_id = $1
            AND numero = $2
            FOR UPDATE
            `,
            [viagem_id, assento_numero]
        );

        if (assento.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ erro: 'Assento não encontrado' });
        }

        if (assento.rows[0].ocupado) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(400).json({ erro: 'Assento já ocupado' });
        }

        // Verifica compra duplicada
        const compraExistente = await client.query(
            `
            SELECT id
            FROM compras
            WHERE usuario_id = $1
            AND viagem_id = $2
            `,
            [usuario_id, viagem_id]
        );

        if (compraExistente.rows.length > 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(400).json({ erro: 'Você já possui passagem para esta viagem' });
        }

        // PAGAMENTO COM CARTEIRA
        if (forma_pagamento === 'CARTEIRA') {
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
                return res.status(404).json({ erro: 'Carteira não encontrada' });
            }

            const saldoAtual = Number(carteira.rows[0].saldo);

            if (saldoAtual < Number(valor)) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json({ erro: 'Saldo insuficiente' });
            }

            // Debita saldo
            await client.query(
                `
                UPDATE carteiras
                SET saldo = saldo - $1
                WHERE usuario_id = $2
                `,
                [valor, usuario_id]
            );

            // Registra movimentação
            await client.query(
                `
                INSERT INTO movimentacoes_carteira
                (
                    usuario_id,
                    tipo,
                    valor
                )
                VALUES
                ($1, 'DEBITO', $2)
                `,
                [usuario_id, valor]
            );
        }

        // Salva compra
        const compra = await client.query(
            `
            INSERT INTO compras
            (
                usuario_id,
                viagem_id,
                assento_numero,
                valor,
                forma_pagamento
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [usuario_id, viagem_id, assento_numero, valor, forma_pagamento]
        );

        // Ocupa assento
        await client.query(
            `
            UPDATE assentos
            SET ocupado = TRUE
            WHERE viagem_id = $1
            AND numero = $2
            `,
            [viagem_id, assento_numero]
        );

        // Atualiza vagas
        await client.query(
            `
            UPDATE viagens
            SET vagas_disponiveis = GREATEST(vagas_disponiveis - 1, 0)
            WHERE id = $1
            `,
            [viagem_id]
        );

        // Confirma todas as alterações com sucesso
        await client.query('COMMIT');
        client.release();

        return res.status(201).json({
            mensagem: 'Compra realizada com sucesso',
            compra: compra.rows[0]
        });

    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('Erro no rollback:', rollbackErr);
        }
        client.release();

        console.error(err);
        return res.status(500).json({
            erro: 'Erro interno do servidor'
        });
    }
});

/*
========================================
2. BUSCAR HISTÓRICO DE COMPRAS DO USUÁRIO
========================================
*/
router.get('/:usuarioId', async (req, res) => {
    try {
        const { usuarioId } = req.params;

        const query = `
            SELECT c.*, v.origem, v.destino, v.data_ida, v.horario_saida, v.horario_chegada
            FROM compras c
            JOIN viagens v ON c.viagem_id = v.id
            WHERE c.usuario_id = $1
            ORDER BY c.id DESC
        `;

        const resultado = await db.query(query, [usuarioId]);
        return res.json(resultado.rows);

    } catch (err) {
        console.error('Erro ao buscar histórico:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor ao carregar histórico' });
    }
});

/*
========================================
3. CANCELAR COMPRA (DELETAR PASSAGEM)
========================================
*/
router.delete('/:id', async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Busca a compra para saber qual assento e viagem liberar
        const compraRes = await client.query('SELECT * FROM compras WHERE id = $1', [id]);
        if (compraRes.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ erro: 'Compra não encontrada' });
        }

        const compra = compraRes.rows[0];

        // Libera o assento
        await client.query(
            'UPDATE assentos SET ocupado = FALSE WHERE viagem_id = $1 AND numero = $2',
            [compra.viagem_id, compra.assento_numero]
        );

        // Incrementa de volta a vaga disponível na viagem
        await client.query(
            'UPDATE viagens SET vagas_disponiveis = vagas_disponiveis + 1 WHERE id = $1',
            [compra.viagem_id]
        );

        // Deleta a compra
        await client.query('DELETE FROM compras WHERE id = $1', [id]);

        await client.query('COMMIT');
        client.release();

        return res.json({ mensagem: 'Passagem cancelada com sucesso!' });

    } catch (err) {
        await client.query('ROLLBACK');
        client.release();
        console.error('Erro ao cancelar compra:', err);
        return res.status(500).json({ erro: 'Erro interno ao cancelar passagem' });
    }
});

// Exporta o router para ser usado no server.js
module.exports = router;