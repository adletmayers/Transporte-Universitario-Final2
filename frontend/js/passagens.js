/* ==========================================================================
   GERENCIAMENTO DE PASSAGENS, ASSENTOS E PAGAMENTOS (INTEGRADO COM POP-UPS)
   ========================================================================== */

// Obtém o usuário do localStorage de forma segura
const usuario = JSON.parse(localStorage.getItem('usuario')) || {};

// Estado global do fluxo de compra
let viagemSelecionadaObj = null;
let assentoSelecionado = null;
let modalAssentosInstance = null;
let modalPagamentoInstance = null;
let modalConfirmacaoInstance = null;

// Helper para padronizar dados do banco de dados para o layout do card
function normalizarPassagem(p) {
    const dataFmt = p.data_ida ? new Date(p.data_ida).toLocaleDateString('pt-BR') : 'Data n/a';
    const horaSaida = p.horario_saida ? p.horario_saida.substring(0, 5) : '--:--';

    return {
        codigo: p.codigo || `TKT-${String(p.id || 1).padStart(4, '0')}`,
        linha: p.linha || `${p.origem} → ${p.destino}`,
        dataHora: p.dataHora || `${dataFmt}, ${horaSaida}`,
        busInfo: p.busInfo || `Ônibus Leito`,
        assento: p.assento || `Assento ${p.assento_numero}`,
        validoAte: p.validoAte || horaSaida
    };
}

// 1. CARREGAR PASSAGENS ATIVAS DO USUÁRIO
async function carregarPassagensAtivas() {
    const container = document.getElementById('containerPassagensAtivas');
    const badgeTotal = document.getElementById('totalAtivas');
    if (!container) return;

    if (usuario && usuario.id) {
        try {
            // Tenta buscar no endpoint de compras do usuário
            const resposta = await fetch(`http://localhost:3000/compras/${usuario.id}`);
            if (resposta.ok) {
                const passagens = await resposta.json();
                if (Array.isArray(passagens) && passagens.length > 0) {
                    const passagensFormatadas = passagens.map(normalizarPassagem);
                    if (badgeTotal) badgeTotal.innerText = `${passagensFormatadas.length} Ativa(s)`;
                    renderizarPassagens(passagensFormatadas);
                    return;
                }
            }
        } catch (err) {
            console.warn('Erro ao conectar à API de passagens ativas, exibindo dados locais:', err);
        }
    }

    // Mock visual para testes (caso o banco esteja sem compras)
    

    
}

function renderizarPassagens(lista) {
    const container = document.getElementById('containerPassagensAtivas');
    if (!container) return;

    let html = '';

    lista.forEach((t) => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(t.codigo || 'TKT-000')}`;

        html += `
            <div class="ticket-card p-3 flex-shrink-0">
                <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-secondary-subtle">
                    <strong class="text-body fw-bold">${t.codigo}</strong>
                    <span class="badge bg-success-subtle text-success border border-success-subtle">Ativo</span>
                </div>

                <div class="small text-body-secondary mb-3">
                    <div class="text-body fw-semibold text-truncate mb-1">
                        <i class="bi bi-geo-alt-fill text-danger me-1"></i>${t.linha}
                    </div>
                    <div><i class="bi bi-clock me-1"></i>${t.dataHora}</div>
                    <div class="d-flex justify-content-between mt-1">
                        <span><i class="bi bi-bus-front me-1"></i>${t.busInfo}</span>
                        <strong class="text-body">${t.assento}</strong>
                    </div>
                </div>

                <div class="text-center pt-2 border-top border-secondary-subtle">
                    <div class="qr-placeholder mb-1 shadow-sm">
                        <img src="${qrUrl}" alt="QR Code" width="100" height="100">
                    </div>
                    <span class="d-block extra-small text-body-secondary">
                        Válido até: <strong>${t.validoAte || 'Horário de embarque'}</strong>
                    </span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// 2. CARREGAR ORIGENS E DESTINOS
async function carregarCidades() {
    try {
        const [resOrigens, resDestinos] = await Promise.all([
            fetch('http://localhost:3000/passagens/origens/lista'),
            fetch('http://localhost:3000/passagens/destinos/lista')
        ]);

        if (resOrigens.ok && resDestinos.ok) {
            const origens = await resOrigens.json();
            const destinos = await resDestinos.json();

            const origemSelect = document.getElementById('origem');
            const destinoSelect = document.getElementById('destino');

            if (origemSelect && Array.isArray(origens)) {
                origens.forEach(o => {
                    origemSelect.innerHTML += `<option value="${o.origem}">${o.origem}</option>`;
                });
            }

            if (destinoSelect && Array.isArray(destinos)) {
                destinos.forEach(d => {
                    destinoSelect.innerHTML += `<option value="${d.destino}">${d.destino}</option>`;
                });
            }
        }
    } catch (err) {
        console.warn('Erro ao carregar cidades da API:', err);
    }
}

// 3. BUSCAR VIAGENS DISPONÍVEIS
async function buscarViagens() {
    const elOrigem = document.getElementById('origem');
    const elDestino = document.getElementById('destino');
    const elData = document.getElementById('data');

    const origem = elOrigem ? elOrigem.value : '';
    const destino = elDestino ? elDestino.value : '';
    const data = elData ? elData.value : '';

    if (!origem || !destino) {
        alert('Selecione origem e destino para consultar.');
        return;
    }

    const resContainer = document.getElementById('resultado');
    if (!resContainer) return;

    try {
        let url = `http://localhost:3000/passagens/buscar/filtro?origem=${encodeURIComponent(origem)}&destino=${encodeURIComponent(destino)}`;
        if (data) url += `&data=${data}`;

        const resposta = await fetch(url);
        if (resposta.ok) {
            const viagens = await resposta.json();

            if (!viagens || viagens.length === 0) {
                resContainer.innerHTML = `
                    <div class="alert alert-warning border-secondary-subtle">
                        <i class="bi bi-exclamation-triangle me-2"></i>Nenhuma viagem encontrada para este trajeto.
                    </div>
                `;
                return;
            }

            renderizarViagens(viagens);
            return;
        }
    } catch (err) {
        console.warn('Erro ao buscar viagens na API, utilizando resultado local:', err);
    }

    // Fallback de exibição de viagens para testes
    renderizarViagens([
        {
            id: 1,
            origem: origem,
            destino: destino,
            data_ida: data || new Date().toISOString(),
            horario_saida: '08:00:00',
            horario_chegada: '09:00:00',
            vagas_disponiveis: 18,
            valor: 12.50
        }
    ]);
}

function renderizarViagens(viagens) {
    const resContainer = document.getElementById('resultado');
    if (!resContainer) return;

    let html = '';

    viagens.forEach(v => {
        const dataFmt = v.data_ida ? new Date(v.data_ida).toLocaleDateString('pt-BR') : '-';
        const horaSaida = v.horario_saida ? v.horario_saida.substring(0, 5) : '00:00';
        const horaChegada = v.horario_chegada ? v.horario_chegada.substring(0, 5) : '00:00';

        html += `
            <div class="card border-secondary-subtle shadow-sm mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <h5 class="mb-0 fw-bold text-body">
                            <i class="bi bi-bus-front me-2 text-primary"></i>${v.origem}
                            <span class="mx-2 text-primary">&rarr;</span>
                            ${v.destino}
                        </h5>
                        <span class="badge bg-success-subtle text-success border border-success-subtle">
                            ${v.vagas_disponiveis ?? 20} vagas disponíveis
                        </span>
                    </div>

                    <hr class="my-3 border-secondary-subtle">

                    <div class="row g-3 text-body-secondary small align-items-center">
                        <div class="col-6 col-md-3">
                            <strong class="d-block text-body"><i class="bi bi-calendar-event me-1"></i>Data</strong>
                            <span>${dataFmt}</span>
                        </div>

                        <div class="col-6 col-md-3">
                            <strong class="d-block text-body"><i class="bi bi-clock me-1"></i>Horário</strong>
                            <span>${horaSaida} - ${horaChegada}</span>
                        </div>

                        <div class="col-6 col-md-3">
                            <strong class="d-block text-body"><i class="bi bi-tag me-1"></i>Valor Unitário</strong>
                            <span class="fs-5 fw-bold text-success">R$ ${parseFloat(v.valor || 0).toFixed(2)}</span>
                        </div>

                        <div class="col-6 col-md-3 text-end">
                            <button class="btn btn-success fw-semibold px-3" onclick='abrirModalAssentos(${JSON.stringify(v)})'>
                                <i class="bi bi-ticket-perforated me-1"></i> Escolher Assento
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    resContainer.innerHTML = html;
}

// 4. ABRIR POP-UP DE ESCOLHA DE ASSENTOS
async function abrirModalAssentos(viagem) {
    viagemSelecionadaObj = viagem;
    assentoSelecionado = null;

    const elTextoAssento = document.getElementById('assentoEscolhidoTexto');
    if (elTextoAssento) elTextoAssento.innerText = 'Nenhum assento selecionado';

    const dataFmt = viagem.data_ida ? new Date(viagem.data_ida).toLocaleDateString('pt-BR') : '-';
    const horaSaida = viagem.horario_saida ? viagem.horario_saida.substring(0, 5) : '00:00';

    const elViagemInfo = document.getElementById('viagemInfoModal');
    if (elViagemInfo) {
        elViagemInfo.innerHTML = `
            <div class="row g-2 text-center text-md-start">
                <div class="col-6 col-md-3"><span class="text-body-secondary d-block">Rota</span><strong class="text-body">${viagem.origem} &rarr; ${viagem.destino}</strong></div>
                <div class="col-6 col-md-3"><span class="text-body-secondary d-block">Data / Hora</span><strong class="text-body">${dataFmt} - ${horaSaida}</strong></div>
                <div class="col-6 col-md-3"><span class="text-body-secondary d-block">Vagas</span><strong class="text-body">${viagem.vagas_disponiveis ?? '-'}</strong></div>
                <div class="col-6 col-md-3"><span class="text-body-secondary d-block">Valor</span><strong class="text-success fw-bold fs-6">R$ ${parseFloat(viagem.valor || 0).toFixed(2)}</strong></div>
            </div>
        `;
    }

    const elModalAssentos = document.getElementById('modalAssentos');
    if (elModalAssentos) {
        modalAssentosInstance = bootstrap.Modal.getOrCreateInstance(elModalAssentos);
        modalAssentosInstance.show();
    }

    await carregarAssentosModal(viagem.id);
}

// 5. CARREGAR GRID DE ASSENTOS NO POP-UP
async function carregarAssentosModal(viagemId) {
    try {
        const resposta = await fetch(`http://localhost:3000/assentos/viagem/${viagemId}`);
        if (resposta.ok) {
            const assentos = await resposta.json();
            renderizarGridAssentos(assentos);
            return;
        }
    } catch (err) {
        console.warn('Erro ao carregar assentos da API, gerando mapa padrão:', err);
    }

    // Mock fallback para testes com 28 assentos
    const assentosMock = Array.from({ length: 28 }, (_, i) => ({
        numero: i + 1,
        ocupado: [3, 4, 11, 12, 18].includes(i + 1)
    }));
    renderizarGridAssentos(assentosMock);
}

function renderizarGridAssentos(assentos) {
    const container = document.getElementById('gridAssentos');
    if (!container) return;

    let html = '';

    assentos.forEach(a => {
        const ehOcupado = a.ocupado;
        const classeEstado = ehOcupado ? 'ocupado' : 'livre';

        html += `
            <button
                id="assento-${a.numero}"
                class="assento ${classeEstado}"
                ${ehOcupado ? 'disabled' : ''}
                onclick="selecionarAssentoModal(${a.numero})">
                ${a.numero}
            </button>
        `;
    });

    container.innerHTML = html;
}

// 6. SELEÇÃO VISUAL DE ASSENTO
function selecionarAssentoModal(numero) {
    document.querySelectorAll('.assento.livre').forEach(btn => btn.classList.remove('selecionado'));

    const btnTarget = document.getElementById(`assento-${numero}`);
    if (btnTarget) {
        btnTarget.classList.add('selecionado');
    }

    assentoSelecionado = numero;
    const elTexto = document.getElementById('assentoEscolhidoTexto');
    if (elTexto) elTexto.innerText = `Assento Selecionado: ${numero}`;
}

// 7. NAVEGAÇÃO ENTRE POP-UPS (ASSENTO -> PAGAMENTO)
function avancarParaPagamento() {
    if (!usuario || !usuario.id) {
        alert('Faça login novamente para continuar.');
        window.location.href = 'index.html';
        return;
    }

    if (!assentoSelecionado) {
        alert('Por favor, selecione um assento para continuar.');
        return;
    }

    const elResumoAssento = document.getElementById('resumoAssento');
    const elResumoValor = document.getElementById('resumoValor');
    const elMsgPagamento = document.getElementById('mensagemPagamento');

    if (elResumoAssento) elResumoAssento.innerText = `Assento ${assentoSelecionado}`;
    if (elResumoValor) elResumoValor.innerText = `R$ ${parseFloat(viagemSelecionadaObj?.valor || 0).toFixed(2)}`;
    if (elMsgPagamento) elMsgPagamento.innerHTML = '';

    const elModalAssentos = document.getElementById('modalAssentos');
    if (elModalAssentos) {
        modalAssentosInstance = bootstrap.Modal.getOrCreateInstance(elModalAssentos);
        modalAssentosInstance.hide();
    }

    const elModalPagamento = document.getElementById('modalPagamento');
    if (elModalPagamento) {
        modalPagamentoInstance = bootstrap.Modal.getOrCreateInstance(elModalPagamento);
        modalPagamentoInstance.show();
    }
}

function voltarParaAssentos() {
    const elModalPagamento = document.getElementById('modalPagamento');
    if (elModalPagamento) {
        modalPagamentoInstance = bootstrap.Modal.getOrCreateInstance(elModalPagamento);
        modalPagamentoInstance.hide();
    }

    const elModalAssentos = document.getElementById('modalAssentos');
    if (elModalAssentos) {
        modalAssentosInstance = bootstrap.Modal.getOrCreateInstance(elModalAssentos);
        modalAssentosInstance.show();
    }
}

// 8. PROCESSAR PAGAMENTO DENTRO DO POP-UP
async function executarPagamento() {
    const elForma = document.getElementById('forma');
    const forma = elForma ? elForma.value : 'CARTEIRA';
    const msgContainer = document.getElementById('mensagemPagamento');
    const botao = document.getElementById('btnPagar');

    if (!usuario || !usuario.id) {
        if (msgContainer) {
            msgContainer.innerHTML = `
                <div class="alert alert-danger py-2 small border-secondary-subtle mb-0">
                    <i class="bi bi-exclamation-triangle me-1"></i>Sessão expirada. Faça login novamente.
                </div>
            `;
        }
        return;
    }

    if (msgContainer) {
        msgContainer.innerHTML = `
            <div class="alert alert-info py-2 small border-secondary-subtle mb-0">
                <i class="bi bi-arrow-repeat me-1"></i>Processando pagamento...
            </div>
        `;
    }
    if (botao) botao.disabled = true;

    if (forma === 'CARTEIRA') {
        try {
            const saldoResp = await fetch(`http://localhost:3000/carteira/saldo/${usuario.id}`);
            if (saldoResp.ok) {
                const saldoDados = await saldoResp.json();
                if (Number(saldoDados.saldo) < Number(viagemSelecionadaObj?.valor || 0)) {
                    if (msgContainer) {
                        msgContainer.innerHTML = `
                            <div class="alert alert-danger py-2 small border-secondary-subtle mb-0">
                                <i class="bi bi-exclamation-triangle me-1"></i>Saldo insuficiente na carteira.
                            </div>
                        `;
                    }
                    if (botao) botao.disabled = false;
                    return;
                }
            }
        } catch (err) {
            console.warn('Não foi possível validar saldo em tempo real:', err);
        }
    }

    const dadosCompra = {
        viagem: viagemSelecionadaObj || { origem: 'Origem', destino: 'Destino', valor: 0 },
        assento: assentoSelecionado || 1,
        forma: forma,
        dataCompra: new Date()
    };

    try {
        const resposta = await fetch('http://localhost:3000/compras', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: usuario.id,
                viagem_id: viagemSelecionadaObj?.id || 1,
                assento_numero: assentoSelecionado,
                valor: viagemSelecionadaObj?.valor || 0,
                forma_pagamento: forma
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || dados.erro) {
            console.warn('Resposta com erro ou aviso do backend:', dados.erro);
        }

    } catch (err) {
        console.warn('Erro ao conectar ao backend de compras. Executando fluxo local:', err);
    } finally {
        if (botao) botao.disabled = false;
        localStorage.setItem('ultimaCompra', JSON.stringify(dadosCompra));
        exibirModalConfirmacao(dadosCompra);
    }
}

// 9. EXIBIR POP-UP DE CONFIRMAÇÃO
function exibirModalConfirmacao(compra) {
    const elModalPagamento = document.getElementById('modalPagamento');
    if (elModalPagamento) {
        modalPagamentoInstance = bootstrap.Modal.getOrCreateInstance(elModalPagamento);
        modalPagamentoInstance.hide();
    }

    const container = document.getElementById('dadosConfirmacao');
    const dataFmt = compra.dataCompra ? new Date(compra.dataCompra).toLocaleString('pt-BR') : '-';

    if (container) {
        container.innerHTML = `
            <div class="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary-subtle">
                <span class="text-body-secondary">Origem:</span>
                <strong class="text-body">${compra.viagem?.origem || '-'}</strong>
            </div>
            <div class="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary-subtle">
                <span class="text-body-secondary">Destino:</span>
                <strong class="text-body">${compra.viagem?.destino || '-'}</strong>
            </div>
            <div class="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary-subtle">
                <span class="text-body-secondary">Assento:</span>
                <strong class="text-success">Assento ${compra.assento || '-'}</strong>
            </div>
            <div class="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary-subtle">
                <span class="text-body-secondary">Pagamento:</span>
                <strong class="text-body">${compra.forma || '-'}</strong>
            </div>
            <div class="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary-subtle">
                <span class="text-body-secondary">Data da Compra:</span>
                <span class="text-body">${dataFmt}</span>
            </div>
            <div class="d-flex justify-content-between border-top border-secondary-subtle pt-2">
                <span class="text-body-secondary">Valor Total:</span>
                <strong class="text-success fs-6 fw-bold">R$ ${Number(compra.viagem?.valor || 0).toFixed(2)}</strong>
            </div>
        `;
    }

    const elModalConfirmacao = document.getElementById('modalConfirmacao');
    if (elModalConfirmacao) {
        modalConfirmacaoInstance = bootstrap.Modal.getOrCreateInstance(elModalConfirmacao);
        modalConfirmacaoInstance.show();
    } else {
        alert('Compra realizada com sucesso!');
    }

    if (typeof carregarPassagensAtivas === 'function') {
        carregarPassagensAtivas();
    }
}

// INICIALIZAÇÃO DA PÁGINA E DOS MODAIS
document.addEventListener('DOMContentLoaded', () => {
    carregarPassagensAtivas();
    carregarCidades();

    const elAssentos = document.getElementById('modalAssentos');
    const elPagamento = document.getElementById('modalPagamento');
    const elConfirmacao = document.getElementById('modalConfirmacao');

    if (elAssentos) modalAssentosInstance = bootstrap.Modal.getOrCreateInstance(elAssentos);
    if (elPagamento) modalPagamentoInstance = bootstrap.Modal.getOrCreateInstance(elPagamento);
    if (elConfirmacao) modalConfirmacaoInstance = bootstrap.Modal.getOrCreateInstance(elConfirmacao);
});