// Alternar visibilidade da senha por ID do campo
function toggleSenha(idCampo) {
    const campo = document.getElementById(idCampo);
    if (campo) {
        campo.type = campo.type === 'password' ? 'text' : 'password';
    }
}

// Ação de Login (Suporta E-mail ou Matrícula)
async function entrar() {
    const login = document.getElementById('loginIdentificador').value.trim();
    const senha = document.getElementById('senha').value;

    if (!login || !senha) {
        alert('Preencha seu e-mail/matrícula e senha.');
        return;
    }

    const botao = document.getElementById('btnLogin');
    botao.disabled = true;
    botao.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Entrando...';

    try {
        const resposta = await fetch('http://localhost:3000/usuarios/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                login, // Aceita tanto e-mail quanto matrícula
                email: login, // Fallback para compatibilidade com a rota antiga
                senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || dados.erro) {
            alert(dados.erro || 'Falha ao efetuar login.');
            botao.disabled = false;
            botao.innerHTML = 'Entrar';
            return;
        }

        localStorage.setItem('usuario', JSON.stringify(dados));

        if (dados.tema) {
            localStorage.setItem('tema', dados.tema);
        }

        window.location.href = 'dashboard.html';

    } catch (err) {
        console.error('Erro no login:', err);
        alert('Não foi possível conectar ao servidor.');
        botao.disabled = false;
        botao.innerHTML = 'Entrar';
    }
}

// Cadastrar usuário direto do Modal
async function cadastrarUsuarioModal(event) {
    event.preventDefault();

    const btnSalvar = document.getElementById('btnSalvarCadastro');
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Salvando...';

    const novoUsuario = {
        nome: document.getElementById('cadNome').value,
        email: document.getElementById('cadEmail').value,
        matricula: document.getElementById('cadMatricula').value,
        senha: document.getElementById('cadSenha').value,
        tipo: document.getElementById('cadTipo').value, // <--- ADICIONADO: Envia ALUNO ou PROFESSOR
        universidade: document.getElementById('cadUniversidade').value,
        curso: document.getElementById('cadCurso').value,
        turno: document.getElementById('cadTurno').value
    };

    try {
        const resposta = await fetch('http://localhost:3000/usuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novoUsuario)
        });

        const dados = await resposta.json();

        if (!resposta.ok || dados.erro) {
            alert(dados.erro || 'Erro ao realizar o cadastro.');
            btnSalvar.disabled = false;
            btnSalvar.innerText = 'Cadastrar';
            return;
        }

        alert('Cadastro realizado com sucesso! Faça login para continuar.');

        // Fecha o Modal e limpa os campos
        const modalElement = document.getElementById('modalCadastro');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        document.getElementById('formCadastroModal').reset();

        // Preenche automaticamente o identificador
        document.getElementById('loginIdentificador').value = novoUsuario.email;

    } catch (err) {
        console.error('Erro no cadastro:', err);
        alert('Erro ao conectar com o servidor para cadastro.');
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerText = 'Cadastrar';
    }
}

// Solicitação de Recuperação de Senha
async function solicitarRecuperacaoSenha(event) {
    event.preventDefault();
    const identificador = document.getElementById('recuperarIdentificador').value.trim();

    if (!identificador) {
        alert('Informe seu e-mail ou matrícula.');
        return;
    }

    try {
        const resposta = await fetch('http://localhost:3000/usuarios/recuperar-senha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identificador })
        });

        const dados = await resposta.json();

        alert(dados.mensagem || 'Se o cadastro existir, você receberá as instruções para redefinir a senha.');

        const modalElement = document.getElementById('modalRecuperarSenha');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

    } catch (err) {
        // Exibe mensagem positiva padrão por segurança caso a rota backend ainda não exista
        alert('Solicitação recebida. Caso o e-mail/matrícula esteja registrado, os passos de redefinição serão encaminhados.');
        const modalElement = document.getElementById('modalRecuperarSenha');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();
    }
}