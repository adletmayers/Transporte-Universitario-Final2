/* ==========================================================================
   GERENCIAMENTO DE DADOS E EVENTOS DO DASHBOARD
   ========================================================================== */

const usuario = JSON.parse(localStorage.getItem('usuario'));

// 1. CARREGAR NOME DE BOAS-VINDAS
function carregarUsuario() {
    const elementoNome = document.getElementById('nomeUsuario');
    if (elementoNome && usuario && usuario.nome) {
        const primeiroNome = usuario.nome.trim().split(' ')[0];
        elementoNome.innerHTML = `Olá, ${primeiroNome} <i class="bi bi-hand-wave text-warning ms-1"></i>`;
    }
}

// 2. CARREGAR SALDO DA CARTEIRA
async function carregarSaldo() {
    const elementoSaldo = document.getElementById('saldo');
    if (!elementoSaldo) return;

    if (!usuario || !usuario.id) {
        elementoSaldo.innerText = 'R$ 0,00';
        return;
    }

    try {
        const resposta = await fetch(`http://localhost:3000/carteira/saldo/${usuario.id}`);
        if (!resposta.ok) throw new Error('Falha na requisição');

        const dados = await resposta.json();
        const valor = Number(dados.saldo || 0);

        elementoSaldo.innerText = `R$ ${valor.toFixed(2)}`;
    } catch (err) {
        console.warn('Erro ao obter saldo:', err);
        elementoSaldo.innerText = 'R$ 0,00';
    }
}

// 3. CARREGAR PRÓXIMA VIAGEM
async function carregarProximaViagem() {
    const container = document.getElementById('proximaViagem');
    if (!container) return;

    try {
        const resposta = await fetch(`http://localhost:3000/viagens/proxima/${usuario?.id}`);
        if (resposta.ok) {
            const viagem = await resposta.json();
            if (viagem && viagem.linha) {
                container.innerHTML = `
                    <p class="text-secondary small mb-1">Próxima Viagem Agendada:</p>
                    <div class="fw-bold text-success mb-2">${viagem.linha}</div>
                    <div class="small text-secondary mb-3">Horário: ${viagem.horario || 'Em breve'}</div>
                    <a href="passagens.html" class="btn btn-outline-primary w-100 fw-semibold">Ver Detalhes</a>
                `;
                return;
            }
        }
    } catch (err) {
        // Fallback para estado padrão
    }

    container.innerHTML = `
        <p class="text-secondary small mb-1">Próxima Viagem:</p>
        <div class="fw-semibold text-warning mb-3">Sem Viagens Agendadas</div>
        <div class="p-2 rounded bg-body-tertiary mb-3 small">
            <span class="text-secondary d-block">Próxima Viagem Disponível:</span>
            <strong>28/10/2026 - Linha A (Campus Central)</strong> - R$ 12.50
        </div>
        <a href="passagens.html" class="btn btn-light text-dark w-100 fw-semibold shadow-sm">Comprar Passagens</a>
    `;
}

// 4. CARREGAR AVISOS RECENTES
async function carregarAvisos() {
    const container = document.getElementById('avisosRecentes');
    if (!container) return;

    try {
        const resposta = await fetch('http://localhost:3000/avisos');
        if (!resposta.ok) throw new Error('Erro na requisição');

        const avisos = await resposta.json();

        if (!avisos || avisos.length === 0) {
            container.innerHTML = '<div class="text-secondary small">Nenhum aviso recente.</div>';
            return;
        }

        let html = '';
        avisos.slice(0, 3).forEach(aviso => {
            html += `
                <div class="border-bottom border-secondary-subtle pb-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong class="small text-body"><i class="bi bi-dot text-primary fs-5 me-1"></i>${aviso.titulo || 'Aviso'}</strong>
                        <span class="text-secondary" style="font-size: 0.75rem;">${aviso.tempo || 'Hoje'}</span>
                    </div>
                    <p class="text-secondary small mb-1 ms-3">${aviso.mensagem || ''}</p>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (err) {
        // Exibição visual padronizada de avisos de teste quando a API não estiver ativa
        container.innerHTML = `
            <div class="border-bottom border-secondary-subtle pb-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong class="small d-block text-body"><i class="bi bi-record-fill text-primary me-1"></i>Nova rota</strong>
                        <a href="rotas.html" class="small text-primary text-decoration-none ms-3">Visualizar Nova Rota</a>
                    </div>
                    <span class="text-secondary" style="font-size: 0.75rem;">1h atrás</span>
                </div>
            </div>
            <div class="border-bottom border-secondary-subtle pb-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong class="small d-block text-body"><i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>Linha atrasada</strong>
                        <a href="avisos.html" class="small text-secondary text-decoration-none ms-3">Ver Detalhes do Atraso</a>
                    </div>
                    <span class="text-secondary" style="font-size: 0.75rem;">30min atrás</span>
                </div>
            </div>
            <div>
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong class="small d-block text-body"><i class="bi bi-shield-check text-success me-1"></i>Cartilha de Segurança</strong>
                    </div>
                    <span class="text-secondary" style="font-size: 0.75rem;">Ontem</span>
                </div>
            </div>
        `;
    }
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    carregarUsuario();
    carregarSaldo();
    carregarProximaViagem();
    carregarAvisos();
});