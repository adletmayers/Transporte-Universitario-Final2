/* ==========================================================================
   GERENCIAMENTO DE HISTÓRICO DE PASSAGENS E CANCELAMENTOS
   ========================================================================== */

const usuario = JSON.parse(localStorage.getItem('usuario')) || {};
let listaComprasCache = [];

document.addEventListener('DOMContentLoaded', () => {
    carregarHistorico();
});

async function carregarHistorico() {
    const container = document.getElementById('historico');
    if (!container) return;

    if (!usuario || !usuario.id) {
        container.innerHTML = `
            <div class="alert alert-warning border-secondary-subtle">
                <i class="bi bi-exclamation-triangle me-2"></i>Você precisa estar logado para visualizar seu histórico.
            </div>
        `;
        return;
    }

    try {
        const resposta = await fetch(`http://localhost:3000/compras/${usuario.id}`);
        
        if (!resposta.ok) {
            throw new Error(`Erro no servidor: ${resposta.status}`);
        }

        const compras = await resposta.json();
        listaComprasCache = Array.isArray(compras) ? compras : [];

        atualizarEstatisticas(listaComprasCache);
        renderizarHistorico(listaComprasCache);

    } catch (err) {
        console.error('Erro ao carregar histórico:', err);
        container.innerHTML = `
            <div class="alert alert-danger border-secondary-subtle">
                <i class="bi bi-x-circle me-2"></i>Erro ao carregar o histórico de passagens. Verifique se o servidor backend está ativo.
            </div>
        `;
    }
}

function renderizarHistorico(compras) {
    const container = document.getElementById('historico');
    if (!container) return;

    if (!compras || compras.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info border-secondary-subtle text-center py-4">
                <i class="bi bi-ticket-detailed fs-3 d-block mb-2"></i>
                Nenhuma passagem encontrada no seu histórico.
            </div>
        `;
        return;
    }

    let html = '<div class="row g-3">';

    compras.forEach(c => {
        const dataViagem = c.data_ida ? new Date(c.data_ida).toLocaleDateString('pt-BR') : '-';
        const horaSaida = c.horario_saida ? c.horario_saida.substring(0, 5) : '--:--';
        const horaChegada = c.horario_chegada ? c.horario_chegada.substring(0, 5) : '--:--';
        const dataCompra = c.data_compra ? new Date(c.data_compra).toLocaleString('pt-BR') : 'Não informada';
        const valorFormatado = parseFloat(c.valor || 0).toFixed(2);

        html += `
            <div class="col-md-6 col-lg-4">
                <div class="card border-secondary-subtle shadow-sm h-100">
                    <div class="card-header bg-body-tertiary border-bottom border-secondary-subtle d-flex justify-content-between align-items-center py-2">
                        <strong class="text-body small"><i class="bi bi-ticket-perforated me-1 text-primary"></i> TKT-${c.id}</strong>
                        <span class="badge bg-success-subtle text-success border border-success-subtle">Confirmada</span>
                    </div>

                    <div class="card-body d-flex flex-column justify-content-between">
                        <div>
                            <h6 class="fw-bold text-body mb-3">
                                <i class="bi bi-bus-front me-2 text-primary"></i>${c.origem}
                                <span class="text-primary mx-1">&rarr;</span>
                                ${c.destino}
                            </h6>

                            <div class="small text-body-secondary mb-2">
                                <div class="d-flex justify-content-between mb-1">
                                    <span><i class="bi bi-calendar-event me-1"></i>Data:</span>
                                    <strong class="text-body">${dataViagem}</strong>
                                </div>
                                <div class="d-flex justify-content-between mb-1">
                                    <span><i class="bi bi-clock me-1"></i>Horário:</span>
                                    <strong class="text-body">${horaSaida} às ${horaChegada}</strong>
                                </div>
                                <div class="d-flex justify-content-between mb-1">
                                    <span><i class="bi bi-person-seat me-1"></i>Assento:</span>
                                    <strong class="text-success">Assento ${c.assento_numero}</strong>
                                </div>
                                <div class="d-flex justify-content-between mb-1">
                                    <span><i class="bi bi-credit-card me-1"></i>Pagamento:</span>
                                    <span class="text-body">${c.forma_pagamento}</span>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span><i class="bi bi-receipt me-1"></i>Comprado em:</span>
                                    <span class="text-body-tertiary extra-small">${dataCompra}</span>
                                </div>
                            </div>
                        </div>

                        <div class="pt-3 border-top border-secondary-subtle d-flex justify-content-between align-items-center mt-3">
                            <span class="fs-5 fw-bold text-success">R$ ${valorFormatado}</span>
                            <button class="btn btn-outline-danger btn-sm" onclick="cancelarCompra(${c.id})">
                                <i class="bi bi-x-lg me-1"></i> Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function atualizarEstatisticas(compras) {
    const elTotal = document.getElementById('statTotalViagens');
    const elGasto = document.getElementById('statTotalGasto');

    if (elTotal) elTotal.innerText = compras.length;

    if (elGasto) {
        const valorTotal = compras.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
        elGasto.innerText = `R$ ${valorTotal.toFixed(2)}`;
    }
}

function filtrarHistorico() {
    const termo = document.getElementById('inputBuscaHistorico')?.value.toLowerCase() || '';
    const filtrados = listaComprasCache.filter(c => 
        c.origem.toLowerCase().includes(termo) || 
        c.destino.toLowerCase().includes(termo)
    );
    renderizarHistorico(filtrados);
}

async function cancelarCompra(id) {
    if (!confirm('Deseja realmente cancelar esta passagem? Essa ação não poderá ser desfeita.')) {
        return;
    }

    try {
        const resposta = await fetch(`http://localhost:3000/compras/${id}`, {
            method: 'DELETE'
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            alert(dados.mensagem || 'Passagem cancelada com sucesso!');
            carregarHistorico();
        } else {
            alert(dados.erro || 'Erro ao cancelar a passagem.');
        }

    } catch (err) {
        console.error('Erro ao cancelar:', err);
        alert('Falha na comunicação com o servidor para cancelar a passagem.');
    }
}