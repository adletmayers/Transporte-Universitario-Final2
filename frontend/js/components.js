/* ==========================================================================
   CARREGAMENTO E GERENCIAMENTO DINÂMICO DA NAVBAR
   ========================================================================== */

async function carregarNavbar() {
    const emAdmin = window.location.pathname.includes('/admin/');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    // Verificação de Autenticação
    if (!usuario) {
        alert('Sessão expirada. Faça login novamente.');
        window.location.href = emAdmin ? '../index.html' : 'index.html';
        return;
    }

    const caminhoNavbar = emAdmin ? '../navbar.html' : 'navbar.html';

    try {
        const response = await fetch(caminhoNavbar);

        if (!response.ok) {
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }

        const html = await response.text();
        const container = document.getElementById('navbar-container');

        if (container) {
            container.innerHTML = html;
        }

        // 1. Ajusta caminhos para páginas dentro da pasta /admin
        if (emAdmin) {
            corrigirCaminhosAdmin();
        }

        // 2. Trata falha de carregamento da Logo (Fallback)
        const logo = document.querySelector('.nav-logo');
        if (logo) {
            logo.onerror = function () {
                this.style.display = 'none';
            };
        }

        // 3. Exibe o primeiro nome do usuário no menu "Minha Conta"
        const nomeUsuarioNav = document.getElementById('nomeUsuarioNav');
        if (nomeUsuarioNav && usuario.nome) {
            const primeiroNome = usuario.nome.trim().split(' ')[0];
            nomeUsuarioNav.innerText = primeiroNome;
        }

        // 3.1. Exibe a foto de perfil do usuário na navbar (se houver)
        const fotoNav = document.getElementById('fotoNav');
        if (fotoNav && usuario.foto_perfil) {
            fotoNav.src = usuario.foto_perfil;
        }

        // 4. Exibe o menu administrativo se o usuário for ADMIN
        const menuAdmin = document.getElementById('menuAdmin');
        if (menuAdmin) {
            menuAdmin.style.display = (usuario.tipo === 'ADMIN') ? 'block' : 'none';
        }

        // 5. Destaca a página atual no menu
        destacarLinkAtivo();

        // 6. Sincroniza o tema atual com a navbar recém-injetada
        const temaSalvo = localStorage.getItem('tema') || usuario.tema || 'dark';
        if (typeof window.aplicarTema === 'function') {
            window.aplicarTema(temaSalvo);
        }

        // 7. Garante o clique no botão de trocar tema sem duplicação de eventos
        const btnTrocarTema = document.getElementById('btnTrocarTema');
        if (btnTrocarTema) {
            btnTrocarTema.removeAttribute('onclick');
            btnTrocarTema.onclick = (e) => {
                e.preventDefault();
                if (typeof window.alternarTemaNavbar === 'function') {
                    window.alternarTemaNavbar();
                }
            };
        }

        // 8. Carrega os avisos dinâmicos do backend para o sininho
        carregarAvisosNavbar();

    } catch (erro) {
        console.error('Erro ao carregar a navbar:', erro);
    }
}

/* ==========================================================================
   SISTEMA DE AVISOS DA NAVBAR
   ========================================================================== */

async function carregarAvisosNavbar() {
    const container = document.getElementById('listaAvisosModal');
    const badge = document.getElementById('badgeAvisosNaoLidos');

    try {
        const resposta = await fetch('http://localhost:3000/avisos');
        if (!resposta.ok) throw new Error('Falha ao buscar avisos');

        const avisos = await resposta.json();

        if (!avisos || avisos.length === 0) {
            if (container) container.innerHTML = '<p class="text-center text-secondary my-3">Nenhum aviso registrado no momento.</p>';
            if (badge) badge.classList.add('d-none');
            return;
        }

        // Atualiza a badge vermelha com a quantidade de avisos
        if (badge) {
            badge.innerText = avisos.length;
            badge.classList.remove('d-none');
        }

        // Injeta os avisos cadastrados pelos administradores no modal
        if (container) {
            container.innerHTML = avisos.map(aviso => `
                <div class="card mb-3 bg-dark border-secondary">
                    <div class="card-body p-3 text-light">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge ${aviso.prioridade === 'ALTA' ? 'bg-danger' : 'bg-warning text-dark'}">
                                ${aviso.tipo || 'COMUNICADO'}
                            </span>
                            <small class="text-secondary">${new Date(aviso.created_at || Date.now()).toLocaleDateString('pt-BR')}</small>
                        </div>
                        <h6 class="fw-bold mb-1">${aviso.titulo}</h6>
                        <p class="small text-secondary mb-0">${aviso.mensagem}</p>
                    </div>
                </div>
            `).join('');
        }

    } catch (err) {
        console.error('Erro ao carregar avisos:', err);
        if (container) {
            container.innerHTML = '<p class="text-center text-secondary my-3">Não foi possível conectar ao servidor de avisos.</p>';
        }
    }
}

/* ==========================================================================
   FUNÇÕES AUXILIARES DA NAVBAR
   ========================================================================== */

// Corrige HREFs e SRCs quando a página acessada está dentro da subpasta /admin/
function corrigirCaminhosAdmin() {
    document.querySelectorAll('#navbar-container a[href]').forEach(link => {
        const href = link.getAttribute('href');

        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('javascript:')) {
            if (href.startsWith('admin/')) {
                link.setAttribute('href', href.replace('admin/', './'));
            } else if (!href.startsWith('../')) {
                link.setAttribute('href', '../' + href);
            }
        }
    });

    document.querySelectorAll('#navbar-container img[src]').forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http') && !src.startsWith('../')) {
            img.setAttribute('src', '../' + src);
        }
    });
}

// Adiciona a classe 'active' ao link da página atual na Navbar
function destacarLinkAtivo() {
    const paginaAtual = window.location.pathname.split('/').pop() || 'dashboard.html';
    const links = document.querySelectorAll('#navbar-container .nav-link, #navbar-container .dropdown-item');

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.endsWith(paginaAtual)) {
            link.classList.add('active', 'fw-bold');
        }
    });
}

// Função para encerrar a sessão do usuário
function sair() {
    localStorage.removeItem('usuario');
    const emAdmin = window.location.pathname.includes('/admin/');
    window.location.href = emAdmin ? '../index.html' : 'index.html';
}

// Expõe as funções globalmente para o escopo window
window.sair = sair;
window.carregarNavbar = carregarNavbar;
window.carregarAvisosNavbar = carregarAvisosNavbar;

// Executa o carregamento da Navbar assim que o DOM estiver pronto
document.addEventListener('DOMContentLoaded', carregarNavbar);