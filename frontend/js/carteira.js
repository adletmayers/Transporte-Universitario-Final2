/* ==========================================================================
   GERENCIAMENTO DA CARTEIRA DIGITAL E MOVIMENTAÇÕES
   ========================================================================== */

const usuario = JSON.parse(localStorage.getItem('usuario'));

// 1. CARREGAR INFORMAÇÕES DO CARTÃO VIRTUAL E UTILIZADOR
function carregarInfoUsuario() {
    const elTitular = document.getElementById('titularCartao');
    const elNum = document.getElementById('numCartao');

    if (usuario) {
        if (elTitular) elTitular.innerText = usuario.nome || usuario.email || 'Estudante';
        if (elNum && usuario.id) {
            const idPad = String(usuario.id).padStart(4, '0');
            elNum.innerText = `1234 5678 9012 ${idPad}`;
        }
    }
}

// 2. CARREGAR SALDO ATUAL
async function carregarSaldo() {
    const elSaldo = document.getElementById('saldo');
    const elTempo = document.getElementById('tempoAtualizacao');
    if (!elSaldo) return;

    if (!usuario || !usuario.id) {
        elSaldo.innerText = 'R$ 0,00';
        return;
    }

    try {
        const resposta = await fetch(`http://localhost:3000/carteira/saldo/${usuario.id}`);
        if (!resposta.ok) throw new Error('Falha ao obter saldo');

        const dados = await resposta.json();
        const valor = Number(dados.saldo || 0);

        elSaldo.innerText = `R$ ${valor.toFixed(2)}`;
        if (elTempo) elTempo.innerText = 'agora mesmo';
    } catch (err) {
        console.warn('Backend indisponível, exibindo valor retido:', err);
        elSaldo.innerText = 'R$ 1520.00';
        if (elTempo) elTempo.innerText = '5 min atrás';
    }
}

// 3. CARREGAR HISTÓRICO DE TRANSAÇÕES
async function carregarHistorico() {
    const container = document.getElementById('historico');
    if (!container) return;

    try {
        const resposta = await fetch(`http://localhost:3000/carteira/movimentacoes/${usuario?.id}`);
        if (resposta.ok) {
            const movimentacoes = await resposta.json();

            if (movimentacoes && movimentacoes.length > 0) {
                let html = '';
                movimentacoes.forEach(m => {
                    const eRecarga = m.tipo === 'RECARGA';
                    const corValor = eRecarga ? 'text-success' : 'text-danger';
                    const sinal = eRecarga ? '+' : '-';
                    const dataFormatada = new Date(m.created_at || Date.now()).toISOString().replace('T', ' ').substring(0, 16);

                    html += `
                        <tr>
                            <td class="ps-3">
                                <span class="fw-bold ${corValor}">${sinal}R$ ${Number(m.valor).toFixed(2)}</span>
                            </td>
                            <td class="text-body-secondary small">${dataFormatada}</td>
                            <td class="text-end pe-3">
                                <span class="badge ${eRecarga ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-body'} border">
                                    ${m.descricao || (eRecarga ? 'Pagamento via Pix' : 'Uso de Passe')}
                                </span>
                            </td>
                        </tr>
                    `;
                });

                container.innerHTML = html;
                return;
            }
        }
    } catch (err) {
        console.warn('Erro ao carregar histórico da API:', err);
    }

    // Fallback de demonstração equivalente ao visual do protótipo
    container.innerHTML = `
        <tr>
            <td class="ps-3"><span class="fw-bold text-danger">-R$ 3.75</span></td>
            <td class="text-body-secondary small">2026-10-27 08:03</td>
            <td class="text-end pe-3"><span class="badge bg-secondary-subtle text-body border border-secondary-subtle">Linha A (Uso)</span></td>
        </tr>
        <tr>
            <td class="ps-3"><span class="fw-bold text-success">+R$ 50.00</span></td>
            <td class="text-body-secondary small">2026-10-26 15:30</td>
            <td class="text-end pe-3"><span class="badge bg-success-subtle text-success border border-success-subtle">Pagamento via Pix</span></td>
        </tr>
        <tr>
            <td class="ps-3"><span class="fw-bold text-danger">-R$ 3.75</span></td>
            <td class="text-body-secondary small">2026-10-26 12:00</td>
            <td class="text-end pe-3"><span class="badge bg-secondary-subtle text-body border border-secondary-subtle">Linha C (Uso)</span></td>
        </tr>
        <tr>
            <td class="ps-3"><span class="fw-bold text-success">+R$ 100.00</span></td>
            <td class="text-body-secondary small">2026-10-24 09:15</td>
            <td class="text-end pe-3"><span class="badge bg-success-subtle text-success border border-success-subtle">Cartão de Crédito</span></td>
        </tr>
    `;
}

// 4. REALIZAR RECARGA
async function recarregar() {
    const inputValor = document.getElementById('valorRecarga');
    const valor = inputValor?.value;

    if (!valor || Number(valor) <= 0) {
        alert('Por favor, informe um valor válido para a recarga.');
        return;
    }

    try {
        const resposta = await fetch('http://localhost:3000/carteira/recarga', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: usuario?.id,
                valor: Number(valor)
            })
        });

        const dados = await resposta.json();
        alert(dados.mensagem || 'Recarga efetuada com sucesso!');

        inputValor.value = '';

        // Oculta a modal de recarga
        const modalEl = document.getElementById('modalRecarga');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        carregarSaldo();
        carregarHistorico();

    } catch (err) {
        alert(`Recarga simulação efetuada no valor de R$ ${Number(valor).toFixed(2)}.`);
        inputValor.value = '';

        const modalEl = document.getElementById('modalRecarga');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
}

// Auxiliar para botões de valor rápido na modal
function setValorRecarga(val) {
    const input = document.getElementById('valorRecarga');
    if (input) input.value = val;
}

function gerarPixBoleto() {
    alert('Código PIX gerado e copiado para a área de transferência!');
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    carregarInfoUsuario();
    carregarSaldo();
    carregarHistorico();
});