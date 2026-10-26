const usuario = JSON.parse(localStorage.getItem('usuario'));

fetch('http://localhost:3000/rotas')
    .then(r => r.json())
    .then(dados => {
        let html = '';
        let totalAssentos = 0;
        let somaPorcentagens = 0;

        const totalRotasEl = document.getElementById('totalRotas');
        const totalRotasCard = document.getElementById('totalRotasCard');
        const totalCapacidadeCard = document.getElementById('totalCapacidadeCard');
        const mediaOcupacaoCard = document.getElementById('mediaOcupacaoCard');

        if (totalRotasEl) totalRotasEl.innerHTML = dados.length;
        if (totalRotasCard) totalRotasCard.innerHTML = dados.length;

        if (!dados || dados.length === 0) {
            const tabelaEl = document.getElementById('tabela');
            if (tabelaEl) {
                tabelaEl.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Nenhuma rota cadastrada no momento.</td></tr>`;
            }
            return;
        }

        dados.forEach(r => {
            const porcentagem = Math.min(Math.round((r.lotacao / r.capacidade) * 100), 100);
            totalAssentos += Number(r.capacidade) || 0;
            somaPorcentagens += porcentagem;

            let statusColor = 'var(--bs-success, #28a745)';
            if (porcentagem > 80) statusColor = 'var(--bs-danger, #dc3545)';
            else if (porcentagem > 50) statusColor = 'var(--bs-warning, #ffc107)';

            html += `
                <tr>
                    <td class="ps-3">#${r.id}</td>
                    <td><strong>${r.nome}</strong></td>
                    <td class="text-muted">${r.horario}</td>
                    <td class="text-muted">${r.capacidade} assentos</td>
                    <td class="pe-3">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="flex: 1; height: 8px; background: rgba(100,100,100,0.15); border-radius: 999px; overflow: hidden;">
                                <div style="width: ${porcentagem}%; height: 100%; background: ${statusColor}; transition: width 0.3s ease;"></div>
                            </div>
                            <span style="font-size: 12px; font-weight: 600; min-width: 35px; text-align: right;" class="text-muted">
                                ${r.lotacao}/${r.capacidade}
                            </span>
                        </div>
                    </td>
                </tr>
            `;
        });

        // Atualiza os cards de resumo superior
        if (totalCapacidadeCard) totalCapacidadeCard.innerHTML = totalAssentos;
        if (mediaOcupacaoCard && dados.length > 0) {
            const media = Math.round(somaPorcentagens / dados.length);
            mediaOcupacaoCard.innerHTML = `${media}%`;
        }

        const tabelaEl = document.getElementById('tabela');
        if (tabelaEl) {
            tabelaEl.innerHTML = html;
        }
    })
    .catch(error => {
        console.log("Erro ao carregar rotas da API:", error);
        const tabelaEl = document.getElementById('tabela');
        if (tabelaEl) {
            tabelaEl.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Falha ao conectar com o servidor de rotas.</td></tr>`;
        }
    });

function filtrarRotas() {
    const inputBusca = document.getElementById('busca');
    if (!inputBusca) return;
    
    const texto = inputBusca.value.toLowerCase();
    const linhas = document.querySelectorAll('#tabela tr');

    linhas.forEach(linha => {
        if (linha.querySelector('.spinner-border')) return;
        
        const atendeFiltro = linha.innerText.toLowerCase().includes(texto);
        linha.style.display = atendeFiltro ? '' : 'none';
    });
}