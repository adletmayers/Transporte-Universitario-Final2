// LOGIN

const usuario = JSON.parse(
    localStorage.getItem('usuario')
);

// SALVAR OU EDITAR VIAGEM

async function salvar() {
    const viagemId = localStorage.getItem('editarViagemId');
    console.log('ID edição:', viagemId);

    const url = viagemId
        ? `http://localhost:3000/admin/viagens/${viagemId}`
        : 'http://localhost:3000/admin/viagens';

    const metodo = viagemId ? 'PUT' : 'POST';
    console.log('Método:', metodo);
    console.log('URL:', url);

    const resposta = await fetch(url, {
        method: metodo,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            origem: document.getElementById('origem').value,
            destino: document.getElementById('destino').value,
            data_ida: document.getElementById('data').value,
            horario_saida: document.getElementById('saida').value,
            horario_chegada: document.getElementById('chegada').value,
            valor: document.getElementById('valor').value,
            vagas_totais: document.getElementById('vagas').value
        })
    });

    const dados = await resposta.json();

    if (dados.erro) {
        alert(dados.erro);
        return;
    }

    alert(
        viagemId
            ? 'Viagem atualizada!'
            : 'Viagem cadastrada!'
    );

    localStorage.removeItem('editarViagemId');

    // Restaura interface do formulário para o estado padrão
    document.getElementById('tituloPagina').innerHTML = `
        <i class="bi bi-bus-front me-2"></i>Cadastrar Viagem
    `;

    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.innerHTML = `<i class="bi bi-check-lg me-1"></i>Cadastrar`;
    btnSalvar.classList.remove('btn-warning');
    btnSalvar.classList.add('btn-success');

    location.reload();
}

// CARREGAR LISTA DE VIAGENS EM FORMATO DE TABELA

carregarViagens();

async function carregarViagens() {
    try {
        const resposta = await fetch('http://localhost:3000/admin/viagens');
        const viagens = await resposta.json();

        let html = '';

        viagens.forEach(v => {
            // Formatação segura de datas e horários (caso venham nulos ou com formato diferente)
            const dataFormatada = v.data_ida ? new Date(v.data_ida).toLocaleDateString('pt-BR') : '-';
            const saida = v.horario_saida ? v.horario_saida.substring(0, 5) : '--:--';
            const chegada = v.horario_chegada ? v.horario_chegada.substring(0, 5) : '--:--';
            const valorFormatado = v.valor ? `R$ ${parseFloat(v.valor).toFixed(2)}` : 'R$ 0,00';
            const vagasTexto = v.vagas_disponiveis !== undefined ? `${v.vagas_disponiveis}/${v.vagas_totais} vagas` : `${v.vagas_totais || 0} vagas`;

            html += `
            <tr>
                <td><strong class="text-light">TV-${v.id}</strong></td>
                <td>
                    <div class="d-flex align-items-center gap-1">
                        <i class="bi bi-bus-front text-primary"></i>
                        <span>${v.origem} &rarr; ${v.destino}</span>
                    </div>
                </td>
                <td class="text-secondary">Motorista Padrão</td>
                <td class="text-secondary">ABC-1D23</td>
                <td>${dataFormatada} às ${saida}</td>
                <td>${dataFormatada} às ${chegada}</td>
                <td>
                    <span class="badge badge-success" style="padding: 6px 10px; border-radius: 6px; font-size: 11px;">
                        <span style="width: 6px; height: 6px; display: inline-block; background: currentColor; border-radius: 50%; margin-right: 4px;"></span>
                        Ativa (${vagasTexto})
                    </span>
                </td>
                <td>
                    <div class="d-flex gap-2">
                        <button
                            class="button button-secondary btn-sm"
                            style="padding: 4px 10px; font-size: 12px;"
                            onclick="editarViagem(${v.id})">
                            [Editar]
                        </button>
                        <button
                            class="button btn-sm"
                            style="padding: 4px 10px; font-size: 12px; background: var(--danger-bg); color: #fecaca; border: 1px solid #7f1d1d;"
                            onclick="excluirViagem(${v.id})">
                            [Excluir]
                        </button>
                    </div>
                </td>
            </tr>
            `;
        });

        document.getElementById('listaViagens').innerHTML = html;

    } catch (err) {
        console.error('Erro ao carregar viagens:', err);
    }
}

// EXCLUIR VIAGEM

async function excluirViagem(id) {
    const confirmar = confirm('Deseja excluir esta viagem?');

    if (!confirmar) {
        return;
    }

    const resposta = await fetch(`http://localhost:3000/admin/viagens/${id}`, {
        method: 'DELETE'
    });

    const dados = await resposta.json();

    alert(dados.mensagem);

    carregarViagens();
}

// EDITAR VIAGEM

async function editarViagem(id) {
    try {
        const resposta = await fetch(`http://localhost:3000/admin/viagens/${id}`);
        const viagem = await resposta.json();

        console.log(viagem);

        document.getElementById('origem').value = viagem.origem;
        document.getElementById('destino').value = viagem.destino;
        document.getElementById('data').value = viagem.data_ida.split('T')[0];
        document.getElementById('saida').value = viagem.horario_saida.substring(0, 5);
        document.getElementById('chegada').value = viagem.horario_chegada.substring(0, 5);
        document.getElementById('valor').value = viagem.valor;
        document.getElementById('vagas').value = viagem.vagas_totais;

        localStorage.setItem('editarViagemId', id);

        // Atualiza a interface do formulário para modo de edição com ícones
        document.getElementById('tituloPagina').innerHTML = `
            <i class="bi bi-pencil-square me-2"></i>Editar Viagem
        `;

        const btnSalvar = document.getElementById('btnSalvar');
        btnSalvar.innerHTML = `<i class="bi bi-arrow-repeat me-1"></i>Atualizar`;
        btnSalvar.classList.remove('btn-success');
        btnSalvar.classList.add('btn-warning');

        // Rola a página suavemente para o formulário no topo
        window.scrollTo({ top: 0, behavior: 'smooth' });

        console.log('Campos preenchidos');

    } catch (err) {
        console.error(err);
    }
}