// ========================================
// CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ========================================

// Configurações da API - Detecta automaticamente se está no Railway
const API_CONFIG = {
  baseUrl: (() => {
    // Se estiver no Railway, usa a URL atual
    if (window.location.hostname.includes('railway.app')) {
      return window.location.origin;
    }
    // Senão, usa a URL configurada no localStorage ou padrão
    return localStorage.getItem('apiUrl') || 'http://localhost:8000';
  })(),
  timeout: 10000,
  retryAttempts: 3
};

// Estado da aplicação
let orcamentos = JSON.parse(localStorage.getItem("orcamentos")) || [];
let contadorOrcamento = parseInt(localStorage.getItem("contadorOrcamento")) || 1;
let editandoIndice = null;
let isOnline = true;
let syncQueue = JSON.parse(localStorage.getItem("syncQueue")) || [];

// Sistema de Abas para Itens
let tabsData = [];
let activeTabIndex = 0;
let tabCounter = 0;

// Lista padrão de categorias e unidades
let categorias = JSON.parse(localStorage.getItem('categorias')) || [
  'Material de Escritório', 'Limpeza', 'Insumos', 'Outros'
];

const unidadesPadrao = [
  'UN', 'KG', 'TON', 'G', 'MG', 'L', 'ML', 'M', 'CM', 'MM', 'PC', 'CX', 'PCT', 'BD', 'CT', 'MT', 'LT', 'DZ', 'SC', 'GL', 'RL', 'FARDO', 'TUBO', 'GAL', 'PAR', 'JOGO', 'KIT', 'FR', 'AMP', 'BIS', 'BLOCO', 'BARRA', 'FOLHA', 'TAM', 'TAL', 'UNID', 'EMB', 'SACO', 'TIRA', 'ROLO', 'POTE', 'VIDRO', 'TAMPA', 'BOMB', 'BISN', 'TUB', 'TIRA', 'OUTRA...'
];

// ========================================
// SISTEMA DE ABAS PARA ITENS
// ========================================

function addItemTab() {
  const tabId = `tab_${++tabCounter}`;
  const newTab = {
    id: tabId,
    title: 'Novo Item',
    content: null,
    unsaved: true,
    data: {
      descricao: '',
      categoria: categorias[0] || 'Outros',
      quantidade: 1,
      unidade: 'UN',
      fornecedores: []
    }
  };
  
  tabsData.push(newTab);
  const tabIndex = tabsData.length - 1;
  
  createTabElement(newTab, tabIndex);
  createTabPanel(newTab, tabIndex);
  
  // Ativar a nova aba
  activateTab(tabIndex);
  
  // Focar no campo de descrição
  setTimeout(() => {
    const descricaoInput = document.querySelector(`#${tabId} input[name="descricao"]`);
    if (descricaoInput) {
      descricaoInput.focus();
    }
  }, 100);
}

function createTabElement(tab, index) {
  const tabsList = document.getElementById('tabsList');
  const tabElement = document.createElement('div');
  tabElement.className = `tab-item ${index === activeTabIndex ? 'active' : ''} ${tab.unsaved ? 'unsaved' : ''} new-tab`;
  tabElement.dataset.tabIndex = index;
  tabElement.dataset.tabId = tab.id;
  
  tabElement.innerHTML = `
    <span class="tab-title">${tab.title}</span>
    <button type="button" class="tab-close" onclick="closeTab(${index})" title="Fechar aba">×</button>
  `;
  
  // Evento de clique para ativar aba
  tabElement.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-close')) {
      activateTab(index);
    }
  });
  
  tabsList.appendChild(tabElement);
  
  // Remover classe de animação após animação
  setTimeout(() => {
    tabElement.classList.remove('new-tab');
  }, 300);
}

function createTabPanel(tab, index) {
  const tabsContent = document.getElementById('tabsContent');
  const panel = document.createElement('div');
  panel.className = `tab-panel ${index === activeTabIndex ? 'active' : ''}`;
  panel.id = `panel_${tab.id}`;
  
  // Unidades dinâmicas + campo personalizado
  let unidadesHTML = unidadesPadrao.map(u => `<option${tab.data.unidade === u ? ' selected' : ''}>${u}</option>`).join('');
  unidadesHTML += `<option value="personalizada">Outra...</option>`;
  
  panel.innerHTML = `
    <div class="item-block">
      <div class="item-header">
        <h4 class="item-title">Item ${index + 1}</h4>
        <div class="item-actions">
          <button type="button" class="btn-add" onclick="addFornecedorToTab(${index})">+ Fornecedor</button>
        </div>
      </div>
      
      <div class="grid">
        <label>Descrição do Produto:
          <input type="text" name="descricao" value="${tab.data.descricao}" 
                 onchange="updateTabTitle(${index}, this.value)" required />
        </label>
        <label>Categoria:
          <select name="categoria" onchange="updateTabData(${index}, 'categoria', this.value)">
            ${categorias.map(cat => `<option${tab.data.categoria === cat ? ' selected' : ''}>${cat}</option>`).join('')}
          </select>
        </label>
        <label>Quantidade:
          <input type="number" name="quantidade" value="${tab.data.quantidade}" 
                 onchange="updateTabData(${index}, 'quantidade', this.value)" required step="0.01" />
        </label>
        <label>Unidade:
          <select name="unidade" onchange="updateTabData(${index}, 'unidade', this.value)">
            ${unidadesHTML}
          </select>
          <input type="text" name="unidadePersonalizada" placeholder="Digite a unidade" 
                 style="display:none; margin-top:0.3rem;" />
        </label>
      </div>
      
      <div class="fornecedores">
        <h4>Fornecedores:</h4>
        <div class="fornecedores-container" id="fornecedores_${tab.id}">
          ${tab.data.fornecedores.length === 0 ? `
          <div class="fornecedor-block">
            <label>Fornecedor:
              <input type="text" name="fornecedor" required />
            </label>
            <label>Preço Unitário (R$):
              <input type="number" name="preco" step="0.01" required />
            </label>
            <label>Frete (R$):
              <input type="number" name="frete" step="0.01" value="0" />
            </label>
            <button type="button" class="remover-fornecedor">❌ Remover Fornecedor</button>
          </div>` : ''}
        </div>
      </div>
    </div>
  `;
  
  // Adicionar fornecedores existentes se houver
  if (tab.data.fornecedores.length > 0) {
    const fornecedoresContainer = panel.querySelector(`#fornecedores_${tab.id}`);
    tab.data.fornecedores.forEach((fornecedor, fornIndex) => {
      const fb = createFornecedorBlock(fornecedor, fornIndex, tab.id);
      fornecedoresContainer.appendChild(fb);
    });
  }
  
  // Evento para unidade personalizada
  const selectUnidade = panel.querySelector('select[name="unidade"]');
  const inputPersonalizada = panel.querySelector('input[name="unidadePersonalizada"]');
  
  selectUnidade.addEventListener('change', () => {
    if (selectUnidade.value === 'personalizada') {
      inputPersonalizada.style.display = 'block';
      inputPersonalizada.required = true;
    } else {
      inputPersonalizada.style.display = 'none';
      inputPersonalizada.required = false;
      updateTabData(index, 'unidade', selectUnidade.value);
    }
  });
  
  // Evento para remover fornecedores
  panel.querySelectorAll('.remover-fornecedor').forEach(btn => {
    btn.addEventListener('click', () => {
      const fornecedorBlock = btn.closest('.fornecedor-block');
      const fornIndex = Array.from(fornecedorBlock.parentNode.children).indexOf(fornecedorBlock);
      removeFornecedorFromTab(index, fornIndex);
      fornecedorBlock.remove();
    });
  });
  
  tabsContent.appendChild(panel);
}

function createFornecedorBlock(fornecedor, fornIndex, tabId) {
  const fb = document.createElement('div');
  fb.className = 'fornecedor-block';
  fb.innerHTML = `
    <label>Fornecedor:
      <input type="text" name="fornecedor" value="${fornecedor.nome}" required />
    </label>
    <label>Preço Unitário (R$):
      <input type="number" name="preco" step="0.01" value="${fornecedor.preco}" required />
    </label>
    <label>Frete (R$):
      <input type="number" name="frete" step="0.01" value="${fornecedor.frete || 0}" />
    </label>
    <button type="button" class="remover-fornecedor">❌ Remover Fornecedor</button>
  `;
  
  fb.querySelector('.remover-fornecedor').addEventListener('click', () => {
    const tabIndex = tabsData.findIndex(tab => tab.id === tabId);
    removeFornecedorFromTab(tabIndex, fornIndex);
    fb.remove();
  });
  
  return fb;
}

function activateTab(index) {
  // Desativar aba atual
  const currentActiveTab = document.querySelector('.tab-item.active');
  const currentActivePanel = document.querySelector('.tab-panel.active');
  
  if (currentActiveTab) currentActiveTab.classList.remove('active');
  if (currentActivePanel) currentActivePanel.classList.remove('active');
  
  // Ativar nova aba
  const newActiveTab = document.querySelector(`[data-tab-index="${index}"]`);
  const newActivePanel = document.querySelector(`#panel_${tabsData[index].id}`);
  
  if (newActiveTab) newActiveTab.classList.add('active');
  if (newActivePanel) newActivePanel.classList.add('active');
  
  activeTabIndex = index;
}

function closeTab(index) {
  if (tabsData.length <= 1) {
    mostrarMensagem('⚠️ Deve haver pelo menos um item', 'alerta');
    return;
  }
  
  const tab = tabsData[index];
  const tabElement = document.querySelector(`[data-tab-index="${index}"]`);
  const panel = document.querySelector(`#panel_${tab.id}`);
  
  // Animação de remoção
  tabElement.classList.add('removing');
  
  setTimeout(() => {
    // Remover da lista de dados
    tabsData.splice(index, 1);
    
    // Remover elementos do DOM
    if (tabElement) tabElement.remove();
    if (panel) panel.remove();
    
    // Reindexar abas restantes
    reindexTabs();
    
    // Ativar aba apropriada
    if (activeTabIndex >= tabsData.length) {
      activeTabIndex = tabsData.length - 1;
    }
    if (tabsData.length > 0) {
      activateTab(activeTabIndex);
    }
  }, 300);
}

function reindexTabs() {
  const tabElements = document.querySelectorAll('.tab-item');
  const panels = document.querySelectorAll('.tab-panel');
  
  tabElements.forEach((element, index) => {
    element.dataset.tabIndex = index;
    element.querySelector('.tab-title').textContent = tabsData[index].title;
  });
  
  panels.forEach((panel, index) => {
    panel.querySelector('.item-title').textContent = `Item ${index + 1}`;
  });
}

function updateTabTitle(index, title) {
  if (index >= 0 && index < tabsData.length) {
    const tab = tabsData[index];
    tab.title = title || 'Novo Item';
    tab.data.descricao = title;
    tab.unsaved = true;
    
    const tabElement = document.querySelector(`[data-tab-index="${index}"]`);
    if (tabElement) {
      tabElement.querySelector('.tab-title').textContent = tab.title;
      tabElement.classList.add('unsaved');
    }
  }
}

function updateTabData(index, field, value) {
  if (index >= 0 && index < tabsData.length) {
    tabsData[index].data[field] = value;
    tabsData[index].unsaved = true;
    
    const tabElement = document.querySelector(`[data-tab-index="${index}"]`);
    if (tabElement) {
      tabElement.classList.add('unsaved');
    }
  }
}

function addFornecedorToTab(tabIndex) {
  if (tabIndex >= 0 && tabIndex < tabsData.length) {
    const tab = tabsData[tabIndex];
    const fornecedor = {
      nome: '',
      preco: 0,
      frete: 0
    };
    
    tab.data.fornecedores.push(fornecedor);
    
    const fornecedoresContainer = document.querySelector(`#fornecedores_${tab.id}`);
    const fb = createFornecedorBlock(fornecedor, tab.data.fornecedores.length - 1, tab.id);
    fornecedoresContainer.appendChild(fb);
    
    // Focar no primeiro campo
    setTimeout(() => {
      const firstInput = fb.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 100);
  }
}

function removeFornecedorFromTab(tabIndex, fornIndex) {
  if (tabIndex >= 0 && tabIndex < tabsData.length) {
    const tab = tabsData[tabIndex];
    if (fornIndex >= 0 && fornIndex < tab.data.fornecedores.length) {
      tab.data.fornecedores.splice(fornIndex, 1);
      tab.unsaved = true;
      
      const tabElement = document.querySelector(`[data-tab-index="${tabIndex}"]`);
      if (tabElement) {
        tabElement.classList.add('unsaved');
      }
    }
  }
}

function getTabsData() {
  // Coletar dados de todas as abas
  const items = [];
  
  tabsData.forEach((tab, index) => {
    const panel = document.querySelector(`#panel_${tab.id}`);
    if (!panel) return;
    
    const descricao = panel.querySelector('input[name="descricao"]').value;
    const categoria = panel.querySelector('select[name="categoria"]').value;
    const quantidade = parseFloat(panel.querySelector('input[name="quantidade"]').value);
    const unidadeSelect = panel.querySelector('select[name="unidade"]');
    const unidadePersonalizada = panel.querySelector('input[name="unidadePersonalizada"]').value;
    const unidade = unidadeSelect.value === 'personalizada' ? unidadePersonalizada : unidadeSelect.value;
    
    // Coletar fornecedores
    const fornecedores = [];
    const fornecedorBlocks = panel.querySelectorAll('.fornecedor-block');
    
    fornecedorBlocks.forEach(block => {
      const nome = block.querySelector('input[name="fornecedor"]').value;
      const preco = parseFloat(block.querySelector('input[name="preco"]').value);
      const frete = parseFloat(block.querySelector('input[name="frete"]').value) || 0;
      
      if (nome && preco) {
        fornecedores.push({ nome, preco, frete });
      }
    });
    
    if (descricao && categoria && quantidade && fornecedores.length > 0) {
      items.push({
        descricao,
        categoria,
        quantidade,
        unidade,
        fornecedores
      });
    }
  });
  
  return items;
}

function loadTabsFromData(items) {
  // Limpar abas existentes
  tabsData = [];
  activeTabIndex = 0;
  tabCounter = 0;
  
  const tabsList = document.getElementById('tabsList');
  const tabsContent = document.getElementById('tabsContent');
  
  tabsList.innerHTML = '';
  tabsContent.innerHTML = '';
  
  // Criar abas para cada item
  items.forEach((item, index) => {
    const tabId = `tab_${++tabCounter}`;
    const newTab = {
      id: tabId,
      title: item.descricao || `Item ${index + 1}`,
      content: null,
      unsaved: false,
      data: { ...item }
    };
    
    tabsData.push(newTab);
    createTabElement(newTab, index);
    createTabPanel(newTab, index);
  });
  
  // Ativar primeira aba
  if (tabsData.length > 0) {
    activateTab(0);
  }
}

// ========================================
// FUNÇÕES DE UTILIDADE
// ========================================

function salvarLocalStorage() {
  localStorage.setItem("orcamentos", JSON.stringify(orcamentos));
  localStorage.setItem("contadorOrcamento", contadorOrcamento.toString());
  localStorage.setItem("syncQueue", JSON.stringify(syncQueue));
}

function mostrarMensagem(texto, tipo = "sucesso") {
  const msg = document.createElement("div");
  msg.className = `mensagem ${tipo}`;
  msg.textContent = texto;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 4000);
}

function showTab(id) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  
  // Atualizar dados quando mudar de aba
  if (id === 'lista') {
    carregarOrcamentos();
  } else if (id === 'dashboard') {
    atualizarDashboard();
  }
}

// ========================================
// FUNÇÕES DE COMUNICAÇÃO COM BACKEND
// ========================================

async function testarConexao() {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/orcamentos`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(API_CONFIG.timeout)
    });
    
    if (response.ok) {
      isOnline = true;
      mostrarMensagem('✅ Conexão com backend estabelecida!', 'sucesso');
      return true;
    } else {
      throw new Error('Backend não respondeu corretamente');
    }
  } catch (error) {
    isOnline = false;
    mostrarMensagem('⚠️ Backend offline - usando dados locais', 'alerta');
    return false;
  }
}

async function fazerRequest(endpoint, options = {}) {
  const url = `${API_CONFIG.baseUrl}${endpoint}`;
  
  const defaultOptions = {
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(API_CONFIG.timeout)
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, finalOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Erro na requisição ${endpoint}:`, error);
    throw error;
  }
}

// ========================================
// CRUD DE ORÇAMENTOS
// ========================================

async function carregarOrcamentos() {
  try {
    if (isOnline) {
      // Tentar carregar do backend
      const data = await fazerRequest('/api/orcamentos');
      orcamentos = data.orcamentos || [];
      salvarLocalStorage();
      mostrarMensagem('📥 Orçamentos carregados do servidor', 'sucesso');
    } else {
      // Usar dados locais
      orcamentos = JSON.parse(localStorage.getItem("orcamentos")) || [];
      mostrarMensagem('📱 Usando dados locais (modo offline)', 'info');
    }
    
    atualizarTabela();
  } catch (error) {
    console.error('Erro ao carregar orçamentos:', error);
    // Fallback para dados locais
    orcamentos = JSON.parse(localStorage.getItem("orcamentos")) || [];
    atualizarTabela();
    mostrarMensagem('⚠️ Erro ao carregar do servidor - usando dados locais', 'alerta');
  }
}

async function salvarOrcamento(dados, isEdicao = false) {
  try {
    // Coletar dados das abas
    const itens = getTabsData();
    
    if (itens.length === 0) {
      mostrarMensagem('⚠️ Adicione pelo menos um item ao orçamento', 'alerta');
      return;
    }
    
    // Preparar dados para o backend
    const dadosBackend = {
      data: dados.data,
      validade: parseInt(dados.validade),
      tags: dados.tags || '',
      forma_pagamento: dados.pagamento,
      status: dados.status,
      observacoes: dados.observacoes || '',
      decisao: dados.decisao || '',
      itens: JSON.stringify(itens)
    };
    
    if (isOnline) {
      // Salvar no backend
      if (isEdicao && editandoIndice !== null) {
        const orcamento = orcamentos[editandoIndice];
        await fazerRequest(`/api/orcamentos/${orcamento.id}`, {
          method: 'PUT',
          body: new URLSearchParams(dadosBackend)
        });
        mostrarMensagem('✅ Orçamento atualizado no servidor!', 'sucesso');
      } else {
        const response = await fazerRequest('/api/orcamentos', {
          method: 'POST',
          body: new URLSearchParams(dadosBackend)
        });
        
        // Adicionar à lista local
        const novoOrcamento = {
          id: response.id,
          numero: response.numero,
          ...dadosBackend,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        orcamentos.unshift(novoOrcamento);
        mostrarMensagem('✅ Orçamento salvo no servidor!', 'sucesso');
      }
    } else {
      // Salvar apenas localmente
      const novoOrcamento = {
        id: Date.now(), // ID temporário
        numero: contadorOrcamento++,
        ...dadosBackend,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (isEdicao && editandoIndice !== null) {
        orcamentos[editandoIndice] = { ...orcamentos[editandoIndice], ...novoOrcamento };
        mostrarMensagem('💾 Orçamento atualizado localmente (modo offline)', 'info');
      } else {
        orcamentos.unshift(novoOrcamento);
        mostrarMensagem('💾 Orçamento salvo localmente (modo offline)', 'info');
      }
      
      // Adicionar à fila de sincronização
      syncQueue.push({
        action: isEdicao ? 'UPDATE' : 'CREATE',
        data: novoOrcamento,
        timestamp: Date.now()
      });
    }
    
    salvarLocalStorage();
    atualizarTabela();
    limparFormulario();
    editandoIndice = null;
    
  } catch (error) {
    console.error('Erro ao salvar orçamento:', error);
    mostrarMensagem('❌ Erro ao salvar orçamento', 'erro');
  }
}

async function excluirOrcamento(indice) {
  if (!confirm('Tem certeza que deseja excluir este orçamento?')) {
    return;
  }
  
  try {
    const orcamento = orcamentos[indice];
    
    if (isOnline && orcamento.id) {
      // Excluir do backend
      await fazerRequest(`/api/orcamentos/${orcamento.id}`, {
        method: 'DELETE'
      });
      mostrarMensagem('✅ Orçamento excluído do servidor!', 'sucesso');
    } else {
      // Adicionar à fila de sincronização
      syncQueue.push({
        action: 'DELETE',
        data: orcamento,
        timestamp: Date.now()
      });
      mostrarMensagem('💾 Orçamento excluído localmente (modo offline)', 'info');
    }
    
    // Remover da lista local
    orcamentos.splice(indice, 1);
    salvarLocalStorage();
    atualizarTabela();
    
  } catch (error) {
    console.error('Erro ao excluir orçamento:', error);
    mostrarMensagem('❌ Erro ao excluir orçamento', 'erro');
  }
}

function editarOrcamento(indice) {
  const orcamento = orcamentos[indice];
  editandoIndice = indice;
  
  // Preencher formulário com dados do orçamento
  const form = document.getElementById('orcamentoForm');
  form.data.value = orcamento.data;
  form.validade.value = orcamento.validade;
  form.tags.value = orcamento.tags || '';
  form.pagamento.value = orcamento.forma_pagamento;
  form.status.value = orcamento.status;
  form.observacoes.value = orcamento.observacoes || '';
  form.decisao.value = orcamento.decisao || '';
  
  // Carregar itens nas abas
  if (orcamento.itens) {
    const itensData = typeof orcamento.itens === 'string' ? JSON.parse(orcamento.itens) : orcamento.itens;
    loadTabsFromData(itensData);
  } else {
    // Se não há itens, criar uma aba vazia
    addItemTab();
  }
  
  // Mudar para aba de cadastro
  showTab('cadastro');
  
  // Atualizar botão
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = '💾 Atualizar Orçamento';
  
  mostrarMensagem('✏️ Editando orçamento...', 'info');
}

function limparFormulario() {
  const form = document.getElementById('orcamentoForm');
  form.reset();
  
  // Limpar sistema de abas
  tabsData = [];
  activeTabIndex = 0;
  tabCounter = 0;
  
  const tabsList = document.getElementById('tabsList');
  const tabsContent = document.getElementById('tabsContent');
  
  tabsList.innerHTML = '';
  tabsContent.innerHTML = '';
  
  // Criar uma aba inicial vazia
  addItemTab();
  
  document.getElementById('anexosPreview').innerHTML = '';
  
  // Resetar botão
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = '💾 Salvar Orçamento';
  
  editandoIndice = null;
}

// ========================================
// ATUALIZAÇÃO DA TABELA
// ========================================

function atualizarTabela() {
  const tbody = document.querySelector("#tabelaOrcamentos tbody");
  tbody.innerHTML = "";
  
  if (orcamentos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: #6c757d;">
          📋 Nenhum orçamento cadastrado
        </td>
      </tr>
    `;
    return;
  }
  
  orcamentos.forEach((orcamento, index) => {
    const row = document.createElement("tr");
    
    // Calcular totais
    let totalGeral = 0;
    let economiaTotal = 0;
    let totalItens = 0;
    
    if (orcamento.itens) {
      const itens = typeof orcamento.itens === 'string' ? JSON.parse(orcamento.itens) : orcamento.itens;
      totalItens = itens.length;
      
      itens.forEach(item => {
        if (item.fornecedores && item.fornecedores.length > 0) {
          const totais = item.fornecedores.map(f => 
            (parseFloat(f.preco) * parseFloat(item.quantidade)) + parseFloat(f.frete || 0)
          );
          const menorPreco = Math.min(...totais);
          totalGeral += menorPreco;
          
          if (totais.length > 1) {
            const ordenados = totais.sort((a, b) => a - b);
            economiaTotal += ordenados[1] - ordenados[0];
          }
        }
      });
    }
    
    // Status badge
    const statusClass = `status-${orcamento.status.toLowerCase()}`;
    const statusBadge = `<span class="status-badge ${statusClass}">${orcamento.status}</span>`;
    
    row.innerHTML = `
      <td>
        <a href="#" onclick="abrirDetalhes(${index})" style="color: #007BFF; text-decoration: none; font-weight: 600;">
          #${orcamento.numero}
        </a>
      </td>
      <td>${new Date(orcamento.data).toLocaleDateString('pt-BR')}</td>
      <td>${totalItens} item(s)</td>
      <td>${statusBadge}</td>
      <td>R$ ${totalGeral.toFixed(2)}</td>
      <td style="color: #28a745; font-weight: 600;">R$ ${economiaTotal.toFixed(2)}</td>
      <td>
        <button onclick="editarOrcamento(${index})" title="Editar" style="background: #17a2b8; margin: 0.2rem;">
          ✏️
        </button>
        <button onclick="excluirOrcamento(${index})" title="Excluir" style="background: #dc3545; margin: 0.2rem;">
          🗑️
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

// ========================================
// INICIALIZAÇÃO
// ========================================

// Testar conexão na inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await testarConexao();
  carregarOrcamentos();
  atualizarDashboard();
});

// ========================================
// FUNÇÕES EXISTENTES (MANTIDAS)
// ========================================

function salvarCategorias() {
  localStorage.setItem('categorias', JSON.stringify(categorias));
}

// Atualizar selects de categoria
function atualizarSelectsCategoria() {
  document.querySelectorAll('select[name="categoria[]"]').forEach(sel => {
    const valorAtual = sel.value;
    sel.innerHTML = categorias.map(cat => `<option${cat === valorAtual ? ' selected' : ''}>${cat}</option>`).join('');
  });
}

// Função para renderizar lista de categorias no modal
function renderizarListaCategorias() {
  const lista = document.getElementById('listaCategorias');
  if (!lista) return;
  lista.innerHTML = '';
  categorias.forEach((cat, idx) => {
    const div = document.createElement('div');
    div.className = 'categoria-item';
    // Não permitir remover as 4 categorias padrão
    const isPadrao = idx < 4;
    div.innerHTML = `
      <span class="cat-nome">${cat}</span>
      <span>
        <button class="btn-edit-cat" title="Editar">✏️</button>
        <button class="btn-remove-cat" title="Remover" ${isPadrao ? 'disabled' : ''}>🗑️</button>
      </span>
    `;
    // Editar
    div.querySelector('.btn-edit-cat').onclick = function() {
      const span = div.querySelector('.cat-nome');
      const old = span.textContent;
      span.innerHTML = `<input type='text' value='${old}' style='width:120px;' /> <button class='btn-edit-cat'>Salvar</button>`;
      const input = span.querySelector('input');
      input.focus();
      span.querySelector('.btn-edit-cat').onclick = function() {
        const novo = input.value.trim();
        if (novo && !categorias.includes(novo)) {
          categorias[idx] = novo;
          salvarCategorias();
          atualizarSelectsCategoria();
          renderizarListaCategorias();
          mostrarMensagem('Categoria editada com sucesso!', 'sucesso');
        }
      };
    };
    // Remover
    div.querySelector('.btn-remove-cat').onclick = function() {
      if (isPadrao) return;
      if (confirm('Remover categoria?')) {
        categorias.splice(idx, 1);
        salvarCategorias();
        atualizarSelectsCategoria();
        renderizarListaCategorias();
        mostrarMensagem('Categoria removida!', 'alerta');
      }
    };
    lista.appendChild(div);
  });
}

// Chamar renderização ao abrir modal
if (document.getElementById('btnNovaCategoria')) {
  document.getElementById('btnNovaCategoria').onclick = function() {
    document.getElementById('inputNovaCategoria').value = '';
    document.getElementById('modalCategoria').style.display = 'flex';
    document.getElementById('inputNovaCategoria').focus();
    renderizarListaCategorias();
  };
}

// Após salvar nova categoria, atualizar lista
if (document.getElementById('salvarCategoria')) {
  document.getElementById('salvarCategoria').onclick = function() {
    const nova = document.getElementById('inputNovaCategoria').value.trim();
    if (nova && !categorias.includes(nova)) {
      categorias.push(nova);
      salvarCategorias();
      atualizarSelectsCategoria();
      renderizarListaCategorias();
      document.getElementById('modalCategoria').style.display = 'none';
      mostrarMensagem('Categoria cadastrada com sucesso!', 'sucesso');
    }
  };
}

// Atualizar selects ao iniciar
atualizarSelectsCategoria();

// Modificar addItem para usar categorias e unidades dinâmicas
function addItem(dados = null) {
  const container = document.getElementById("itensContainer");
  const item = document.createElement("div");
  item.className = "item-block";

  // Unidades dinâmicas + campo personalizado
  let unidadesHTML = unidadesPadrao.map(u => `<option${dados?.unidade === u ? ' selected' : ''}>${u}</option>`).join('');
  unidadesHTML += `<option value="personalizada">Outra...</option>`;

  item.innerHTML = `
    <label>Descrição do Produto:
      <input type="text" name="descricao[]" required value="${dados?.descricao || ''}"/>
    </label>
    <label>Categoria:
      <select name="categoria[]">
        ${categorias.map(cat => `<option${dados?.categoria === cat ? ' selected' : ''}>${cat}</option>`).join('')}
      </select>
    </label>
    <label>Quantidade:
      <input type="number" name="quantidade[]" required step="0.01" value="${dados?.quantidade || 1}"/>
    </label>
    <label>Unidade:
      <select name="unidade[]">
        ${unidadesHTML}
      </select>
      <input type="text" name="unidadePersonalizada[]" placeholder="Digite a unidade" style="display:none; margin-top:0.3rem;" />
    </label>
    <div class="fornecedores">
      <h4>Fornecedores:</h4>
      ${(dados && dados.fornecedores && dados.fornecedores.length > 0) ? '' : `
      <div class="fornecedor-block">
        <label>Fornecedor:
          <input type="text" name="fornecedor[]" required />
        </label>
        <label>Preço Unitário (R$):
          <input type="number" name="preco[]" step="0.01" required />
        </label>
        <label>Frete (R$):
          <input type="number" name="frete[]" step="0.01" value="0" />
        </label>
        <button type="button" class="remover-fornecedor">❌ Remover Fornecedor</button>
      </div>`}
    </div>
    <div class="item-actions">
      <button type="button" class="add-fornecedor">+ Fornecedor</button>
      <button type="button" class="remover-item">❌ Remover Item</button>
    </div>
  `;

  // Se vier fornecedores nos dados, renderizar todos
  if (dados && dados.fornecedores && dados.fornecedores.length > 0) {
    const fornecedoresDiv = item.querySelector('.fornecedores');
    dados.fornecedores.forEach((fornecedor, index) => {
      const fb = document.createElement('div');
      fb.className = 'fornecedor-block';
      fb.innerHTML = `
        <label>Fornecedor:
          <input type="text" name="fornecedor[]" required value="${fornecedor.nome}"/>
        </label>
        <label>Preço Unitário (R$):
          <input type="number" name="preco[]" step="0.01" required value="${fornecedor.preco}"/>
        </label>
        <label>Frete (R$):
          <input type="number" name="frete[]" step="0.01" value="${fornecedor.frete}"/>
        </label>
        <button type="button" class="remover-fornecedor">❌ Remover Fornecedor</button>
      `;
      fb.querySelector('.remover-fornecedor').addEventListener('click', () => fb.remove());
      fornecedoresDiv.appendChild(fb);
    });
  }

  // Evento para adicionar fornecedor extra
  item.querySelector('.add-fornecedor').addEventListener('click', () => {
    const fb = document.createElement("div");
    fb.className = "fornecedor-block";
    fb.innerHTML = `
      <label>Fornecedor:
        <input type="text" name="fornecedor[]" required />
      </label>
      <label>Preço Unitário (R$):
        <input type="number" name="preco[]" step="0.01" required />
      </label>
      <label>Frete (R$):
        <input type="number" name="frete[]" step="0.01" value="0" />
      </label>
      <button type="button" class="remover-fornecedor">❌ Remover Fornecedor</button>
    `;
    fb.querySelector(".remover-fornecedor").addEventListener("click", () => fb.remove());
    item.querySelector(".fornecedores").appendChild(fb);
  });

  // Remover item completo
  item.querySelector(".remover-item").addEventListener("click", () => item.remove());

  // Remover fornecedor inicial
  item.querySelectorAll(".remover-fornecedor").forEach(btn => {
    btn.addEventListener("click", () => btn.parentElement.remove());
  });

  // Unidade personalizada
  const selectUnidade = item.querySelector('select[name="unidade[]"]');
  const inputPersonalizada = item.querySelector('input[name="unidadePersonalizada[]"]');
  selectUnidade.addEventListener('change', function() {
    if (this.value === 'personalizada' || this.value === 'Outra...') {
      inputPersonalizada.style.display = 'block';
      inputPersonalizada.required = true;
    } else {
      inputPersonalizada.style.display = 'none';
      inputPersonalizada.required = false;
    }
  });
  // Se já vier personalizada
  if (dados?.unidade && !unidadesPadrao.includes(dados.unidade)) {
    selectUnidade.value = 'personalizada';
    inputPersonalizada.value = dados.unidade;
    inputPersonalizada.style.display = 'block';
    inputPersonalizada.required = true;
  }

  container.appendChild(item);
}

// ========================================
// DASHBOARD - INDICADORES E GRÁFICOS
// ========================================

async function atualizarDashboard() {
  try {
    let dadosDashboard;
    
    if (isOnline) {
      // Buscar dados do backend
      dadosDashboard = await fazerRequest('/api/dashboard');
    } else {
      // Calcular dados localmente
      dadosDashboard = calcularDashboardLocal();
    }
    
    // Atualizar indicadores
    atualizarIndicadores(dadosDashboard.indicadores);
    
    // Atualizar gráficos
    atualizarGraficos(dadosDashboard.graficos);
    
  } catch (error) {
    console.error('Erro ao atualizar dashboard:', error);
    // Fallback para dados locais
    const dadosLocais = calcularDashboardLocal();
    atualizarIndicadores(dadosLocais.indicadores);
    atualizarGraficos(dadosLocais.graficos);
    mostrarMensagem('⚠️ Erro ao carregar dashboard - usando dados locais', 'alerta');
  }
}

function calcularDashboardLocal() {
  // Calcular totais
  let totalGeral = 0;
  let economiaTotal = 0;
  let totalItens = 0;
  let orcamentosComValor = 0;
  let maiorEconomia = 0;
  let maiorValor = 0;
  const fornecedoresFrequencia = {};
  const categoriasFrequencia = {};
  const statusFrequencia = {};
  
  orcamentos.forEach(orcamento => {
    let orcamentoTotal = 0;
    let orcamentoEconomia = 0;
    
    if (orcamento.itens) {
      const itens = typeof orcamento.itens === 'string' ? JSON.parse(orcamento.itens) : orcamento.itens;
      
      itens.forEach(item => {
        totalItens++;
        
        // Contar categoria
        categoriasFrequencia[item.categoria] = (categoriasFrequencia[item.categoria] || 0) + 1;
        
        if (item.fornecedores && item.fornecedores.length > 0) {
          const totais = item.fornecedores.map(f => 
            (parseFloat(f.preco) * parseFloat(item.quantidade)) + parseFloat(f.frete || 0)
          );
          
          // Contar fornecedores
          item.fornecedores.forEach(f => {
            fornecedoresFrequencia[f.nome] = (fornecedoresFrequencia[f.nome] || 0) + 1;
          });
          
          const menorPreco = Math.min(...totais);
          orcamentoTotal += menorPreco;
          
          if (totais.length > 1) {
            const ordenados = totais.sort((a, b) => a - b);
            orcamentoEconomia += ordenados[1] - ordenados[0];
          }
        }
      });
    }
    
    totalGeral += orcamentoTotal;
    economiaTotal += orcamentoEconomia;
    
    if (orcamentoTotal > 0) {
      orcamentosComValor++;
      maiorValor = Math.max(maiorValor, orcamentoTotal);
    }
    
    maiorEconomia = Math.max(maiorEconomia, orcamentoEconomia);
    
    // Contar status
    statusFrequencia[orcamento.status] = (statusFrequencia[orcamento.status] || 0) + 1;
  });
  
  // Encontrar fornecedor mais frequente
  const fornecedorMaisFrequente = Object.entries(fornecedoresFrequencia)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
  
  return {
    indicadores: {
      total_geral: totalGeral,
      economia_total: economiaTotal,
      total_itens: totalItens,
      orcamento_medio: orcamentosComValor > 0 ? totalGeral / orcamentosComValor : 0,
      maior_economia: maiorEconomia,
      maior_valor: maiorValor,
      fornecedor_mais_frequente: fornecedorMaisFrequente
    },
    graficos: {
      categorias: Object.entries(categoriasFrequencia).map(([categoria, quantidade]) => ({
        categoria,
        quantidade
      })),
      status: Object.entries(statusFrequencia).map(([status, quantidade]) => ({
        status,
        quantidade
      }))
    }
  };
}

function atualizarIndicadores(indicadores) {
  // Total Geral
  document.getElementById('totalOrcamentos').querySelector('.value').textContent = 
    `R$ ${indicadores.total_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  // Economia Total
  document.getElementById('economiaTotal').querySelector('.value').textContent = 
    `R$ ${indicadores.economia_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  // Total de Itens
  document.getElementById('totalItens').querySelector('.value').textContent = 
    indicadores.total_itens.toLocaleString('pt-BR');
  
  // Orçamento Médio
  document.getElementById('orcamentoMedio').querySelector('.value').textContent = 
    `R$ ${indicadores.orcamento_medio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  // Maior Economia
  document.getElementById('maiorEconomia').querySelector('.value').textContent = 
    indicadores.maior_economia > 0 ? 
    `R$ ${indicadores.maior_economia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
    '-';
  
  // Maior Valor
  document.getElementById('maiorValor').querySelector('.value').textContent = 
    indicadores.maior_valor > 0 ? 
    `R$ ${indicadores.maior_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
    '-';
  
  // Fornecedor Mais Frequente
  document.getElementById('fornecedorTop').querySelector('.value').textContent = 
    indicadores.fornecedor_mais_frequente;
}

function atualizarGraficos(dadosGraficos) {
  const mensagemSemDados = document.getElementById('mensagemSemDados');
  
  // Verificar se há dados
  if ((!dadosGraficos.categorias || dadosGraficos.categorias.length === 0) &&
      (!dadosGraficos.status || dadosGraficos.status.length === 0)) {
    document.getElementById('graficosDashboard').style.display = 'none';
    mensagemSemDados.style.display = 'block';
    return;
  }
  
  document.getElementById('graficosDashboard').style.display = 'block';
  mensagemSemDados.style.display = 'none';
  
  // Gráfico de Categorias
  if (dadosGraficos.categorias && dadosGraficos.categorias.length > 0) {
    renderChart('graficoCategoria', dadosGraficos.categorias, 'categoria');
  }
  
  // Gráfico de Status
  if (dadosGraficos.status && dadosGraficos.status.length > 0) {
    renderChart('graficoStatus', dadosGraficos.status, 'status');
  }
  
  // Gráfico de Economia (comparativo)
  renderGraficoEconomia();
}

function renderChart(id, data, labelKey) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  
  // Destruir gráfico existente
  if (window.charts && window.charts[id]) {
    window.charts[id].destroy();
  }
  
  // Inicializar objeto de gráficos se não existir
  if (!window.charts) window.charts = {};
  
  const labels = data.map(item => item[labelKey]);
  const values = data.map(item => item.quantidade);
  
  // Cores para os gráficos
  const cores = [
    '#007BFF', '#28a745', '#ffc107', '#dc3545', '#6f42c1', 
    '#fd7e14', '#e83e8c', '#20c997', '#17a2b8', '#6c757d'
  ];
  
  window.charts[id] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: cores.slice(0, data.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true
      }
    }
  });
}

function renderGraficoEconomia() {
  const ctx = document.getElementById('graficoEconomia');
  if (!ctx) return;
  
  // Destruir gráfico existente
  if (window.charts && window.charts['graficoEconomia']) {
    window.charts['graficoEconomia'].destroy();
  }
  
  // Calcular dados para o gráfico de economia
  const dadosEconomia = [];
  
  orcamentos.forEach(orcamento => {
    if (orcamento.itens) {
      const itens = typeof orcamento.itens === 'string' ? JSON.parse(orcamento.itens) : orcamento.itens;
      let orcamentoTotal = 0;
      let orcamentoEconomia = 0;
      
      itens.forEach(item => {
        if (item.fornecedores && item.fornecedores.length > 0) {
          const totais = item.fornecedores.map(f => 
            (parseFloat(f.preco) * parseFloat(item.quantidade)) + parseFloat(f.frete || 0)
          );
          
          const menorPreco = Math.min(...totais);
          orcamentoTotal += menorPreco;
          
          if (totais.length > 1) {
            const ordenados = totais.sort((a, b) => a - b);
            orcamentoEconomia += ordenados[1] - ordenados[0];
          }
        }
      });
      
      if (orcamentoTotal > 0) {
        dadosEconomia.push({
          numero: orcamento.numero,
          total: orcamentoTotal,
          economia: orcamentoEconomia
        });
      }
    }
  });
  
  // Pegar os 10 orçamentos com maior economia
  const topEconomia = dadosEconomia
    .sort((a, b) => b.economia - a.economia)
    .slice(0, 10);
  
  if (topEconomia.length === 0) return;
  
  const labels = topEconomia.map(item => `#${item.numero}`);
  const totais = topEconomia.map(item => item.total);
  const economias = topEconomia.map(item => item.economia);
  
  window.charts['graficoEconomia'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total (R$)',
          data: totais,
          backgroundColor: 'rgba(0, 123, 255, 0.8)',
          borderColor: '#007BFF',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Economia (R$)',
          data: economias,
          backgroundColor: 'rgba(40, 167, 69, 0.8)',
          borderColor: '#28a745',
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Orçamentos'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Total (R$)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Economia (R$)'
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }
          }
        }
      }
    }
  });
}

// ========================================
// FUNÇÕES DE DETALHES E VISUALIZAÇÃO
// ========================================

function abrirDetalhes(indice) {
  const orcamento = orcamentos[indice];
  const itens = typeof orcamento.itens === 'string' ? JSON.parse(orcamento.itens) : orcamento.itens;

  let html = `
    <div class="modal-overlay" style="display: flex;">
      <div class="modal" style="max-width: 900px;">
        <h2>📋 Detalhes do Orçamento #${orcamento.numero}</h2>
        <div class="grid" style="margin-bottom: 2rem;">
          <div><strong>Data:</strong> ${new Date(orcamento.data).toLocaleDateString('pt-BR')}</div>
          <div><strong>Validade:</strong> ${orcamento.validade} dias</div>
          <div><strong>Status:</strong> <span class="status-badge status-${orcamento.status.toLowerCase()}">${orcamento.status}</span></div>
          <div><strong>Pagamento:</strong> ${orcamento.forma_pagamento}</div>
          ${orcamento.tags ? `<div><strong>Tags:</strong> ${orcamento.tags}</div>` : ''}
        </div>
        ${orcamento.observacoes ? `
        <div style="margin-bottom: 1rem;">
          <strong>Observações:</strong>
          <p style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-top: 0.5rem;">
            ${orcamento.observacoes}
          </p>
        </div>
        ` : ''}
        ${orcamento.decisao ? `
        <div style="margin-bottom: 1rem;">
          <strong>Decisão:</strong>
          <p style="background: #e8f5e8; padding: 1rem; border-radius: 8px; margin-top: 0.5rem;">
            ${orcamento.decisao}
          </p>
        </div>
        ` : ''}
        <h3>📦 Itens do Orçamento</h3>
        <div class="modal-tabs-container">
          <div class="modal-tabs-header" id="modalTabsHeader"></div>
          <div class="modal-tabs-content" id="modalTabsContent"></div>
        </div>
  `;

  // Anexos
  if (orcamento.anexos && orcamento.anexos.length > 0) {
    html += `
      <h3>📎 Anexos</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
    `;
    orcamento.anexos.forEach(anexo => {
      const icon = getFileIcon(anexo.tipo_arquivo);
      html += `
        <div class="anexo-item" style="cursor: pointer;" onclick="visualizarAnexo(${JSON.stringify(anexo).replace(/"/g, '&quot;')})">
          <span style="font-size: 2rem;">${icon}</span>
          <div>
            <div style="font-weight: 600;">${anexo.nome_arquivo}</div>
            <div style="font-size: 0.8rem; color: #6c757d;">${formatFileSize(anexo.tamanho)}</div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `
        <div class="modal-actions">
          <button onclick="editarOrcamento(${indice})" class="btn-save">✏️ Editar</button>
          <button onclick="this.closest('.modal-overlay').remove()" class="btn-cancel">❌ Fechar</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  // Renderizar abas dos itens
  if (itens && itens.length > 0) {
    const tabsHeader = document.getElementById('modalTabsHeader');
    const tabsContent = document.getElementById('modalTabsContent');
    tabsHeader.innerHTML = '';
    tabsContent.innerHTML = '';
    itens.forEach((item, idx) => {
      // Aba
      const tab = document.createElement('div');
      tab.className = 'modal-tab-item' + (idx === 0 ? ' active' : '');
      tab.dataset.tabIndex = idx;
      tab.innerHTML = `<span class="tab-title">${item.descricao || `Item ${idx + 1}`}</span>`;
      tab.onclick = function() {
        document.querySelectorAll('.modal-tab-item').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.modal-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`modalTabPanel${idx}`).classList.add('active');
      };
      tabsHeader.appendChild(tab);
      // Painel
      const panel = document.createElement('div');
      panel.className = 'modal-tab-panel' + (idx === 0 ? ' active' : '');
      panel.id = `modalTabPanel${idx}`;
      panel.innerHTML = `
        <div style="margin-bottom:1rem;">
          <strong>Categoria:</strong> ${item.categoria}<br>
          <strong>Quantidade:</strong> ${item.quantidade} ${item.unidade}
        </div>
        <h5>Fornecedores:</h5>
        <div>
          ${item.fornecedores && item.fornecedores.length > 0 ? item.fornecedores.map(f => {
            const total = (parseFloat(f.preco) * parseFloat(item.quantidade)) + parseFloat(f.frete || 0);
            const menorTotal = Math.min(...item.fornecedores.map(f2 => (parseFloat(f2.preco) * parseFloat(item.quantidade)) + parseFloat(f2.frete || 0)));
            const isMelhor = total === menorTotal;
            return `<div class=\"fornecedor${isMelhor ? ' melhor' : ''}\">
              <div><strong>${f.nome}</strong> ${isMelhor ? '🏆' : ''}</div>
              <div><strong>R$ ${total.toFixed(2)}</strong><br><small>Preço: R$ ${f.preco} | Frete: R$ ${f.frete || 0}</small></div>
            </div>`;
          }).join('') : '<div style=\"color:#888\">Nenhum fornecedor cadastrado</div>'}
        </div>
      `;
      tabsContent.appendChild(panel);
    });
  }
}

// ========================================
// SINCRONIZAÇÃO LOCALSTORAGE ↔ BACKEND
// ========================================

async function sincronizarDados() {
  if (!isOnline) {
    mostrarMensagem('⚠️ Sem conexão com o servidor', 'alerta');
    return;
  }
  
  try {
    mostrarMensagem('🔄 Sincronizando dados...', 'info');
    
    // Processar fila de sincronização
    const filaProcessada = [];
    
    for (const item of syncQueue) {
      try {
        switch (item.action) {
          case 'CREATE':
            await processarCriacao(item.data);
            break;
          case 'UPDATE':
            await processarAtualizacao(item.data);
            break;
          case 'DELETE':
            await processarExclusao(item.data);
            break;
        }
        filaProcessada.push(item);
      } catch (error) {
        console.error(`Erro ao processar item da fila:`, error);
        // Manter na fila para tentar novamente
      }
    }
    
    // Remover itens processados da fila
    syncQueue = syncQueue.filter(item => !filaProcessada.includes(item));
    salvarLocalStorage();
    
    // Recarregar dados do servidor
    await carregarOrcamentos();
    
    mostrarMensagem(`✅ Sincronização concluída! ${filaProcessada.length} itens processados`, 'sucesso');
    
  } catch (error) {
    console.error('Erro na sincronização:', error);
    mostrarMensagem('❌ Erro na sincronização', 'erro');
  }
}

async function processarCriacao(dados) {
  const dadosBackend = {
    data: dados.data,
    validade: parseInt(dados.validade),
    tags: dados.tags || '',
    forma_pagamento: dados.forma_pagamento,
    status: dados.status,
    observacoes: dados.observacoes || '',
    decisao: dados.decisao || '',
    itens: dados.itens
  };
  
  const response = await fazerRequest('/api/orcamentos', {
    method: 'POST',
    body: new URLSearchParams(dadosBackend)
  });
  
  // Atualizar ID local com o ID do servidor
  const index = orcamentos.findIndex(o => o.id === dados.id);
  if (index !== -1) {
    orcamentos[index].id = response.id;
    orcamentos[index].numero = response.numero;
  }
}

async function processarAtualizacao(dados) {
  const dadosBackend = {
    data: dados.data,
    validade: parseInt(dados.validade),
    tags: dados.tags || '',
    forma_pagamento: dados.forma_pagamento,
    status: dados.status,
    observacoes: dados.observacoes || '',
    decisao: dados.decisao || '',
    itens: dados.itens
  };
  
  await fazerRequest(`/api/orcamentos/${dados.id}`, {
    method: 'PUT',
    body: new URLSearchParams(dadosBackend)
  });
}

async function processarExclusao(dados) {
  if (dados.id && dados.id !== 'temp') {
    await fazerRequest(`/api/orcamentos/${dados.id}`, {
      method: 'DELETE'
    });
  }
}

// Monitorar status da conexão
function monitorarConexao() {
  const checkConnection = async () => {
    const wasOnline = isOnline;
    await testarConexao();
    
    if (wasOnline && !isOnline) {
      mostrarMensagem('⚠️ Conexão perdida - modo offline ativado', 'alerta');
    } else if (!wasOnline && isOnline) {
      mostrarMensagem('✅ Conexão restaurada!', 'sucesso');
      // Tentar sincronizar automaticamente
      if (syncQueue.length > 0) {
        setTimeout(sincronizarDados, 2000);
      }
    }
  };
  
  // Verificar a cada 30 segundos
  setInterval(checkConnection, 30000);
  
  // Verificar quando a página voltar a ficar visível
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkConnection();
    }
  });
}

// Função para exportar backup dos dados
function exportarBackup() {
  const backup = {
    orcamentos: orcamentos,
    categorias: categorias,
    syncQueue: syncQueue,
    timestamp: new Date().toISOString(),
    version: '1.0'
  };
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_orcamentos_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  mostrarMensagem('💾 Backup exportado com sucesso!', 'sucesso');
}

// Função para importar backup
function importarBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const backup = JSON.parse(e.target.result);
        
        if (backup.version && backup.orcamentos) {
          if (confirm('Importar backup? Isso substituirá os dados atuais.')) {
            orcamentos = backup.orcamentos || [];
            categorias = backup.categorias || categorias;
            syncQueue = backup.syncQueue || [];
            
            salvarLocalStorage();
            atualizarTabela();
            atualizarDashboard();
            atualizarSelectsCategoria();
            
            mostrarMensagem('📥 Backup importado com sucesso!', 'sucesso');
          }
        } else {
          throw new Error('Formato de backup inválido');
        }
      } catch (error) {
        console.error('Erro ao importar backup:', error);
        mostrarMensagem('❌ Erro ao importar backup - arquivo inválido', 'erro');
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
}

// Função para testar conexão manualmente
function testarConexao() {
  const btn = document.querySelector('.btn-test');
  const originalText = btn.textContent;
  btn.innerHTML = '<span class="loading"></span> Testando...';
  btn.disabled = true;
  
  setTimeout(async () => {
    try {
      const resultado = await testarConexao();
      if (resultado) {
        btn.textContent = '✅ Conectado';
        btn.style.background = 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)';
      } else {
        btn.textContent = '❌ Desconectado';
        btn.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
      }
    } catch (error) {
      btn.textContent = '❌ Erro';
      btn.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
    }
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.disabled = false;
    }, 3000);
  }, 1000);
}

// Função para salvar configurações
function salvarConfiguracoes() {
  const apiUrl = document.getElementById('apiUrl').value.trim();
  if (apiUrl) {
    localStorage.setItem('apiUrl', apiUrl);
    API_CONFIG.baseUrl = apiUrl;
    mostrarMensagem('⚙️ Configurações salvas!', 'sucesso');
    document.getElementById('modalConfig').style.display = 'none';
  }
}

// ========================================
// UPLOAD E PREVIEW DE ANEXOS
// ========================================

// Variável para armazenar anexos temporários
let anexosTemporarios = [];

// Inicializar sistema de anexos
function inicializarAnexos() {
  const inputAnexos = document.getElementById('anexos');
  const previewContainer = document.getElementById('anexosPreview');
  
  if (!inputAnexos || !previewContainer) return;
  
  // Evento para seleção de arquivos
  inputAnexos.addEventListener('change', handleFileSelect);
  
  // Drag and drop
  previewContainer.addEventListener('dragover', handleDragOver);
  previewContainer.addEventListener('drop', handleDrop);
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  processarArquivos(files);
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.style.borderColor = '#007BFF';
  event.currentTarget.style.backgroundColor = '#f8f9fa';
}

function handleDrop(event) {
  event.preventDefault();
  event.currentTarget.style.borderColor = '#e9ecef';
  event.currentTarget.style.backgroundColor = 'transparent';
  
  const files = Array.from(event.dataTransfer.files);
  processarArquivos(files);
}

function processarArquivos(files) {
  files.forEach(file => {
    // Validar tipo de arquivo
    const tiposPermitidos = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!tiposPermitidos.includes(file.type)) {
      mostrarMensagem(`❌ Tipo de arquivo não suportado: ${file.name}`, 'erro');
      return;
    }
    
    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      mostrarMensagem(`❌ Arquivo muito grande: ${file.name} (máximo 10MB)`, 'erro');
      return;
    }
    
    // Criar preview
    const anexo = {
      id: Date.now() + Math.random(),
      file: file,
      nome: file.name,
      tipo: file.type,
      tamanho: file.size,
      url: null
    };
    
    // Gerar preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        anexo.url = e.target.result;
        adicionarPreviewAnexo(anexo);
      };
      reader.readAsDataURL(file);
    } else {
      adicionarPreviewAnexo(anexo);
    }
    
    anexosTemporarios.push(anexo);
  });
}

function adicionarPreviewAnexo(anexo) {
  const previewContainer = document.getElementById('anexosPreview');
  
  const anexoElement = document.createElement('div');
  anexoElement.className = 'anexo-item';
  anexoElement.dataset.anexoId = anexo.id;
  
  let previewContent = '';
  
  if (anexo.url && anexo.tipo.startsWith('image/')) {
    previewContent = `<img src="${anexo.url}" alt="${anexo.nome}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />`;
  } else {
    // Ícone baseado no tipo de arquivo
    const icon = getFileIcon(anexo.tipo);
    previewContent = `<span style="font-size: 2rem;">${icon}</span>`;
  }
  
  anexoElement.innerHTML = `
    ${previewContent}
    <div style="flex: 1; margin-left: 0.5rem;">
      <div style="font-weight: 600; font-size: 0.9rem;">${anexo.nome}</div>
      <div style="font-size: 0.8rem; color: #6c757d;">${formatFileSize(anexo.tamanho)}</div>
    </div>
    <button type="button" class="remove-anexo" onclick="removerAnexo(${anexo.id})">×</button>
  `;
  
  previewContainer.appendChild(anexoElement);
}

function getFileIcon(tipo) {
  const icons = {
    'application/pdf': '📄',
    'image/jpeg': '🖼️',
    'image/jpg': '🖼️',
    'image/png': '🖼️',
    'application/msword': '📝',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝'
  };
  return icons[tipo] || '📎';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function removerAnexo(anexoId) {
  // Remover da lista temporária
  anexosTemporarios = anexosTemporarios.filter(a => a.id !== anexoId);
  
  // Remover do DOM
  const anexoElement = document.querySelector(`[data-anexo-id="${anexoId}"]`);
  if (anexoElement) {
    anexoElement.remove();
  }
  
  mostrarMensagem('🗑️ Anexo removido', 'info');
}

async function uploadAnexos() {
  if (anexosTemporarios.length === 0) return [];
  
  const anexosEnviados = [];
  
  for (const anexo of anexosTemporarios) {
    try {
      const formData = new FormData();
      formData.append('file', anexo.file);
      
      if (isOnline) {
        // Upload para o backend
        const response = await fetch(`${API_CONFIG.baseUrl}/api/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          anexosEnviados.push({
            nome_arquivo: anexo.nome,
            caminho_arquivo: result.file_path,
            tipo_arquivo: anexo.tipo,
            tamanho: anexo.tamanho
          });
        }
      } else {
        // Salvar localmente (base64)
        const base64 = await fileToBase64(anexo.file);
        anexosEnviados.push({
          nome_arquivo: anexo.nome,
          caminho_arquivo: base64,
          tipo_arquivo: anexo.tipo,
          tamanho: anexo.tamanho
        });
      }
    } catch (error) {
      console.error('Erro ao fazer upload do anexo:', error);
      mostrarMensagem(`❌ Erro ao enviar anexo: ${anexo.nome}`, 'erro');
    }
  }
  
  // Limpar anexos temporários
  anexosTemporarios = [];
  document.getElementById('anexosPreview').innerHTML = '';
  document.getElementById('anexos').value = '';
  
  return anexosEnviados;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Função para visualizar anexo
function visualizarAnexo(anexo) {
  if (anexo.tipo_arquivo.startsWith('image/')) {
    // Abrir imagem em nova aba
    window.open(anexo.caminho_arquivo, '_blank');
  } else if (anexo.tipo_arquivo === 'application/pdf') {
    // Abrir PDF em nova aba
    window.open(anexo.caminho_arquivo, '_blank');
  } else {
    // Download para outros tipos
    const a = document.createElement('a');
    a.href = anexo.caminho_arquivo;
    a.download = anexo.nome_arquivo;
    a.click();
  }
}

// ========================================
// PROCESSAMENTO DO FORMULÁRIO
// ========================================

// Event listener para o formulário
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('orcamentoForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  // Inicializar sistema de anexos
  inicializarAnexos();
  
  // Inicializar monitoramento de conexão
  monitorarConexao();
});

async function handleFormSubmit(event) {
  event.preventDefault();
  
  try {
    // Mostrar loading
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="loading"></span> Salvando...';
    submitBtn.disabled = true;
    
    // Coletar dados do formulário
    const formData = new FormData(event.target);
    const dados = {
      data: formData.get('data'),
      validade: formData.get('validade'),
      tags: formData.get('tags'),
      pagamento: formData.get('pagamento'),
      status: formData.get('status'),
      observacoes: formData.get('observacoes'),
      decisao: formData.get('decisao')
    };
    
    // Validar dados obrigatórios
    if (!dados.data || !dados.validade || !dados.pagamento || !dados.status) {
      throw new Error('Preencha todos os campos obrigatórios');
    }
    
    // Coletar itens
    const itens = coletarItens();
    if (itens.length === 0) {
      throw new Error('Adicione pelo menos um item ao orçamento');
    }
    
    dados.itens = itens;
    
    // Upload de anexos
    const anexos = await uploadAnexos();
    dados.anexos = anexos;
    
    // Salvar orçamento
    await salvarOrcamento(dados, editandoIndice !== null);
    
  } catch (error) {
    console.error('Erro ao processar formulário:', error);
    mostrarMensagem(`❌ ${error.message}`, 'erro');
  } finally {
    // Restaurar botão
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.textContent = editandoIndice !== null ? '💾 Atualizar Orçamento' : '💾 Salvar Orçamento';
    submitBtn.disabled = false;
  }
}

function coletarItens() {
  const itens = [];
  const itemBlocks = document.querySelectorAll('.item-block');
  
  itemBlocks.forEach((itemBlock, index) => {
    const descricao = itemBlock.querySelector('input[name="descricao[]"]').value;
    const categoria = itemBlock.querySelector('select[name="categoria[]"]').value;
    const quantidade = parseFloat(itemBlock.querySelector('input[name="quantidade[]"]').value);
    const unidade = itemBlock.querySelector('select[name="unidade[]"]').value;
    const unidadePersonalizada = itemBlock.querySelector('input[name="unidadePersonalizada[]"]').value;
    
    if (!descricao || !categoria || !quantidade) {
      throw new Error(`Item ${index + 1}: Preencha descrição, categoria e quantidade`);
    }
    
    // Coletar fornecedores
    const fornecedores = [];
    const fornecedorBlocks = itemBlock.querySelectorAll('.fornecedor-block');
    
    fornecedorBlocks.forEach(fornecedorBlock => {
      const nome = fornecedorBlock.querySelector('input[name="fornecedor[]"]').value;
      const preco = parseFloat(fornecedorBlock.querySelector('input[name="preco[]"]').value);
      const frete = parseFloat(fornecedorBlock.querySelector('input[name="frete[]"]').value) || 0;
      
      if (!nome || !preco) {
        throw new Error(`Fornecedor do item ${index + 1}: Preencha nome e preço`);
      }
      
      fornecedores.push({ nome, preco, frete });
    });
    
    if (fornecedores.length === 0) {
      throw new Error(`Item ${index + 1}: Adicione pelo menos um fornecedor`);
    }
    
    const item = {
      descricao,
      categoria,
      quantidade,
      unidade: unidade === 'personalizada' ? unidadePersonalizada : unidade,
      fornecedores
    };
    
    itens.push(item);
  });
  
  return itens;
}

// ========================================
// EXPORTAÇÃO EXCEL E PDF
// ========================================

function exportarExcel() {
  try {
    // Preparar dados para exportação
    const dadosExportacao = [];
    
    orcamentos.forEach(orcamento => {
      const itens = typeof orcamento.itens === 'string' ? JSON.parse(orcamento.itens) : orcamento.itens;
      
      if (itens && itens.length > 0) {
        itens.forEach(item => {
          if (item.fornecedores && item.fornecedores.length > 0) {
            item.fornecedores.forEach(fornecedor => {
              const total = (parseFloat(fornecedor.preco) * parseFloat(item.quantidade)) + parseFloat(fornecedor.frete || 0);
              
              dadosExportacao.push({
                'Número Orçamento': orcamento.numero,
                'Data': new Date(orcamento.data).toLocaleDateString('pt-BR'),
                'Status': orcamento.status,
                'Forma Pagamento': orcamento.forma_pagamento,
                'Tags': orcamento.tags || '',
                'Descrição Item': item.descricao,
                'Categoria': item.categoria,
                'Quantidade': item.quantidade,
                'Unidade': item.unidade,
                'Fornecedor': fornecedor.nome,
                'Preço Unitário': fornecedor.preco,
                'Frete': fornecedor.frete || 0,
                'Total': total,
                'Observações': orcamento.observacoes || '',
                'Decisão': orcamento.decisao || ''
              });
            });
          }
        });
      }
    });
    
    if (dadosExportacao.length === 0) {
      mostrarMensagem('❌ Nenhum dado para exportar', 'erro');
      return;
    }
    
    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExportacao);
    
    // Ajustar largura das colunas
    const colWidths = [
      { wch: 15 }, // Número Orçamento
      { wch: 12 }, // Data
      { wch: 12 }, // Status
      { wch: 15 }, // Forma Pagamento
      { wch: 20 }, // Tags
      { wch: 30 }, // Descrição Item
      { wch: 20 }, // Categoria
      { wch: 10 }, // Quantidade
      { wch: 10 }, // Unidade
      { wch: 25 }, // Fornecedor
      { wch: 15 }, // Preço Unitário
      { wch: 10 }, // Frete
      { wch: 15 }, // Total
      { wch: 30 }, // Observações
      { wch: 30 }  // Decisão
    ];
    ws['!cols'] = colWidths;
    
    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Orçamentos');
    
    // Gerar arquivo
    const fileName = `orcamentos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    mostrarMensagem('✅ Excel exportado com sucesso!', 'sucesso');
    
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    mostrarMensagem('❌ Erro ao exportar Excel', 'erro');
  }
}

function exportarPDF() {
  try {
    // Criar conteúdo do PDF
    let conteudo = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .orcamento { margin-bottom: 30px; border: 1px solid #ccc; padding: 15px; }
            .orcamento h3 { color: #007BFF; margin-top: 0; }
            .info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
            .item { margin-bottom: 15px; padding: 10px; background: #f8f9fa; }
            .fornecedor { margin: 5px 0; padding: 5px; border-left: 3px solid #007BFF; }
            .melhor { border-left-color: #28a745; background: #d4edda; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 Relatório de Orçamentos</h1>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
    `;
    
    orcamentos.forEach(orcamento => {
      const itens = typeof orcamento.itens === 'string' ? JSON.parse(orcamento.itens) : orcamento.itens;
      
      conteudo += `
        <div class="orcamento">
          <h3>Orçamento #${orcamento.numero}</h3>
          <div class="info">
            <div><strong>Data:</strong> ${new Date(orcamento.data).toLocaleDateString('pt-BR')}</div>
            <div><strong>Status:</strong> ${orcamento.status}</div>
            <div><strong>Validade:</strong> ${orcamento.validade} dias</div>
            <div><strong>Pagamento:</strong> ${orcamento.forma_pagamento}</div>
            ${orcamento.tags ? `<div><strong>Tags:</strong> ${orcamento.tags}</div>` : ''}
          </div>
      `;
      
      if (orcamento.observacoes) {
        conteudo += `<p><strong>Observações:</strong> ${orcamento.observacoes}</p>`;
      }
      
      if (orcamento.decisao) {
        conteudo += `<p><strong>Decisão:</strong> ${orcamento.decisao}</p>`;
      }
      
      if (itens && itens.length > 0) {
        conteudo += `<h4>Itens:</h4>`;
        
        itens.forEach((item, index) => {
          conteudo += `
            <div class="item">
              <h5>Item ${index + 1}: ${item.descricao}</h5>
              <p><strong>Categoria:</strong> ${item.categoria} | <strong>Quantidade:</strong> ${item.quantidade} ${item.unidade}</p>
          `;
          
          if (item.fornecedores && item.fornecedores.length > 0) {
            const fornecedoresComTotal = item.fornecedores.map(f => ({
              ...f,
              total: (parseFloat(f.preco) * parseFloat(item.quantidade)) + parseFloat(f.frete || 0)
            }));
            
            const menorTotal = Math.min(...fornecedoresComTotal.map(f => f.total));
            
            fornecedoresComTotal.forEach(fornecedor => {
              const isMelhor = fornecedor.total === menorTotal;
              conteudo += `
                <div class="fornecedor ${isMelhor ? 'melhor' : ''}">
                  <strong>${fornecedor.nome}</strong> ${isMelhor ? '🏆' : ''}<br>
                  Preço: R$ ${fornecedor.preco} | Frete: R$ ${fornecedor.frete || 0} | Total: R$ ${fornecedor.total.toFixed(2)}
                </div>
              `;
            });
          }
          
          conteudo += `</div>`;
        });
      }
      
      conteudo += `</div>`;
    });
    
    conteudo += `
        </body>
      </html>
    `;
    
    // Gerar PDF usando jsPDF (se disponível) ou abrir em nova aba
    if (typeof jsPDF !== 'undefined') {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Converter HTML para PDF (simplificado)
      doc.html(conteudo, {
        callback: function(doc) {
          doc.save(`orcamentos_${new Date().toISOString().split('T')[0]}.pdf`);
        },
        margin: [10, 10, 10, 10],
        autoPaging: 'text'
      });
    } else {
      // Fallback: abrir HTML em nova aba para impressão
      const blob = new Blob([conteudo], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.click();
      URL.revokeObjectURL(url);
    }
    
    mostrarMensagem('✅ PDF gerado com sucesso!', 'sucesso');
    
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    mostrarMensagem('❌ Erro ao exportar PDF', 'erro');
  }
}

// ========================================
// FILTROS E BUSCA
// ========================================

function aplicarFiltros() {
  const filtroBusca = document.getElementById('filtroBusca').value.toLowerCase();
  const filtroStatus = document.getElementById('filtroStatus').value;
  
  const orcamentosFiltrados = orcamentos.filter(orcamento => {
    // Filtro de busca
    const buscaMatch = !filtroBusca || 
      orcamento.numero.toString().includes(filtroBusca) ||
      (orcamento.tags && orcamento.tags.toLowerCase().includes(filtroBusca)) ||
      orcamento.status.toLowerCase().includes(filtroBusca);
    
    // Filtro de status
    const statusMatch = !filtroStatus || orcamento.status === filtroStatus;
    
    return buscaMatch && statusMatch;
  });
  
  atualizarTabelaComFiltros(orcamentosFiltrados);
}

function atualizarTabelaComFiltros(orcamentosFiltrados) {
  const tbody = document.querySelector("#tabelaOrcamentos tbody");
  tbody.innerHTML = "";
  
  if (orcamentosFiltrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: #6c757d;">
          🔍 Nenhum orçamento encontrado com os filtros aplicados
        </td>
      </tr>
    `;
    return;
  }
  
  orcamentosFiltrados.forEach((orcamento, index) => {
    const originalIndex = orcamentos.findIndex(o => o.id === orcamento.id);
    
    const row = document.createElement("tr");
    
    // Calcular totais
    let totalGeral = 0;
    let economiaTotal = 0;
    let totalItens = 0;
    
    if (orcamento.itens) {
      const itens = typeof orcamento.itens === 'string' ? JSON.parse(orcamento.itens) : orcamento.itens;
      totalItens = itens.length;
      
      itens.forEach(item => {
        if (item.fornecedores && item.fornecedores.length > 0) {
          const totais = item.fornecedores.map(f => 
            (parseFloat(f.preco) * parseFloat(item.quantidade)) + parseFloat(f.frete || 0)
          );
          const menorPreco = Math.min(...totais);
          totalGeral += menorPreco;
          
          if (totais.length > 1) {
            const ordenados = totais.sort((a, b) => a - b);
            economiaTotal += ordenados[1] - ordenados[0];
          }
        }
      });
    }
    
    // Status badge
    const statusClass = `status-${orcamento.status.toLowerCase()}`;
    const statusBadge = `<span class="status-badge ${statusClass}">${orcamento.status}</span>`;
    
    row.innerHTML = `
      <td>
        <a href="#" onclick="abrirDetalhes(${originalIndex})" style="color: #007BFF; text-decoration: none; font-weight: 600;">
          #${orcamento.numero}
        </a>
      </td>
      <td>${new Date(orcamento.data).toLocaleDateString('pt-BR')}</td>
      <td>${totalItens} item(s)</td>
      <td>${statusBadge}</td>
      <td>R$ ${totalGeral.toFixed(2)}</td>
      <td style="color: #28a745; font-weight: 600;">R$ ${economiaTotal.toFixed(2)}</td>
      <td>
        <button onclick="editarOrcamento(${originalIndex})" title="Editar" style="background: #17a2b8; margin: 0.2rem;">
          ✏️
        </button>
        <button onclick="excluirOrcamento(${originalIndex})" title="Excluir" style="background: #dc3545; margin: 0.2rem;">
          🗑️
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

// Event listeners para filtros
document.addEventListener('DOMContentLoaded', function() {
  const filtroBusca = document.getElementById('filtroBusca');
  const filtroStatus = document.getElementById('filtroStatus');
  
  if (filtroBusca) {
    filtroBusca.addEventListener('input', aplicarFiltros);
  }
  
  if (filtroStatus) {
    filtroStatus.addEventListener('change', aplicarFiltros);
  }
});

// ========================================
// INICIALIZAÇÃO FINAL
// ========================================

// Inicializar tudo quando a página carregar
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Inicializando Sistema de Controle de Orçamentos...');
  
  // Testar conexão
  await testarConexao();
  
  // Carregar dados
  await carregarOrcamentos();
  
  // Atualizar dashboard
  atualizarDashboard();
  
  // Inicializar sistema de anexos
  inicializarAnexos();
  
  // Inicializar monitoramento de conexão
  monitorarConexao();
  
  // Configurar event listeners
  const form = document.getElementById('orcamentoForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  // Configurar filtros
  const filtroBusca = document.getElementById('filtroBusca');
  const filtroStatus = document.getElementById('filtroStatus');
  
  if (filtroBusca) {
    filtroBusca.addEventListener('input', aplicarFiltros);
  }
  
  if (filtroStatus) {
    filtroStatus.addEventListener('change', aplicarFiltros);
  }
  
  console.log('✅ Sistema inicializado com sucesso!');
});

// ========================================
// FUNÇÕES DE UTILIDADE ADICIONAIS
// ========================================

// Função para formatar moeda
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

// Função para formatar data
function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

// Função para validar email
function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Função para debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Função para throttle
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Função para copiar para clipboard
function copiarParaClipboard(texto) {
  navigator.clipboard.writeText(texto).then(() => {
    mostrarMensagem('📋 Texto copiado para clipboard!', 'sucesso');
  }).catch(() => {
    mostrarMensagem('❌ Erro ao copiar texto', 'erro');
  });
}

// Função para gerar ID único
function gerarIdUnico() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Função para sanitizar HTML
function sanitizarHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Função para verificar se é mobile
function isMobile() {
  return window.innerWidth <= 768;
}

// Função para scroll suave
function scrollSuave(elemento, duracao = 300) {
  elemento.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

// Função para mostrar loading
function mostrarLoading(elemento, texto = 'Carregando...') {
  elemento.innerHTML = `<span class="loading"></span> ${texto}`;
  elemento.disabled = true;
}

// Função para esconder loading
function esconderLoading(elemento, textoOriginal) {
  elemento.textContent = textoOriginal;
  elemento.disabled = false;
}

// Função para confirmar ação
function confirmarAcao(mensagem, callback) {
  if (confirm(mensagem)) {
    callback();
  }
}

// Função para mostrar toast
function mostrarToast(mensagem, tipo = 'info', duracao = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  
  // Estilos do toast
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '500',
    zIndex: '10000',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease',
    maxWidth: '300px',
    wordWrap: 'break-word'
  });
  
  // Cores baseadas no tipo
  const cores = {
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8'
  };
  
  toast.style.backgroundColor = cores[tipo] || cores.info;
  
  document.body.appendChild(toast);
  
  // Animar entrada
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // Remover após duração
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duracao);
}

console.log('📦 Sistema de Controle de Orçamentos carregado!');
