const centroPadrao = [-1.4705, -48.4576]; // Belém / Guamá
let mapaInstancia = null;
let marcadorOnibus = null;

document.addEventListener('DOMContentLoaded', () => {
    inicializarMapaFrota();
    atualizarLocalizacao();
    setInterval(atualizarLocalizacao, 5000);
});

function inicializarMapaFrota() {
    mapaInstancia = L.map('map', { zoomControl: true }).setView(centroPadrao, 14);

    // Tile Layer Escuro da Esri (Gratuito, sem necessidade de API Key)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
    }).addTo(mapaInstancia);

    // Marcador do Ônibus
    marcadorOnibus = L.marker(centroPadrao).addTo(mapaInstancia)
        .bindPopup('<strong>Ônibus: ABC-1D23</strong><br>Linha A - Campus Central');
}

async function atualizarLocalizacao() {
    try {
        const resposta = await fetch('http://localhost:3000/localizacao/1');
        if (!resposta.ok) throw new Error('Falha na API');

        const dados = await resposta.json();

        if (dados.latitude && dados.longitude) {
            const novaPos = [parseFloat(dados.latitude), parseFloat(dados.longitude)];

            marcadorOnibus.setLatLng(novaPos);
            mapaInstancia.panTo(novaPos);

            document.getElementById('status').className = 'badge bg-success px-3 py-2';
            document.getElementById('status').innerText = '🟢 Ônibus em movimento';
            document.getElementById('coordenadas').innerText = `${dados.latitude}, ${dados.longitude}`;
        }
    } catch (err) {
        console.warn('Servidor offline. Usando dados estáticos de teste.');
        document.getElementById('status').className = 'badge bg-warning text-dark px-3 py-2';
        document.getElementById('status').innerText = '⚠️ Conexão Local (Simulação)';
        document.getElementById('coordenadas').innerText = `${centroPadrao[0]}, ${centroPadrao[1]}`;
    }
}

function recentrarMapa() {
    if (mapaInstancia) {
        mapaInstancia.setView(centroPadrao, 14);
    }
}