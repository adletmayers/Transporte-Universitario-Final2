/* ==========================================================================
   GERENCIAMENTO DE TEMA (DARK / LIGHT MODE)
   ========================================================================== */

function aplicarTema(tema) {
    const temaFinal = (tema === 'light') ? 'light' : 'dark';

    // 1. Aplica o tema de forma limpa no <body> e atributos do Bootstrap
    if (document.body) {
        document.body.classList.remove('light-mode', 'dark-mode');
        if (temaFinal === 'light') {
            document.body.classList.add('light-mode');
        }
        // Se for 'dark', não precisa de classe extra pois o padrão do body já é escuro
    }
    
    document.documentElement.setAttribute('data-bs-theme', temaFinal);
    document.documentElement.setAttribute('data-theme', temaFinal);

    // 2. Atualiza os dados no LocalStorage de forma segura
    try {
        const usuario = JSON.parse(localStorage.getItem('usuario')) || {};
        usuario.tema = temaFinal;
        localStorage.setItem('usuario', JSON.stringify(usuario));
    } catch (e) {
        console.error('Erro ao guardar utilizador no localStorage:', e);
    }
    localStorage.setItem('tema', temaFinal);

    // 3. Atualiza o <select id="temaSelect"> (Perfil) se existir
    const selectTema = document.getElementById('temaSelect');
    if (selectTema) {
        selectTema.value = temaFinal;
    }

    // 4. Atualiza o ícone (Sol no modo claro / Lua no modo escuro)
    const iconeTemaNav = document.getElementById('iconeTemaNav');
    if (iconeTemaNav) {
        iconeTemaNav.className = (temaFinal === 'light')
            ? 'bi bi-sun-fill fs-5 text-warning'          // Modo Claro -> Mostra o SOL
            : 'bi bi-moon-stars-fill fs-5 text-warning';  // Modo Escuro -> Mostra a LUA
    }
}

function alternarTemaNavbar() {
    let temaAtual = localStorage.getItem('tema');

    if (!temaAtual) {
        try {
            const usuario = JSON.parse(localStorage.getItem('usuario'));
            if (usuario && usuario.tema) temaAtual = usuario.tema;
        } catch (e) {}
    }

    const novoTema = (temaAtual === 'light') ? 'dark' : 'light';

    aplicarTema(novoTema);
    salvarTemaNoServidor(novoTema);
}

async function salvarTemaNoServidor(novoTema) {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuario'));
        if (!usuario || !usuario.id) return;

        await fetch(`http://localhost:3000/usuarios/${usuario.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tema: novoTema })
        });
    } catch (err) {
        console.warn('Não foi possível guardar o tema no servidor:', err);
    }
}

// Expõe as funções no escopo global (window)
window.aplicarTema = aplicarTema;
window.alternarTemaNavbar = alternarTemaNavbar;

// Inicializa o tema assim que o DOM estiver pronto
function inicializarTema() {
    let temaSalvo = localStorage.getItem('tema');
    if (!temaSalvo) {
        try {
            const usuario = JSON.parse(localStorage.getItem('usuario'));
            temaSalvo = usuario?.tema;
        } catch (e) {}
    }
    aplicarTema(temaSalvo || 'dark');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarTema);
} else {
    inicializarTema();
}