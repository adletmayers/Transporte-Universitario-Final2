// Recupera o usuário logado
const usuario = JSON.parse(localStorage.getItem('usuario'));

// Função para buscar dados da API e preencher os KPIs
async function carregar() {
    try {
        const resposta = await fetch('http://localhost:3000/admin/relatorios');
        const dados = await resposta.json();

        // Atualiza os valores na tela verificando se o elemento existe
        const elUsuarios = document.getElementById('usuarios');
        const elViagens = document.getElementById('viagens');
        const elCompras = document.getElementById('compras');
        const elFaturamento = document.getElementById('faturamento');

        if (elUsuarios) elUsuarios.innerHTML = dados.usuarios || 0;
        if (elViagens) elViagens.innerHTML = dados.viagens || 0;
        if (elCompras) elCompras.innerHTML = dados.compras || 0;
        if (elFaturamento) elFaturamento.innerHTML = `R$ ${dados.faturamento || 0}`;

    } catch (error) {
        console.error("Erro ao carregar os dados da API:", error);
    }
}

// Função para renderizar os gráficos baseados na imagem
function renderizarGraficos() {
    // Configurações Globais do Chart.js para o Dark Mode
    Chart.defaults.color = '#71717a'; // Usando sua variável --text-muted
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.scale.grid.color = '#27272a'; // Usando sua variável --border

    const diasMes = Array.from({length: 31}, (_, i) => i + 1);

    // 1. Gráfico Misto (Combo Chart) - Utilização Diária
    const ctxCombo = document.getElementById('comboChart');
    if (ctxCombo) {
        new Chart(ctxCombo, {
            type: 'bar',
            data: {
                labels: diasMes,
                datasets: [
                    {
                        type: 'line',
                        label: 'Utilização Geral',
                        data: Array.from({length: 31}, () => Math.floor(Math.random() * (25000 - 15000) + 15000)),
                        borderColor: '#f87171', // Sua cor --danger
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        order: 0
                    },
                    {
                        label: 'Linha A',
                        data: Array.from({length: 31}, () => Math.floor(Math.random() * 8000 + 3000)),
                        backgroundColor: '#4ade80', // Sua cor --success
                        stacked: true,
                        order: 1
                    },
                    {
                        label: 'Linha B',
                        data: Array.from({length: 31}, () => Math.floor(Math.random() * 6000 + 2000)),
                        backgroundColor: '#60a5fa', 
                        stacked: true,
                        order: 1
                    },
                    {
                        label: 'Linha C',
                        data: Array.from({length: 31}, () => Math.floor(Math.random() * 5000 + 1000)),
                        backgroundColor: '#fbbf24', 
                        stacked: true,
                        order: 1
                    },
                    {
                        label: 'Linha D',
                        data: Array.from({length: 31}, () => Math.floor(Math.random() * 3000 + 500)),
                        backgroundColor: '#c084fc', 
                        stacked: true,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, usePointStyle: true, padding: 20 }
                    }
                }
            }
        });
    }

    // 2. Gráfico de Pizza - Distribuição de Passageiros
    const ctxPie = document.getElementById('pieChart');
    if (ctxPie) {
        new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: ['Linha A: 40%', 'Linha B: 30%', 'Linha C: 20%', 'Linha D: 10%'],
                datasets: [{
                    data: [40, 30, 20, 10],
                    backgroundColor: [
                        '#4ade80', // Linha A
                        '#60a5fa', // Linha B
                        '#fbbf24', // Linha C
                        '#c084fc'  // Linha D
                    ],
                    borderWidth: 2,
                    borderColor: '#111113' // Sua cor --surface para mesclar com o fundo
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#f4f4f5', font: { size: 11 }, padding: 15 }
                    }
                }
            }
        });
    }
}

// Inicializa as funções assim que a página estiver pronta
document.addEventListener('DOMContentLoaded', () => {
    carregar();
    renderizarGraficos();
});