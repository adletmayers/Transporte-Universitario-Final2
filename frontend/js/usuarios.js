const usuario = JSON.parse(localStorage.getItem('usuario'));

carregarUsuarios();

async function carregarUsuarios() {
    try {
        const resposta = await fetch('http://localhost:3000/admin/usuarios');
        const usuarios = await resposta.json();

        let html = '';

        usuarios.forEach(u => {
            const matricula = u.matricula || u.id;
            const curso = u.curso || 'Não informado';
            const status = u.status || 'Ativo';
            
            const isAtivo = status.toLowerCase() === 'ativo';
            const statusClass = isAtivo ? 'bg-success' : 'bg-danger';

            html += `
                <tr>
                    <td style="text-align: left;">${matricula}</td>
                    <td style="text-align: left;">${u.nome}</td>
                    <td style="text-align: left;">${u.tipo}</td>
                    <td style="text-align: left;">${curso}</td>
                    <td style="text-align: left;">${u.email}</td>
                    <td style="text-align: left;">
                        <span class="status-dot ${statusClass} d-inline-block me-1" style="width:8px; height:8px; border-radius:50%;"></span>
                        ${status}
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="promover(${u.id})">
                            <i class="bi bi-shield-check"></i> Admin
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="excluir(${u.id})">
                            <i class="bi bi-trash"></i> Excluir
                        </button>
                    </td>
                </tr>
            `;
        });

        document.getElementById('listaUsuarios').innerHTML = html;
        
        // Atualiza contador de usuários
        if (document.getElementById('totalUsuarios')) {
            document.getElementById('totalUsuarios').innerText = usuarios.length;
        }

    } catch (err) {
        console.error("Erro ao carregar usuários:", err);
        document.getElementById('listaUsuarios').innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle me-2"></i>Erro ao carregar os usuários. Verifica se a API está online.
                </td>
            </tr>
        `;
    }
}

async function promover(id) {
    try {
        const resposta = await fetch(`http://localhost:3000/admin/usuarios/${id}/admin`, {
            method: 'PUT'
        });

        const dados = await resposta.json().catch(() => ({}));
        const mensagem = dados.mensagem || dados.erro || dados.error || (resposta.ok ? 'Usuário promovido com sucesso!' : 'Erro ao promover usuário.');

        alert(mensagem);

        if (resposta.ok) {
            carregarUsuarios();
        }
    } catch (err) {
        console.error("Erro ao promover usuário:", err);
        alert("Ocorreu um erro ao tentar promover o usuário.");
    }
}

async function excluir(id) {
    const confirmar = confirm('Deseja realmente excluir este usuário?');
    if (!confirmar) return;

    try {
        const resposta = await fetch(`http://localhost:3000/admin/usuarios/${id}`, {
            method: 'DELETE'
        });

        const dados = await resposta.json().catch(() => ({}));
        const mensagem = dados.mensagem || dados.erro || dados.error || (resposta.ok ? 'Usuário excluído com sucesso!' : 'Não foi possível excluir o usuário.');

        alert(mensagem);

        if (resposta.ok) {
            carregarUsuarios();
        }
    } catch (err) {
        console.error("Erro ao excluir usuário:", err);
        alert("Ocorreu um erro ao tentar excluir o usuário.");
    }
}

// Expõe as funções globalmente para os atributos onclick do HTML
window.carregarUsuarios = carregarUsuarios;
window.promover = promover;
window.excluir = excluir;