// Recupera usuário logado
const usuario = JSON.parse(localStorage.getItem('usuario'));

/* ==================================
   PROTEÇÃO DE ACESSO
================================== */
if (!usuario || !usuario.id) {
    alert('Sessão expirada. Faça login novamente.');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
}

/* ==================================
   INICIALIZAÇÃO DA PÁGINA
================================== */
document.addEventListener('DOMContentLoaded', () => {
    configurarTipoUsuario();
    carregarDadosFormulario();
    carregarCarteirinhaEPerfil();
    carregarFotoPerfilInicial();
});

function configurarTipoUsuario() {
    const badge = document.getElementById('badgeTipo');
    const tipo = usuario.tipo ? usuario.tipo.toUpperCase() : 'ALUNO';

    if (tipo === 'ADMIN') {
        badge.className = 'badge bg-danger fs-6';
        badge.innerHTML = 'Administrador';
    } else if (tipo === 'PROFESSOR') {
        badge.className = 'badge bg-info text-dark fs-6'; // Azul claro/cyan para professor
        badge.innerHTML = 'Professor';
    } else {
        badge.className = 'badge bg-primary fs-6';
        badge.innerHTML = 'Estudante';
    }

    if (document.getElementById('temaSelect')) {
        document.getElementById('temaSelect').value = usuario.tema || 'dark';
    }
}

function carregarDadosFormulario() {
    document.getElementById('infoId').innerText = usuario.id || '-';
    document.getElementById('infoEmail').innerText = usuario.email || '-';
    document.getElementById('infoCpf').innerText = usuario.cpf || 'Não informado';
    document.getElementById('infoNascimento').innerText = usuario.data_nascimento || 'Não informada';
    document.getElementById('saldoDisplay').innerText = `R$ ${usuario.saldo || '0,00'}`;
}

// Carrega a foto do perfil salva localmente de imediato (se houver)
function carregarFotoPerfilInicial() {
    if (usuario.foto_perfil) {
        const imgAluno = document.getElementById('fotoAluno');
        if (imgAluno) imgAluno.src = usuario.foto_perfil;
    }
}

/* ==================================
   CARREGAR CARTEIRINHA E QR CODE
================================== */
async function carregarCarteirinhaEPerfil() {
    try {
        const resposta = await fetch(`http://localhost:3000/carteirinha/${usuario.id}`);
        const dados = await resposta.json();

        if (!dados.erro) {
            document.getElementById('nome').innerText = dados.nome || usuario.nome || '-';
            document.getElementById('matricula').innerText = dados.matricula || usuario.matricula || '-';
            document.getElementById('curso').innerText = dados.curso || usuario.curso || 'Não informado';
            document.getElementById('instituicao').innerText = dados.universidade || usuario.universidade || 'Não informada';
            document.getElementById('turno').innerText = dados.turno || usuario.turno || 'Não informado';

            document.getElementById('validade').innerText = dados.validade_carteirinha
                ? new Date(dados.validade_carteirinha).toLocaleDateString('pt-BR')
                : (usuario.validade_carteirinha || 'Não informada');

            if (dados.foto_perfil) {
                document.getElementById('fotoAluno').src = dados.foto_perfil;
                usuario.foto_perfil = dados.foto_perfil;
                localStorage.setItem('usuario', JSON.stringify(usuario));
            }

            // Gerar QR Code
            const qrcodeContainer = document.getElementById('qrcode');
            qrcodeContainer.innerHTML = ''; // Limpa conteúdo anterior

            new QRCode(qrcodeContainer, {
                text: JSON.stringify({
                    id: usuario.id,
                    nome: dados.nome || usuario.nome,
                    matricula: dados.matricula || usuario.matricula
                }),
                width: 130,
                height: 130,
                colorDark: "#ffffff",
                colorLight: "#18181b"
            });
        }
    } catch (err) {
        console.error("Erro ao carregar carteirinha:", err);
        // Utiliza os dados locais de fallback em caso de erro de conexão
        document.getElementById('nome').innerText = usuario.nome || '-';
        document.getElementById('matricula').innerText = usuario.matricula || '-';
        document.getElementById('curso').innerText = usuario.curso || 'Não informado';
        document.getElementById('instituicao').innerText = usuario.universidade || 'Não informada';
        document.getElementById('turno').innerText = usuario.turno || 'Não informado';
        document.getElementById('validade').innerText = usuario.validade_carteirinha || 'Não informada';
    }
}

/* ==================================
   ALTERAR FOTO DE PERFIL
================================== */
async function alterarFotoPerfil(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    // Validação opcional de tamanho (limite de 2MB para evitar estouro no Base64)
    if (arquivo.size > 2 * 1024 * 1024) {
        alert('A imagem é muito grande. Escolha uma imagem de até 2MB.');
        return;
    }

    const leitor = new FileReader();
    leitor.onload = async function (e) {
        const base64Imagem = e.target.result;

        // Pré-visualização instantânea na tela
        const imgAluno = document.getElementById('fotoAluno');
        if (imgAluno) imgAluno.src = base64Imagem;

        try {
            // Envia para o backend salvar no banco
            const resposta = await fetch(`http://localhost:3000/usuarios/${usuario.id}/foto`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ foto_perfil: base64Imagem })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(dados.erro || 'Erro ao salvar a foto.');
            }

            // Atualiza o objeto no LocalStorage
            usuario.foto_perfil = base64Imagem;
            localStorage.setItem('usuario', JSON.stringify(usuario));

            alert('Foto de perfil atualizada com sucesso!');

        } catch (err) {
            console.error('Erro ao enviar foto:', err);
            alert('Não foi possível salvar a foto no servidor.');
        }
    };

    leitor.readAsDataURL(arquivo);
}

/* ==================================
   AÇÕES DO PERFIL (EDITAR E SALVAR)
================================== */
function editarPerfil() {
    document.getElementById('editNome').value = usuario.nome || '';
    document.getElementById('editEmail').value = usuario.email || '';
    document.getElementById('editCpf').value = usuario.cpf || '';
    document.getElementById('editNascimento').value = usuario.data_nascimento || '';
    document.getElementById('editMatricula').value = usuario.matricula || '';
    document.getElementById('editUniversidade').value = usuario.universidade || '';
    document.getElementById('editCurso').value = usuario.curso || '';
    document.getElementById('editTurno').value = usuario.turno || '';
    document.getElementById('editValidade').value = usuario.validade_carteirinha || '';

    new bootstrap.Modal(document.getElementById('modalPerfil')).show();
}

async function salvarPerfil() {
    const novosDados = {
        nome: document.getElementById('editNome').value,
        email: document.getElementById('editEmail').value,
        cpf: document.getElementById('editCpf').value,
        data_nascimento: document.getElementById('editNascimento').value,
        matricula: document.getElementById('editMatricula').value,
        universidade: document.getElementById('editUniversidade').value,
        curso: document.getElementById('editCurso').value,
        turno: document.getElementById('editTurno').value,
        validade_carteirinha: document.getElementById('editValidade').value,
    };

    try {
        const resposta = await fetch(`http://localhost:3000/usuarios/${usuario.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novosDados)
        });

        const dados = await resposta.json();
        alert(dados.mensagem || 'Perfil atualizado com sucesso!');

        // Atualiza LocalStorage e Recarrega
        Object.assign(usuario, novosDados);
        localStorage.setItem('usuario', JSON.stringify(usuario));
        location.reload();
    } catch (err) {
        console.error("Erro ao salvar perfil:", err);
        alert("Ocorreu um erro ao atualizar o perfil.");
    }
}

function alterarSenha() {
    new bootstrap.Modal(document.getElementById('modalSenha')).show();
}

async function salvarSenha() {
    const senhaAtual = document.getElementById('senhaAtual').value;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    if (!senhaAtual || !novaSenha) {
        alert('Preencha todos os campos.');
        return;
    }

    if (novaSenha !== confirmarSenha) {
        alert('As senhas não coincidem.');
        return;
    }

    try {
        const resposta = await fetch('http://localhost:3000/usuarios/alterar-senha', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: usuario.id,
                senhaAtual,
                novaSenha
            })
        });

        const dados = await resposta.json();
        alert(dados.mensagem || dados.erro);

        if (!dados.erro) {
            location.reload();
        }
    } catch (err) {
        console.error("Erro ao alterar senha:", err);
        alert("Erro ao alterar senha. Verifique o servidor.");
    }
}

async function alterarTema() {
    const novoTema = document.getElementById('temaSelect').value;

    document.documentElement.setAttribute('data-theme', novoTema);
    usuario.tema = novoTema;

    if (typeof aplicarTema === 'function') {
        aplicarTema(novoTema);
    }

    localStorage.setItem('usuario', JSON.stringify(usuario));
    localStorage.setItem('tema', novoTema);

    try {
        await fetch(`http://localhost:3000/usuarios/${usuario.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: usuario.nome,
                email: usuario.email,
                tema: novoTema
            })
        });
    } catch (err) {
        console.log("Erro ao salvar preferências de tema no backend:", err);
    }
}