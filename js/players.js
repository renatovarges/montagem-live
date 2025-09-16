// CSV parsing + state de jogadores por posição
const STATE = {
  players: [],        // todos (do CSV)
  selected: { TEC:[], GOL:[], ZAG:[], LAT:[], MEI:[], ATA:[] } // para a barra inferior
};

// Mapeamento de nomes de clubes do CSV para slugs dos uniformes
const CLUB_MAPPING = {
  'Atlético-MG': 'atletico-mg',
  'Bahia': 'bahia',
  'Botafogo': 'botafogo',
  'Ceará': 'ceara',
  'Corinthians': 'corinthians',
  'Cruzeiro': 'cruzeiro',
  'Flamengo': 'flamengo',
  'Fluminense': 'fluminense',
  'Fortaleza': 'fortaleza',
  'Grêmio': 'gremio',
  'Internacional': 'internacional',
  'Juventude': 'juventude',
  'Mirassol': 'mirassol',
  'Palmeiras': 'palmeiras',
  'Red Bull Bragantino': 'red-bull-bragantino',
  'Bragantino': 'red-bull-bragantino',
  'Santos': 'santos',
  'São Paulo': 'sao-paulo',
  'Sport': 'sport',
  'Vasco': 'vasco',
  'Vitória': 'vitoria'
};

// Mapeamento de posições do CSV para posições do sistema
const POSITION_MAPPING = {
  'Técnico': 'TEC',
  'Goleiro': 'GOL',
  'Zagueiro': 'ZAG',
  'Lateral': 'LAT',
  'Meia': 'MEI',
  'Meio-campo': 'MEI',
  'Atacante': 'ATA'
};

// Função para gerar iniciais dos clubes
function getClubInitials(clubName) {
  const mapping = {
    'Atlético-MG': 'CAM',
    'Bahia': 'BAH',
    'Botafogo': 'BOT',
    'Ceará': 'CEA',
    'Corinthians': 'COR',
    'Cruzeiro': 'CRU',
    'Flamengo': 'FLA',
    'Fluminense': 'FLU',
    'Fortaleza': 'FOR',
    'Grêmio': 'GRE',
    'Internacional': 'INT',
    'Juventude': 'JUV',
    'Mirassol': 'MIR',
    'Palmeiras': 'PAL',
    'Red Bull Bragantino': 'RBB',
    'Bragantino': 'RBB',
    'Santos': 'SAN',
    'São Paulo': 'SAO',
    'Sport': 'SPO',
    'Vasco': 'VAS',
    'Vitória': 'VIT'
  };
  return mapping[clubName] || clubName.substring(0, 3).toUpperCase();
}

// Parser CSV simples (suporta vírgulas e aspas básicas)
function parseCSV(text){
  const rows = [];
  let cur = '', inQ = false, row = [];
  for(let i=0;i<text.length;i++){
    const ch = text[i];
    if(inQ){
      if(ch === '"' && text[i+1] === '"'){ cur+='"'; i++; }
      else if(ch === '"'){ inQ = false; }
      else { cur += ch; }
    } else {
      if(ch === '"'){ inQ = true; }
      else if(ch === ','){ row.push(cur.trim()); cur=''; }
      else if(ch === '\n'){ row.push(cur.trim()); rows.push(row); row=[]; cur=''; }
      else { cur += ch; }
    }
  }
  if(cur.length || row.length) { row.push(cur.trim()); rows.push(row); }
  const header = rows.shift().map(h=>h.toLowerCase());
  return rows.map(r => Object.fromEntries(header.map((h,idx)=>[h, r[idx]||''])));
}

function loadCSVFile(file, cb){
  const reader = new FileReader();
  reader.onload = () => {
    const data = parseCSV(reader.result);
    const processedData = processPlayersData(data);
    cb(processedData);
  };
  reader.readAsText(file, 'utf-8');
}

// Processa e normaliza dados dos jogadores
function processPlayersData(rawData) {
  return rawData.map(player => {
    // Normalizar nome do clube
    const clubName = player.time || player.clube || player['time'] || '';
    const normalizedClub = CLUB_MAPPING[clubName] || normalizeClub(clubName);
    
    // Normalizar posição
    const position = player.posição || player.posicao || player['posição'] || '';
    const normalizedPosition = POSITION_MAPPING[position] || position.toUpperCase();
    
    return {
      nome: player.jogador || player.nome || player['jogador'] || '',
      clube: clubName,
      clubeSlug: normalizedClub,
      posicao: normalizedPosition,
      preco: player['preço (c$)'] || player.preco || player['preço'] || '0',
      media: player['média (pts)'] || player.media || player['média'] || '0',
      variacao: player['variação última (c$)'] || player.variacao || '0',
      jogos: player.jogos || player['jogos'] || '0'
    };
  }).filter(player => player.nome && player.clube); // Remove entradas vazias
}

// Função para buscar dados da API do Cartola
async function fetchCartolaAPI() {
  try {
    // Verificar status do mercado primeiro (com timeout de 5 segundos)
    const statusController = new AbortController();
    const statusTimeout = setTimeout(() => statusController.abort(), 5000);
    
    // Usar a função Netlify como proxy para evitar problemas de CORS
    const statusResponse = await fetch('/api/cartola/mercado/status', {
      signal: statusController.signal
    });
    clearTimeout(statusTimeout);
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      lastUpdateTime = new Date(); // Definir o tempo antes de atualizar o status
      updateMarketStatus(statusData);
      
      if (statusData.status_mercado !== 1) {
        console.log('Mercado fechado - usando dados em cache');
        // Ainda tenta buscar os dados mesmo com mercado fechado
      }
    }
    
    // Buscar dados dos atletas (com timeout de 10 segundos)
    const dataController = new AbortController();
    const dataTimeout = setTimeout(() => dataController.abort(), 10000);
    
    // Usar a função Netlify como proxy para evitar problemas de CORS
    const response = await fetch('/api/cartola/atletas/mercado', {
      signal: dataController.signal
    });
    clearTimeout(dataTimeout);
    
    if (!response.ok) throw new Error('Erro ao buscar dados da API');
    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('Timeout na API do Cartola (muito lenta), usando CSV como fallback');
    } else {
      console.warn('Erro ao buscar API do Cartola, usando CSV como fallback:', error);
    }
    return null;
  }
}

function updateMarketStatus(statusData) {
  const updateElement = document.getElementById('last-update');
  if (updateElement && statusData) {
    // A API retorna status_mercado: 1 (aberto) ou 2 (fechado)
    const isMarketOpen = statusData.status_mercado === 1;
    const marketStatus = isMarketOpen ? '🟢 Mercado Aberto' : '🔴 Mercado Fechado';
    const timeString = lastUpdateTime ? lastUpdateTime.toLocaleTimeString('pt-BR') : '';
    updateElement.innerHTML = `${marketStatus}<br><small>Última atualização: ${timeString}</small>`;
  }
}

// Mapeamento de IDs dos clubes da API para slugs locais
const API_CLUB_MAPPING = {
  262: 'flamengo',
  263: 'botafogo', 
  264: 'corinthians',
  265: 'bahia',
  266: 'fluminense',
  267: 'vasco',
  275: 'palmeiras',
  276: 'sao-paulo',
  277: 'santos',
  285: 'atletico-mg',
  293: 'gremio',
  294: 'internacional',
  356: 'fortaleza',
  373: 'cruzeiro',
  1371: 'juventude',
  1372: 'ceara',
  1373: 'sport',
  1376: 'vitoria',
  1377: 'red-bull-bragantino',
  2305: 'mirassol'
};

// Mapeamento de posições da API
const API_POSITION_MAPPING = {
  1: 'GOL', // Goleiro
  2: 'LAT', // Lateral
  3: 'ZAG', // Zagueiro
  4: 'MEI', // Meia
  5: 'ATA', // Atacante
  6: 'TEC'  // Técnico
};

// Função para processar dados da API do Cartola
function processCartolaData(apiData) {
  if (!apiData || !apiData.atletas) return [];
  
  const players = [];
  
  Object.values(apiData.atletas).forEach(atleta => {
    const clubeId = atleta.clube_id;
    const clubeSlug = API_CLUB_MAPPING[clubeId];
    
    if (clubeSlug && apiData.clubes[clubeId]) {
      const clube = apiData.clubes[clubeId];
      const posicao = API_POSITION_MAPPING[atleta.posicao_id] || 'MEI';
      
      players.push({
        nome: atleta.apelido || atleta.nome,
        clube: clube.nome_fantasia || clube.nome,
        clubeSlug: clubeSlug,
        posicao: posicao,
        preco: atleta.preco_num.toFixed(2), // Preço já vem em reais
        media: atleta.media_num ? atleta.media_num.toFixed(2) : '0.00',
        variacao: atleta.variacao_num ? (atleta.variacao_num / 100).toFixed(2) : '0.00',
        jogos: atleta.jogos_num || 0,
        status: atleta.status_id,
        foto: atleta.foto
      });
    }
  });
  
  return players;
}

// Variável para controlar o intervalo de atualização
let updateInterval = null;
let lastUpdateTime = null;

// Carrega dados automaticamente (API primeiro, CSV como fallback)
async function autoLoadData() {
  await loadData();
  
  // Iniciar atualização automática a cada 5 minutos
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  updateInterval = setInterval(async () => {
    console.log('Atualizando dados automaticamente...');
    await loadData();
  }, 30 * 60 * 1000); // 30 minutos
}

async function loadData() {
  // Atualizar status para "carregando"
  const updateElement = document.getElementById('last-update');
  if (updateElement) {
    updateElement.innerHTML = '🔄 Carregando dados...';
  }
  
  try {
    console.log('Tentando carregar dados da API do Cartola...');
    if (updateElement) {
      updateElement.innerHTML = '🔄 Conectando à API do Cartola...';
    }
    
    const apiData = await fetchCartolaAPI();
    
    if (apiData && apiData.atletas) {
      console.log('Dados da API carregados com sucesso!');
      if (updateElement) {
        updateElement.innerHTML = '🔄 Processando dados...';
      }
      
      const processedData = processCartolaData(apiData);
      STATE.players = processedData;
      lastUpdateTime = new Date();
      console.log(`${processedData.length} jogadores carregados da API`);
      
      // Restaurar o status do mercado após processamento
      if (updateElement) {
        // Buscar novamente o status para restaurar as bolinhas
        try {
          const statusResponse = await fetch('/api/cartola/mercado/status');
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            updateMarketStatus(statusData);
          }
        } catch (error) {
          // Se falhar, mostrar apenas o horário
          const timeString = lastUpdateTime.toLocaleTimeString('pt-BR');
          updateElement.innerHTML = `<small>Última atualização: ${timeString}</small>`;
        }
      }
      
      // Disparar evento personalizado para notificar que os dados foram carregados
      window.dispatchEvent(new CustomEvent('playersLoaded', { detail: processedData }));
      return;
    }
  } catch (error) {
    console.warn('Erro ao carregar API do Cartola:', error);
  }
  
  // Fallback para CSV se a API falhar
  console.log('Carregando dados do CSV como fallback...');
  if (updateElement) {
    updateElement.innerHTML = '🔄 Carregando dados locais...';
  }
  
  try {
    const response = await fetch('./cartola_jogadores_time_posicao_preco.csv');
    const text = await response.text();
    const rawData = parseCSV(text);
    const processedData = processPlayersData(rawData);
    STATE.players = processedData;
    lastUpdateTime = new Date();
    
    // Quando usar CSV, mostrar status de dados locais
    if (updateElement) {
      const timeString = lastUpdateTime.toLocaleTimeString('pt-BR');
      updateElement.innerHTML = `📁 Dados Locais (CSV)<br><small>Última atualização: ${timeString}</small>`;
    }
    
    console.log(`${processedData.length} jogadores carregados do CSV`);
    
    // Disparar evento personalizado para notificar que os dados foram carregados
    window.dispatchEvent(new CustomEvent('playersLoaded', { detail: processedData }));
  } catch (error) {
    console.error('Erro ao carregar CSV:', error);
  }
}

function updateLastUpdateDisplay() {
  const updateElement = document.getElementById('last-update');
  if (updateElement && lastUpdateTime) {
    const timeString = lastUpdateTime.toLocaleTimeString('pt-BR');
    // Se não temos status do mercado, mostrar apenas a hora
    if (!updateElement.innerHTML.includes('Mercado')) {
      updateElement.innerHTML = `<small>Última atualização: ${timeString}</small>`;
    } else {
      // Atualizar apenas a parte do tempo, mantendo o status do mercado
      const currentHTML = updateElement.innerHTML;
      const updatedHTML = currentHTML.replace(/Última atualização: .*<\/small>/, `Última atualização: ${timeString}</small>`);
      updateElement.innerHTML = updatedHTML;
    }
  }
}

function forceUpdate() {
  console.log('Forçando atualização manual...');
  loadData();
}

function addSelected(pos, player){
  const list = STATE.selected[pos];
  if(!list.some(p=>p.nome===player.nome && p.clube===player.clube)){
    list.push(player);
    renderSelected(pos);
  }
}

function removeSelected(pos, player){
  const list = STATE.selected[pos];
  const idx = list.findIndex(p => p.nome === player.nome && p.clube === player.clube);
  if(idx >= 0) {
    list.splice(idx, 1);
    renderSelected(pos);
  }
}

function getSelected(pos){
  return STATE.selected[pos] || [];
}

function renderSelected(pos){
  const row = document.getElementById('selectedRow');
  row.innerHTML='';
  STATE.selected[pos].forEach((p,idx)=>{
    const slug = normalizeClub(p.clube);
    const card = document.createElement('div');
    card.className = 'card';
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.style.position = 'relative';
    const img = document.createElement('img');
    img.src = kitPath(slug);
    img.onerror = () => { img.onerror = null; img.src = shieldPath(slug); };
    img.alt = p.clube;
    chip.appendChild(img);
    
    // Iniciais removidas conforme solicitado
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `
      <div class="nm">${p.nome}</div>
      <div class="sb">${p.clube} • ${p.posicao}</div>
    `;
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-mini';
    addBtn.textContent = 'Arrastar';
    // torna arrastável pro campo/reservas
    DND.makeDraggable(card, {type:'player', name:p.nome, club:p.clube, slug, source:'selected'});
    // remover na barra
    const x = document.createElement('button');
    x.className = 'btn-mini';
    x.textContent = '×';
    x.title = 'Remover';
    x.onclick = (e)=> {
      e.stopPropagation(); // Impedir que o evento se propague e feche o painel
      removeSelected(pos, p);
    };
    const wrap = document.createElement('div');
    wrap.style.display='flex'; wrap.style.gap='8px'; wrap.style.alignItems='center';
    wrap.appendChild(addBtn); wrap.appendChild(x);
    card.appendChild(chip); card.appendChild(meta); card.appendChild(wrap);
    row.appendChild(card);
  });
}

function searchPlayers(pos, q){
  const needle = (q||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return STATE.players.filter(p => {
    // Se posição específica for solicitada, filtrar por ela
    if (pos && pos !== 'ALL') {
      return p.posicao === pos;
    }
    // Se for 'ALL' ou vazio, retornar todos exceto técnicos (para reservas)
    return p.posicao !== 'TEC';
  }).filter(p => {
    if (!needle) return true;
    const playerText = `${p.nome} ${p.clube}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return playerText.includes(needle);
  }).sort((a, b) => {
    // Ordenar por média de pontos (decrescente) e depois por nome
    const mediaA = parseFloat(a.media) || 0;
    const mediaB = parseFloat(b.media) || 0;
    if (mediaA !== mediaB) return mediaB - mediaA;
    return a.nome.localeCompare(b.nome);
  });
}

// Função para obter jogadores por clube
function getPlayersByClub(clubSlug) {
  return STATE.players.filter(p => p.clubeSlug === clubSlug);
}

// Função para obter estatísticas dos jogadores
function getPlayerStats(playerName, clubName) {
  const player = STATE.players.find(p => 
    p.nome === playerName && p.clube === clubName
  );
  return player ? {
    preco: player.preco,
    media: player.media,
    variacao: player.variacao,
    jogos: player.jogos
  } : null;
}

// Inicializar carregamento automático dos dados
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoLoadData);
} else {
  autoLoadData();
}

window.PLAYERS_API = { 
  loadCSVFile, 
  parseCSV, 
  addSelected, 
  removeSelected,
  getSelected,
  renderSelected, 
  searchPlayers, 
  getPlayersByClub,
  getPlayerStats,
  processPlayersData,
  autoLoadData,
  loadData,
  forceUpdate,
  updateLastUpdateDisplay,
  updateMarketStatus,
  fetchCartolaAPI,
  processCartolaData,
  getClubInitials,
  STATE,
  CLUB_MAPPING,
  POSITION_MAPPING,
  API_CLUB_MAPPING,
  API_POSITION_MAPPING
};
