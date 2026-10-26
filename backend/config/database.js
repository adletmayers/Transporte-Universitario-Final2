const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const isRemoteDb = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    
    // Força SSL se estiver em produção ou conectando a um banco remoto (Supabase)
    ssl: (isProduction || isRemoteDb) ? { rejectUnauthorized: false } : false,

    // Configurações para evitar ETIMEDOUT e travamentos de pool
    connectionTimeoutMillis: 10000, // Aguarda até 10s antes de estourar timeout na conexão inicial
    idleTimeoutMillis: 30000,       // Encerra conexões inativas após 30s para liberar memória
    max: 10,                        // Limite de conexões simultâneas no pool
    keepAlive: true                 // Mantém pacotes TCP ativos para evitar queda por inatividade
});

pool.on('connect', () => {
    console.log('PostgreSQL conectado com sucesso');
});

pool.on('error', (err) => {
    console.error('Erro inesperado no pool do PostgreSQL:', err);
});

module.exports = pool;