// App bootstrap
console.log('App.js carregado - iniciando execução');
(function(){
  // Wait for DND to be available
  function initializeApp() {
    console.log('initializeApp chamada');
    if (typeof window.DND === 'undefined' || typeof window.DND.makeDraggable !== 'function') {
      setTimeout(initializeApp, 10);
      return;
    }
    

    
    // Cabeçalho - montar escudos
    const bar = document.getElementById('teamsBar');
    let pills = bar.querySelectorAll('.team-pill');
    if(pills.length === 0 && window.CLUBS){
      window.CLUBS.forEach(c => {
        const pill = document.createElement('button');
        pill.className = 'team-pill';
        pill.title = c.name;
        pill.setAttribute('aria-label', c.name);
        pill.dataset.slug = c.slug;
        const img = document.createElement('img');
        img.src = shieldPath(c.slug);
        img.alt = c.name;
        pill.appendChild(img);
        bar.appendChild(pill);
      });
      pills = bar.querySelectorAll('.team-pill');
    }

    pills.forEach(pill => {
      const slug = pill.dataset.slug;
      const name = pill.getAttribute('aria-label') || pill.title || slug;
      DND.makeDraggable(pill, {type:'club', name, slug, source:'header'});
    });

    // Dropzones: caixas de estratégia
    document.querySelectorAll('.analysis-rectangle').forEach(box => {
      DND.setupDropzone(box, (data)=>{
      if(!data) return;
      // cria chip centralizado e simétrico
      const chip = document.createElement('div');
      chip.className = 'chip';
      const img = document.createElement('img');
      if(data.type==='club') img.src = shieldPath(data.slug);
      else img.src = shieldPath(normalizeClub(data.club || data.name));
      chip.appendChild(img);
      const x = document.createElement('button');
      x.className = 'remove';
      x.textContent = '×';
      x.title = 'Remover';
      x.onclick = ()=> chip.remove();
      chip.appendChild(x);
        // também permitir arrastar do box para o campo (clonar)
        DND.makeDraggable(chip, data.type==='club' ? data : {type:'player', name:data.name, club:data.club, slug:data.slug});
        box.appendChild(chip);
      });
    });
  // Campo: drop livre e itens posicionáveis
    const field = document.getElementById('field');
    DND.setupDropzone(field, (data, ev)=>{
    if(!data) return;
    const rect = field.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    
    // Se for um escudo de time, abrir seleção de jogadores
    if(data.type === 'club') {
      openTeamPlayerSelection(data, x, y);
    } else {
      // Verificar se o jogador já existe no campo para evitar duplicação
      const existingBadge = Array.from(field.querySelectorAll('.badge')).find(badge => {
        return badge.dataset.type === 'player' && 
               badge.querySelector('.name').textContent === data.name;
      });
      
      if(existingBadge) {
        // Se já existe, apenas mover para nova posição
        existingBadge.style.left = x + 'px';
        existingBadge.style.top = y + 'px';
      } else {
        // Se não existe, criar novo
        addBadgeToField(data, x, y);
      }
    }
  });

  // Função para abrir seleção de jogadores do time
  function openTeamPlayerSelection(teamData, x, y) {
    // Primeiro carrega o CSV se ainda não foi carregado
    if(PLAYERS_API.STATE.players.length === 0) {
      // Tenta carregar o CSV automaticamente
      fetch('cartola_jogadores_time_posicao_preco.csv')
        .then(response => response.text())
        .then(csvText => {
          const rows = PLAYERS_API.parseCSV(csvText);
          const mapped = rows.map(r => ({
            nome: r.nome || r.name || '',
            clube: r.clube || r.time || r.clube_time || '',
            posicao: (r.posicao || r.pos || '').toUpperCase(),
            preco: r.preco || r.price || ''
          }));
          PLAYERS_API.STATE.players = mapped;
          showTeamPlayersModal(teamData, x, y);
        })
        .catch(() => {
          alert('Carregue o arquivo CSV primeiro para selecionar jogadores!');
        });
    } else {
      showTeamPlayersModal(teamData, x, y);
    }
  }

  // Modal para mostrar jogadores do time
  function showTeamPlayersModal(teamData, x, y) {
    const teamName = window.SLUG_MAP[teamData.slug] || teamData.name;
    const teamPlayers = PLAYERS_API.STATE.players.filter(p => 
      p.clube.toLowerCase().includes(teamName.toLowerCase()) ||
      teamName.toLowerCase().includes(p.clube.toLowerCase())
    );

    if(teamPlayers.length === 0) {
      alert(`Nenhum jogador encontrado para ${teamName}`);
      return;
    }

    // Criar modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #0d1a14; border: 2px solid #21c35c;
      border-radius: 16px; padding: 20px; max-width: 600px;
      max-height: 80vh; overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = `Selecionar jogador - ${teamName}`;
    title.style.cssText = 'color: #21c35c; margin-bottom: 16px; text-align: center;';

    const playersList = document.createElement('div');
    playersList.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;';

    // Agrupar por posição
     const positions = [
       {name: 'Goleiro', keys: ['GOLEIRO', 'GOL']},
       {name: 'Lateral', keys: ['LATERAL', 'LAT']},
       {name: 'Zagueiro', keys: ['ZAGUEIRO', 'ZAG']},
       {name: 'Meio-campo', keys: ['MEIO-CAMPO', 'MEIA', 'MEI']},
       {name: 'Atacante', keys: ['ATACANTE', 'ATA']},
       {name: 'Técnico', keys: ['TÉCNICO', 'TECNICO', 'TEC']}
     ];
     positions.forEach(pos => {
       const posPlayers = teamPlayers.filter(p => 
         pos.keys.some(key => p.posicao.toUpperCase().includes(key))
       );

      if(posPlayers.length > 0) {
        const posSection = document.createElement('div');
        posSection.style.cssText = 'margin-bottom: 16px;';
        
        const posTitle = document.createElement('h4');
         posTitle.textContent = pos.name;
         posTitle.style.cssText = 'color: #fff; margin-bottom: 8px; font-size: 14px;';
        
        posPlayers.forEach(player => {
          const playerBtn = document.createElement('button');
          playerBtn.textContent = player.nome;
          playerBtn.style.cssText = `
            display: block; width: 100%; padding: 8px 12px;
            background: #104a2f; border: 1px solid #21c35c;
            color: #fff; border-radius: 8px; margin-bottom: 4px;
            cursor: pointer; text-align: left;
          `;
          playerBtn.onmouseover = () => playerBtn.style.background = '#21c35c';
          playerBtn.onmouseout = () => playerBtn.style.background = '#104a2f';
          playerBtn.onclick = () => {
            addBadgeToField({
              type: 'player',
              name: player.nome,
              club: player.clube,
              slug: teamData.slug
            }, x, y);
            modal.remove();
          };
          posSection.appendChild(playerBtn);
        });
        
        posSection.appendChild(posTitle);
        playersList.appendChild(posSection);
      }
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fechar';
    closeBtn.style.cssText = `
      background: #ef4444; border: none; color: #fff;
      padding: 10px 20px; border-radius: 8px; cursor: pointer;
      margin-top: 16px; display: block; margin-left: auto; margin-right: auto;
    `;
    closeBtn.onclick = () => modal.remove();

    content.appendChild(title);
    content.appendChild(playersList);
    content.appendChild(closeBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.onclick = (e) => {
      if(e.target === modal) modal.remove();
    };
  }

  function addBadgeToField(data, x, y){
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.style.left = x + 'px';
    badge.style.top = y + 'px';
    badge.dataset.type = data.type;
    badge.draggable = false; // Desabilitar HTML5 drag para evitar duplicação

    const circle = document.createElement('div');
    circle.className = 'circle';
    const img = document.createElement('img');
    const slug = data.slug || normalizeClub(data.club || data.name);
    
    // Sempre usar uniforme para jogadores
    if(data.type === 'player') {
      img.src = kitPath(slug);
      img.onerror = () => {
        img.src = shieldPath(slug);
      };
    } else {
      img.src = shieldPath(slug);
    }
    
    img.alt = data.name || data.club || 'Item';
    circle.appendChild(img);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = data.type==='player' ? `${data.name}` : data.name;

    const xbtn = document.createElement('button');
    xbtn.className = 'remove';
    xbtn.textContent = '×';
    xbtn.title = 'Remover do campo';
    xbtn.style.opacity = '0'; // Inicialmente invisível
    xbtn.style.position = 'absolute';
    xbtn.style.top = '-8px';
    xbtn.style.right = '-8px';
    xbtn.style.width = '20px';
    xbtn.style.height = '20px';
    xbtn.style.borderRadius = '50%';
    xbtn.style.background = '#ef4444';
    xbtn.style.color = 'white';
    xbtn.style.border = 'none';
    xbtn.style.cursor = 'pointer';
    xbtn.style.fontSize = '12px';
    xbtn.style.display = 'flex';
    xbtn.style.alignItems = 'center';
    xbtn.style.justifyContent = 'center';
    xbtn.style.zIndex = '10';
    xbtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log('Removendo badge:', badge);
      badge.remove();
    });
    
    xbtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    // Mostrar/esconder botão X no hover
    badge.addEventListener('mouseenter', () => {
      xbtn.style.opacity = '1';
    });
    badge.addEventListener('mouseleave', () => {
      xbtn.style.opacity = '0';
    });

    badge.appendChild(circle);
    badge.appendChild(name);
    badge.appendChild(xbtn);
    field.appendChild(badge);

    // Sistema de estrela de unanimidade - clique duplo para adicionar/remover
    let clickTimeout;
    badge.addEventListener('click', (e) => {
      if(e.target === xbtn) return; // Não interferir com o botão de remover
      
      if(clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
        // Clique duplo - toggle estrela
        toggleUnanimityStarOnBadge(badge);
      } else {
        clickTimeout = setTimeout(() => {
          clickTimeout = null;
          // Clique simples - não faz nada por enquanto
        }, 300);
      }
    });

    // Sistema de drag direto com mouse
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    badge.addEventListener('mousedown', (e) => {
      // Não iniciar drag se clicou no botão X
      if (e.target === xbtn) return;
      
      isDragging = true;
      const rect = badge.getBoundingClientRect();
      const fieldRect = field.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left - rect.width/2;
      dragOffset.y = e.clientY - rect.top - rect.height/2;
      
      badge.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const fieldRect = field.getBoundingClientRect();
      const x = e.clientX - fieldRect.left - dragOffset.x;
      const y = e.clientY - fieldRect.top - dragOffset.y;
      
      // Limitar dentro do campo
      const maxX = field.offsetWidth;
      const maxY = field.offsetHeight;
      const clampedX = Math.max(0, Math.min(maxX, x));
      const clampedY = Math.max(0, Math.min(maxY, y));
      
      badge.style.left = clampedX + 'px';
      badge.style.top = clampedY + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        badge.style.cursor = 'grab';
      }
    });
  }

  // Função para adicionar/remover estrela de unanimidade
  function toggleUnanimityStarOnBadge(badge) {
    const existingStar = badge.querySelector('.unanimity-star');
    
    if(existingStar) {
      // Remove a estrela
      existingStar.remove();
    } else {
      // Adiciona a estrela
      const star = document.createElement('div');
      star.className = 'unanimity-star';
      star.innerHTML = '⭐';
      star.style.cssText = `
        position: absolute; top: -8px; left: -8px;
        width: 24px; height: 24px; font-size: 16px;
        display: flex; align-items: center; justify-content: center;
        background: rgba(255,215,0,0.9); border-radius: 50%;
        border: 2px solid #fff; z-index: 10;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      `;
      
      // Botão para remover a estrela
      const removeStarBtn = document.createElement('button');
      removeStarBtn.innerHTML = '×';
      removeStarBtn.style.cssText = `
        position: absolute; top: -6px; right: -6px;
        width: 14px; height: 14px; font-size: 10px;
        background: #ef4444; border: none; color: #fff;
        border-radius: 50%; cursor: pointer; opacity: 0;
        transition: opacity 0.2s; display: flex;
        align-items: center; justify-content: center;
      `;
      removeStarBtn.onclick = (e) => {
        e.stopPropagation();
        star.remove();
      };
      
      star.appendChild(removeStarBtn);
      star.addEventListener('mouseenter', () => removeStarBtn.style.opacity = '1');
      star.addEventListener('mouseleave', () => removeStarBtn.style.opacity = '0');
      
      badge.appendChild(star);
     }
   }

  // Reservas: 6 slots idênticos
  document.querySelectorAll('.reserve-slot').forEach(slot => {
    // Clique no slot vazio abre busca
    slot.addEventListener('click', (e) => {
      if(slot.textContent === '+') {
        openReserveSearch(slot);
      }
    });
    
    DND.setupDropzone(slot, (data)=>{
      if(!data) return;
      fillReserveSlot(slot, data);
    });
  });
  
  function fillReserveSlot(slot, data) {
    slot.innerHTML='';
    const wrap = document.createElement('div');
    wrap.className='slot-item';
    const mini = document.createElement('div');
    mini.className='mini';
    const img = document.createElement('img');
    const slug = data.slug || normalizeClub(data.club || data.name);
    
    // Para jogadores, usar uniforme; para outros, usar escudo
    if(data.type === 'player') {
      img.src = kitPath(slug);
      img.onerror = () => {
        img.src = shieldPath(slug);
      };
    } else {
      img.src = shieldPath(slug);
    }
    
    img.alt = data.name || data.club || 'Item';
    mini.appendChild(img);
    const nm = document.createElement('div');
    nm.className='nm';
    nm.textContent = data.type==='player' ? data.name : (data.name);
    const x = document.createElement('button');
    x.className='remove';
    x.textContent='×';
    x.title='Remover do slot';
    x.onclick = ()=> { slot.innerHTML='+'; };
    wrap.appendChild(mini); wrap.appendChild(nm); slot.appendChild(wrap); slot.appendChild(x);
    
    // Sistema de drag direto implementado abaixo
  }
  
  function openReserveSearch(slot) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Selecionar Jogadores para Reservas</h3>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <input type="text" class="search" placeholder="Buscar jogador..." id="reserveSearch">
          <div class="results-container" id="reserveResults"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const searchInput = modal.querySelector('#reserveSearch');
    const resultsContainer = modal.querySelector('#reserveResults');
    const closeBtn = modal.querySelector('.modal-close');
    
    // Função para encontrar o próximo slot vazio
    function getNextEmptySlot() {
      const allSlots = document.querySelectorAll('.reserve-slot');
      return Array.from(allSlots).find(s => s.textContent === '+');
    }
    
    function renderReserveResults() {
      const query = searchInput.value;
      const players = PLAYERS_API.searchPlayers('ALL', query).filter(p => p.posicao !== 'TEC');
      resultsContainer.innerHTML = '';
      
      players.slice(0, 50).forEach(p => {
        const slug = normalizeClub(p.clube);
        const card = document.createElement('div');
        card.className = 'card';
        
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.style.position = 'relative';
        const uniformImg = document.createElement('img');
        uniformImg.src = kitPath(slug);
        uniformImg.alt = p.clube;
        uniformImg.onerror = () => {
          uniformImg.src = shieldPath(slug);
        };
        chip.appendChild(uniformImg);
        
        // Iniciais removidas conforme solicitado
        
        const meta = document.createElement('div');
        meta.className = 'meta';
        const preco = p.preco ? `C$ ${p.preco}` : 'N/A';
        meta.innerHTML = `
          <div class="nm">${p.nome}</div>
          <div class="sb">${p.clube} - ${p.posicao}</div>
          <div class="price">${preco}</div>
        `;
        
        const selectBtn = document.createElement('button');
        selectBtn.className = 'btn-mini';
        selectBtn.textContent = 'Selecionar';
        selectBtn.onclick = (e) => {
          e.stopPropagation();
          
          // Encontrar o próximo slot vazio para preencher
          const targetSlot = getNextEmptySlot();
          if (targetSlot) {
            fillReserveSlot(targetSlot, {type:'player', name:p.nome, club:p.clube, slug});
            
            // Verificar se ainda há slots vazios
            const remainingEmptySlots = getNextEmptySlot();
            if (!remainingEmptySlots) {
              // Se não há mais slots vazios, fechar o modal
              modal.remove();
            }
          } else {
            // Se não há slots vazios, mostrar alerta e fechar modal
            alert('Todos os slots de reserva estão preenchidos!');
            modal.remove();
          }
        };
        
        card.appendChild(chip);
        card.appendChild(meta);
        card.appendChild(selectBtn);
        resultsContainer.appendChild(card);
      });
    }
    
    searchInput.addEventListener('input', renderReserveResults);
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => {
      if(e.target === modal) modal.remove();
    };
    
    searchInput.focus();
    renderReserveResults();
  }

  // Estrelas (unanimidades) arrastáveis
  document.getElementById('spawnStar').addEventListener('click', ()=>{
    createUnanimityStar();
  });
  
  function createUnanimityStar(x = '50%', y = '50%') {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = x;
    star.style.top = y;
    star.innerHTML = '⭐';
    star.style.cursor = 'grab';
    star.style.userSelect = 'none';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove star-remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remover estrela';
    removeBtn.style.opacity = '0';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      star.remove();
    };
    
    star.appendChild(removeBtn);
    field.appendChild(star);

    // Sistema de arrastar melhorado
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;
    
    star.addEventListener('pointerdown', (e) => {
      if(e.target === removeBtn) return;
      isDragging = true;
      star.style.cursor = 'grabbing';
      star.setPointerCapture(e.pointerId);
      
      const rect = star.getBoundingClientRect();
      const fieldRect = field.getBoundingClientRect();
      offsetX = e.clientX - rect.left - rect.width/2;
      offsetY = e.clientY - rect.top - rect.height/2;
      
      e.preventDefault();
    });
    
    star.addEventListener('pointermove', (e) => {
      if(!isDragging) return;
      
      const fieldRect = field.getBoundingClientRect();
      let newX = e.clientX - fieldRect.left - offsetX;
      let newY = e.clientY - fieldRect.top - offsetY;
      
      // Limitar ao campo
      newX = Math.max(20, Math.min(fieldRect.width - 20, newX));
      newY = Math.max(20, Math.min(fieldRect.height - 20, newY));
      
      star.style.left = newX + 'px';
      star.style.top = newY + 'px';
    });
    
    star.addEventListener('pointerup', () => {
      isDragging = false;
      star.style.cursor = 'grab';
    });
    
    // Mostrar/esconder botão de remover
    star.addEventListener('mouseenter', () => {
      removeBtn.style.opacity = '1';
    });
    
    star.addEventListener('mouseleave', () => {
      removeBtn.style.opacity = '0';
    });
    
    return star;
  }
  }



  // Limpar Campo / Tudo
  document.getElementById('clearField').addEventListener('click', ()=>{
    // remove badges e estrelas
    document.querySelectorAll('#field .badge, #field .star').forEach(el => el.remove());
  });
  document.getElementById('clearAll').addEventListener('click', ()=>{
    document.getElementById('clearField').click();
    document.querySelectorAll('.analysis-rectangle .chip').forEach(el => el.remove());
    document.querySelectorAll('.reserve-slot').forEach(s => s.innerHTML = '+');
    // não limpar selecionados deliberadamente (para manter fluxo da live)
  });

  // Drawer inferior (posições) - movido para dentro da initializeApp
  const drawer = document.getElementById('drawer');
  const drawerPos = document.getElementById('drawerPos');
  const searchPanel = document.getElementById('searchPanel');
  const searchInput = document.getElementById('searchInput');
  const resultsRow = document.getElementById('resultsRow');
  const selectedRow = document.getElementById('selectedRow');
  


  function closeDrawer(){ drawer.hidden = true; }
  function closeSearchPanel(){ searchPanel.hidden = true; }

  document.querySelectorAll('.pos-btn').forEach(b => {
    b.addEventListener('click', ()=> {
      const pos = b.dataset.pos;
      drawerPos.textContent = pos;
      drawer.hidden = false;
      searchPanel.hidden = false;
      searchInput.value = '';
      searchInput.focus();
      renderSelectedPlayers();
      renderResults();
    });
  });

  // fechar barra de pesquisa ao clicar fora dela, mas manter drawer aberto
  document.addEventListener('click', (e)=>{
    const insideDrawer = e.target.closest('#drawer');
    const insideSearchPanel = e.target.closest('#searchPanel');
    const isPosBtn = e.target.closest('.pos-btn');
    const isOpenSearchBtn = e.target.closest('#openSearch');
    const isMiniBtn = e.target.closest('.btn-mini');
    
    // Se clicou fora do drawer completamente, fechar drawer
    if(!insideDrawer && !isPosBtn) {
      closeDrawer();
    }
    // Se clicou dentro do drawer mas fora da barra de pesquisa (e não é botão +), recolher apenas a barra
    else if(insideDrawer && !insideSearchPanel && !isOpenSearchBtn && !isMiniBtn && !searchPanel.hidden) {
      closeSearchPanel();
    }
  });

  document.getElementById('openSearch').addEventListener('click', ()=>{
     searchPanel.hidden = false;
     searchInput.focus();
     renderResults();
   });

   function renderResults(){
     const pos = drawerPos.textContent;
     const q = searchInput.value;
     const allPlayers = PLAYERS_API.searchPlayers(pos, q);
     const selectedPlayers = PLAYERS_API.getSelected(pos);
     
     // Filtrar jogadores já selecionados
     const availablePlayers = allPlayers.filter(p => 
       !selectedPlayers.some(selected => 
         selected.nome === p.nome && selected.clube === p.clube
       )
     );
     
     resultsRow.innerHTML='';
     availablePlayers.slice(0,300).forEach(p => {
       const slug = normalizeClub(p.clube);
       const card = document.createElement('div');
       card.className='card';
       
       // Chip com uniforme
       const chip = document.createElement('div'); 
       chip.className='chip';
       chip.style.position = 'relative';
       const uniformImg = document.createElement('img'); 
       uniformImg.src = kitPath(slug); 
       uniformImg.alt = p.clube;
       uniformImg.onerror = () => {
         uniformImg.src = shieldPath(slug);
       };
       chip.appendChild(uniformImg);
       
       // Meta informações
       const meta = document.createElement('div'); 
       meta.className='meta';
       
       // Formatação do preço
       const preco = parseFloat(p.preco) || 0;
       const precoFormatado = preco > 0 ? `C$ ${preco.toFixed(2)}` : 'Preço não disponível';
       
       meta.innerHTML = `
         <div class="nm">${p.nome}</div>
         <div class="sb">${p.clube} - ${p.posicao}</div>
         <div class="price" style="color: #28a745; font-weight: bold; font-size: 0.9em;">${precoFormatado}</div>
       `;
       
       // Botão adicionar
       const add = document.createElement('button'); 
       add.className='btn-mini'; 
       add.textContent='Adicionar';
       add.onclick = (e)=> { 
         e.stopPropagation(); // Impedir que o evento se propague e feche a barra
         PLAYERS_API.addSelected(pos, p);
         renderSelectedPlayers();
         renderResults(); // Atualizar lista para remover jogador adicionado
       };
       
       card.appendChild(chip); 
       card.appendChild(meta); 
       card.appendChild(add);
       
       // Tornar arrastável
       DND.makeDraggable(card, {type:'player', name:p.nome, club:p.clube, slug, source:'search'});
       resultsRow.appendChild(card);
     });
   }

   searchInput.addEventListener('input', renderResults);

   // Renderizar jogadores selecionados
   function renderSelectedPlayers() {
     const pos = drawerPos.textContent;
     const selected = PLAYERS_API.getSelected(pos);
     selectedRow.innerHTML = '';
     
     selected.forEach(p => {
       const slug = normalizeClub(p.clube);
       
       // Usar o mesmo layout da barra de pesquisa para todas as posições
       const card = document.createElement('div');
       card.className = 'card';
       
       // Chip com uniforme (mesmo tamanho da barra de pesquisa)
       const chip = document.createElement('div');
       chip.className = 'chip';
       chip.style.position = 'relative';
       const uniformImg = document.createElement('img');
       uniformImg.src = kitPath(slug);
       uniformImg.alt = p.clube;
       uniformImg.onerror = () => {
         uniformImg.src = shieldPath(slug);
       };
       chip.appendChild(uniformImg);
       
       // Meta informações (mesmo da barra de pesquisa)
       const meta = document.createElement('div');
       meta.className = 'meta';
       meta.innerHTML = `
         <div class="nm">${p.nome}</div>
         <div class="sb">${p.clube} - ${p.posicao}</div>
       `;
       
       // Botão remover
       const remove = document.createElement('button');
       remove.className = 'btn-mini';
       remove.textContent = '×';
       remove.onclick = (e) => {
         e.stopPropagation(); // Impedir que o evento se propague e feche o painel
         PLAYERS_API.removeSelected(pos, p);
         renderSelectedPlayers();
       };
       
       card.appendChild(chip);
       card.appendChild(meta);
       card.appendChild(remove);
       
       // Tornar arrastável para o campo
       DND.makeDraggable(card, {type:'player', name:p.nome, club:p.clube, slug, source:'selected'});
       selectedRow.appendChild(card);
     });
   }

  initializeApp();

})();

// Event listener para o botão de atualização manual
document.addEventListener('DOMContentLoaded', function() {
    const forceUpdateBtn = document.getElementById('force-update-btn');
    if (forceUpdateBtn) {
        forceUpdateBtn.addEventListener('click', function() {
            this.disabled = true;
            this.textContent = '🔄 Atualizando...';
            
            if (window.PLAYERS_API && window.PLAYERS_API.forceUpdate) {
                window.PLAYERS_API.forceUpdate();
                
                // Reabilitar botão após 3 segundos
                setTimeout(() => {
                    this.disabled = false;
                    this.textContent = '🔄 Atualizar Preços';
                }, 3000);
            }
        });
    }
});