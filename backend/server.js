require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

require('./config/database');

const app = express();

app.use(helmet());

app.use(cors({
    origin: '*'
}));

// Aumenta o limite do corpo das requisições JSON e URL-encoded para 10mb (para suportar fotos em Base64)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(morgan('dev'));

// ========================================
// FRONTEND
// ========================================

app.use(
    express.static(
        path.join(__dirname, '../frontend')
    )
);

// ========================================
// ROTAS DA API
// ========================================

app.use('/rotas', require('./routes/rotas'));
app.use('/usuarios', require('./routes/usuarios'));

app.use('/avisos', require('./routes/avisos'));
app.use('/carteira', require('./routes/carteira'));
app.use('/passagens', require('./routes/passagens'));
app.use('/assentos', require('./routes/assentos'));
app.use('/compras', require('./routes/compras'));
app.use('/admin', require('./routes/admin'));

app.use(
    '/localizacao',
    require('./routes/localizacao')
);

app.use(
    '/carteirinha',
    require('./routes/carteirinha')
);

// ========================================
// PÁGINA PRINCIPAL
// ========================================

app.get('/', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            '../frontend/index.html'
        )
    );

});

// ========================================
// TRATAMENTO DE ERROS
// ========================================

app.use((err, req, res, next) => {

    console.error(err);

    res.status(500).json({
        erro: 'Erro interno do servidor'
    });

});

// ========================================
// SERVIDOR
// ========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `Servidor rodando na porta ${PORT}`
    );

});