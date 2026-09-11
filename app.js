/* ==========================================================================
   TRADING JOURNAL & PSYCHOLOGY TRACKER - APPLICATION LOGIC
   NotebookLM Integration & 3-Phase Session Workflow
   ========================================================================== */

// Supabase Configuration & Client
const SUPABASE_URL = 'https://cskkwfbibsvgvcwkgvft.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3Lv7zMVjTUwSvVMSC35y8g_eKLazEi1';
let supabaseClient = null;

// Global State
let state = {
  sessions: [],
  currentUser: null,
  isCloudSynced: false,
  currentStep: 1,
  currentDraftTrades: [],
  editingTradeIndex: -1,
  equityChart: null,
  errorsChart: null,
  currentSessionAccounts: ['FTMO 100K', 'Apex 50K #1', 'Apex 50K #2'],
  currentSessionAccountRisks: { 'FTMO 100K': 1000, 'Apex 50K #1': 500, 'Apex 50K #2': 500 },
  noTradesMode: false,
  selectedDashboardAccount: 'ALL',
  calendarDate: new Date()
};

const LOCAL_STORAGE_KEY = 'TRADING_JOURNAL_PRO_DATA_V1';
const THEME_STORAGE_KEY = 'TRADING_JOURNAL_THEME_V1';

// Ejecutar lo antes posible para evitar parpadeo de pantalla blanca
initTheme();

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadFromLocalStorage();
  initializeDefaults();
  renderDashboard();
  renderHistory();
  renderHomeMetrics();
  generateNotebookLMReport();
  initSupabase();
  initMarketSessionsClock();
  initMindsetQuotes();
});

// Load / Save LocalStorage
function loadFromLocalStorage() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (data) {
    try {
      state.sessions = JSON.parse(data);
    } catch (e) {
      console.error('Error loading data from localStorage', e);
      state.sessions = [];
    }
  }
}

function saveToLocalStorage() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.sessions));
  renderHomeMetrics();
}

function initializeDefaults() {
  // Set today's date in form
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('session-date');
  if (dateInput) dateInput.value = today;

  renderAccountsChips();
  renderRiskInputs();
  toggleRiskPerAccountBox();
  renderDashboardAccountPills();
}


// Navigation Tabs
function switchTab(tabId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => btn.getAttribute('onclick')?.includes(`'${tabId}'`));
  if (activeBtn) activeBtn.classList.add('active');

  const targetContent = document.getElementById(`tab-${tabId}`);
  if (targetContent) targetContent.classList.add('active');

  if (tabId === 'home') {
    renderHomeMetrics();
  } else if (tabId === 'dashboard') {
    renderDashboard();
  } else if (tabId === 'history') {
    renderHistory();
  } else if (tabId === 'strategy') {
    initStrategyTab();
  } else if (tabId === 'notebooklm') {
    populateSessionSelect();
    generateNotebookLMReport();
  }
}

// Phase Wizard Stepper (1 -> 2 -> 3)
function goToStep(stepNumber) {
  state.currentStep = stepNumber;

  // Update Stepper UI
  for (let i = 1; i <= 3; i++) {
    const stepBtn = document.getElementById(`step-btn-${i}`);
    const stepContent = document.getElementById(`step-content-${i}`);
    
    if (i === stepNumber) {
      stepBtn.classList.add('active');
      stepContent.style.display = 'block';
    } else {
      stepBtn.classList.remove('active');
      stepContent.style.display = 'none';
    }

    if (i < stepNumber) {
      stepBtn.classList.add('completed');
    } else {
      stepBtn.classList.remove('completed');
    }
  }
}

// Fast Form Tag/Chip Controls
function toggleChip(element, fieldId) {
  const container = element.parentElement;
  if (!container) return;

  const text = element.innerText.trim();
  
  if (fieldId === 'mistakes') {
    if (text.includes('Ninguno')) {
      if (element.classList.contains('selected') || element.classList.contains('selected-profit')) {
        element.classList.remove('selected', 'selected-profit');
      } else {
        container.querySelectorAll('.chip').forEach(c => c.classList.remove('selected', 'selected-profit', 'selected-loss'));
        element.classList.add('selected', 'selected-profit');
      }
    } else {
      const noneChip = Array.from(container.querySelectorAll('.chip')).find(c => c.innerText.includes('Ninguno'));
      if (noneChip) noneChip.classList.remove('selected', 'selected-profit', 'selected-loss');
      element.classList.toggle('selected');
    }
  } else {
    element.classList.toggle('selected');
  }

  // Collect selected chip texts
  const selected = Array.from(container.querySelectorAll('.chip.selected, .chip.selected-profit')).map(c => c.innerText.trim());
  const hiddenInput = document.getElementById(`session-${fieldId}`);
  if (hiddenInput) {
    hiddenInput.value = selected.join(', ');
  }
}

function selectRadioCard(element, fieldId, value) {
  const container = element.parentElement;
  container.querySelectorAll('.radio-card').forEach(card => card.classList.remove('selected'));
  element.classList.add('selected');

  const hiddenInput = document.getElementById(`session-${fieldId}`);
  if (hiddenInput) {
    hiddenInput.value = value;
  }
}

// Multi-Account Replicador Manager & Dynamic Risk Box
function addAccountToSession() {
  const input = document.getElementById('new-account-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;

  if (!state.currentSessionAccounts.includes(name)) {
    state.currentSessionAccounts.push(name);
    const defaultRisk = name.toLowerCase().includes('100') ? 1000 : (name.toLowerCase().includes('200') ? 2000 : 500);
    state.currentSessionAccountRisks[name] = defaultRisk;
    input.value = '';
    renderAccountsChips();
    renderRiskInputs();
    showToast(`Cuenta "${name}" agregada al replicador`, 'success');
  } else {
    showToast('Esta cuenta ya existe en la lista', 'warning');
  }
}

function quickAddAccount(name) {
  let counter = 1;
  let uniqueName = name;
  while (state.currentSessionAccounts.includes(uniqueName)) {
    counter++;
    uniqueName = `${name} #${counter}`;
  }
  state.currentSessionAccounts.push(uniqueName);
  const defaultRisk = name.toLowerCase().includes('100') ? 1000 : 500;
  state.currentSessionAccountRisks[uniqueName] = defaultRisk;
  renderAccountsChips();
  renderRiskInputs();
  showToast(`Cuenta "${uniqueName}" agregada al replicador`, 'success');
}

function removeAccountFromSession(accountName) {
  state.currentSessionAccounts = state.currentSessionAccounts.filter(a => a !== accountName);
  delete state.currentSessionAccountRisks[accountName];
  renderAccountsChips();
  renderRiskInputs();
  showToast(`Cuenta "${accountName}" removida`, 'info');
}

function renderAccountsChips() {
  const container = document.getElementById('session-accounts-chips');
  if (!container) return;

  if (state.currentSessionAccounts.length === 0) {
    container.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted);">Sin cuentas agregadas aún. Agrega una cuenta arriba.</span>';
    document.getElementById('session-account').value = 'Sin Cuenta';
    return;
  }

  container.innerHTML = state.currentSessionAccounts.map(acc => `
    <span class="chip selected" style="display: inline-flex; align-items: center; gap: 0.5rem; background: #eef2ff; color: var(--accent-primary); font-weight: 700; border-color: #c7d2fe;">
      <i class="fa-solid fa-wallet"></i> ${acc}
      <i class="fa-solid fa-xmark" style="cursor: pointer; opacity: 0.7; margin-left: 4px;" onclick="removeAccountFromSession('${acc}')" title="Eliminar cuenta"></i>
    </span>
  `).join('');

  document.getElementById('session-account').value = state.currentSessionAccounts.join(', ');
}

function renderRiskInputs() {
  const container = document.getElementById('risk-inputs-container');
  if (!container) return;

  if (state.currentSessionAccounts.length === 0) {
    container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-subtle);">Agrega cuentas arriba para definir el límite de pérdida de cada una.</p>';
    document.getElementById('total-replicator-risk').innerText = '$0.00 USD';
    return;
  }

  let totalRisk = 0;
  container.innerHTML = state.currentSessionAccounts.map(acc => {
    const risk = state.currentSessionAccountRisks[acc] !== undefined ? state.currentSessionAccountRisks[acc] : 500;
    totalRisk += parseFloat(risk) || 0;

    return `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.75rem 1rem; border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);">
        <label style="font-size: 0.85rem; color: var(--text-main); font-weight: 700; display: block; margin-bottom: 0.3rem;">
          <i class="fa-solid fa-wallet" style="color: var(--accent-primary);"></i> ${acc}
        </label>
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="font-weight: 800; color: var(--loss);">$</span>
          <input type="number" step="50" value="${risk}" oninput="updateAccountRisk('${acc}', this.value)" style="padding: 0.4rem 0.6rem; font-size: 0.9rem; font-weight: 700; border-color: #cbd5e1;" placeholder="Pérdida máx $">
          <span style="font-size: 0.75rem; color: var(--text-subtle);">USD máx</span>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('total-replicator-risk').innerText = `$${totalRisk.toFixed(2)} USD`;
}

function updateAccountRisk(acc, val) {
  state.currentSessionAccountRisks[acc] = parseFloat(val) || 0;
  
  let totalRisk = 0;
  state.currentSessionAccounts.forEach(a => {
    totalRisk += parseFloat(state.currentSessionAccountRisks[a] || 0);
  });
  document.getElementById('total-replicator-risk').innerText = `$${totalRisk.toFixed(2)} USD`;
}

function toggleRiskPerAccountBox() {
  const box = document.getElementById('risk-per-account-box');
  const checked = document.getElementById('check-accept-loss')?.checked;
  if (box) box.style.display = checked ? 'block' : 'none';
}

// Helpers para Hora y Cálculo de Puntos Técnicos en Trade Modal
function setTradeModalCurrentTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const timeInput = document.getElementById('modal-trade-time');
  if (timeInput) timeInput.value = `${hh}:${mm}`;
}

function calculatePointsDifference() {
  const entryInput = document.getElementById('modal-entry-price');
  const exitInput = document.getElementById('modal-exit-price');
  const dirInput = document.getElementById('modal-direction');
  const badge = document.getElementById('modal-points-badge');
  if (!badge) return;

  const entryVal = parseFloat(entryInput ? entryInput.value : '');
  const exitVal = parseFloat(exitInput ? exitInput.value : '');
  const direction = dirInput ? dirInput.value : 'LONG';

  if (!isNaN(entryVal) && !isNaN(exitVal) && entryVal > 0 && exitVal > 0) {
    const diff = direction === 'LONG' ? (exitVal - entryVal) : (entryVal - exitVal);
    const sign = diff > 0 ? '+' : '';
    badge.innerText = `${sign}${diff.toFixed(2)} pts`;
    badge.style.display = 'inline-block';
    badge.classList.remove('points-positive', 'points-negative');
    badge.classList.add(diff >= 0 ? 'points-positive' : 'points-negative');
  } else {
    badge.style.display = 'none';
  }
}

// Live Trade Modal Logic
function openTradeModal(editIndex = -1) {
  state.editingTradeIndex = editIndex;
  const modal = document.getElementById('trade-modal');
  const modalTitle = document.getElementById('trade-modal-title');
  const form = document.getElementById('trade-form');

  // Si estaba en modo "No hubo entradas", desactivarlo para dar paso al trade
  if (state.noTradesMode) {
    toggleNoTradesMode(false);
  }

  // Populate trade account selector
  const accSelect = document.getElementById('modal-trade-account');
  if (accSelect) {
    let accOptions = `<option value="REPLICATED">⚡ Replicado (${state.currentSessionAccounts.length} Cuentas de la Sesión)</option>`;
    state.currentSessionAccounts.forEach(acc => {
      accOptions += `<option value="${acc}">🎯 Solo ${acc}</option>`;
    });
    accSelect.innerHTML = accOptions;
  }

  // Reset image preview
  removeImagePreview();

  if (editIndex >= 0) {
    modalTitle.innerHTML = '<i class="fa-solid fa-pen"></i> Editar Trade';
    const trade = state.currentDraftTrades[editIndex];
    document.getElementById('modal-asset').value = trade.asset;
    document.getElementById('modal-direction').value = trade.direction;
    document.getElementById('modal-trade-time').value = trade.time || '';
    document.getElementById('modal-entry-price').value = (trade.entryPrice !== undefined && trade.entryPrice !== null) ? trade.entryPrice : '';
    document.getElementById('modal-exit-price').value = (trade.exitPrice !== undefined && trade.exitPrice !== null) ? trade.exitPrice : '';
    document.getElementById('modal-lots').value = trade.lots;
    document.getElementById('modal-pnl').value = trade.pnl;
    document.getElementById('modal-rr').value = trade.rr;
    document.getElementById('modal-setup').value = trade.setup;
    document.getElementById('modal-chart-url').value = trade.chartUrl || '';
    document.getElementById('modal-trade-notes').value = trade.notes || '';
    document.getElementById('modal-trade-tags').value = trade.tags || '';

    calculatePointsDifference();

    if (trade.chartImage) {
      setImagePreview(trade.chartImage);
    }

    if (accSelect) {
      accSelect.value = trade.account || 'REPLICATED';
    }

    // Sync modal trade chips
    const tradeTags = (trade.tags || '').split(',').map(t => t.trim());
    document.querySelectorAll('#modal-trade-chips .chip').forEach(chip => {
      const chipText = chip.innerText.trim();
      if (tradeTags.includes(chipText)) {
        chip.classList.add('selected');
        if (chipText.includes('Plan')) chip.classList.add('selected-profit');
      } else {
        chip.classList.remove('selected', 'selected-profit');
      }
    });
  } else {
    modalTitle.innerHTML = '<i class="fa-solid fa-chart-line"></i> Registrar Trade en Vivo';
    form.reset();
    setTradeModalCurrentTime();
    if (accSelect) {
      accSelect.value = 'REPLICATED';
    }
    document.getElementById('modal-entry-price').value = '';
    document.getElementById('modal-exit-price').value = '';
    calculatePointsDifference();

    document.getElementById('modal-lots').value = '1.0';
    document.getElementById('modal-pnl').value = '350.00';
    document.getElementById('modal-rr').value = '2.5';
    document.getElementById('modal-trade-tags').value = 'Plan Ejecutado 100%';

    document.querySelectorAll('#modal-trade-chips .chip').forEach(chip => {
      if (chip.innerText.includes('Plan')) {
        chip.classList.add('selected', 'selected-profit');
      } else {
        chip.classList.remove('selected', 'selected-profit');
      }
    });
  }

  modal.classList.add('active');
}

function closeTradeModal() {
  document.getElementById('trade-modal').classList.remove('active');
}

function toggleTradeChip(element) {
  element.classList.toggle('selected');
  if (element.innerText.includes('Plan')) {
    element.classList.toggle('selected-profit', element.classList.contains('selected'));
  }
  const container = element.parentElement;
  const selected = Array.from(container.querySelectorAll('.chip.selected, .chip.selected-profit')).map(c => c.innerText.trim());
  document.getElementById('modal-trade-tags').value = selected.join(', ');
}

// Screenshot & Image Handling for Trade Modal
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    processImageFile(file);
  }
}

function processImageFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Por favor selecciona un archivo de imagen válido', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const maxDim = 1600;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      setImagePreview(compressedBase64);
      showToast('Pantallazo cargado y optimizado correctamente', 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setImagePreview(base64Src) {
  document.getElementById('modal-chart-base64').value = base64Src;
  const previewImg = document.getElementById('image-preview-img');
  previewImg.src = base64Src;
  document.getElementById('image-preview-wrapper').style.display = 'block';
  document.getElementById('upload-prompt-content').style.display = 'none';
}

function removeImagePreview() {
  document.getElementById('modal-chart-base64').value = '';
  document.getElementById('modal-chart-file').value = '';
  const previewImg = document.getElementById('image-preview-img');
  previewImg.src = '';
  document.getElementById('image-preview-wrapper').style.display = 'none';
  document.getElementById('upload-prompt-content').style.display = 'flex';
}

// =============================================================================
// GESTIÓN DE SESIÓN SIN OPERACIONES (DÍA DE PACIENCIA / NO HUBO ENTRADAS)
// =============================================================================
function toggleNoTradesMode(enable) {
  state.noTradesMode = enable;
  const noTradesCard = document.getElementById('no-trades-card');
  const tradesContainer = document.getElementById('trades-table-container');
  const btnToggle = document.getElementById('btn-toggle-no-trades');

  if (enable) {
    if (noTradesCard) noTradesCard.style.display = 'block';
    if (tradesContainer) tradesContainer.style.display = 'none';
    if (btnToggle) btnToggle.classList.add('active');

    // Reset draft trades if any
    state.currentDraftTrades = [];
    document.getElementById('current-session-pnl').innerText = '$0.00';
    document.getElementById('current-session-pnl').style.color = 'var(--accent-primary)';
    document.getElementById('current-session-count').innerText = '0';

    // Auto set adherence and discipline in Phase 3
    const adherenceEl = document.getElementById('session-adherence');
    if (adherenceEl) adherenceEl.value = '100% - Ejecución Perfecta según el plan';
    const discEl = document.getElementById('session-discipline-score');
    if (discEl) {
      discEl.value = '10';
      const discVal = document.getElementById('discipline-val');
      if (discVal) discVal.innerText = '10';
    }

    showToast('Sesión marcada: No hubo entradas (Día de Paciencia)', 'info');
  } else {
    if (noTradesCard) noTradesCard.style.display = 'none';
    if (tradesContainer) tradesContainer.style.display = 'block';
    if (btnToggle) btnToggle.classList.remove('active');
    renderDraftTradesTable();
  }
}

function selectNoTradeReason(element, reason) {
  document.querySelectorAll('#no-trade-reasons-chips .chip').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
  const input = document.getElementById('session-no-trade-reason');
  if (input) input.value = reason;
}

function handleSessionChartFile(event) {
  const file = event.target.files[0];
  if (file) {
    processSessionImageFile(file);
  }
}

function processSessionImageFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Por favor selecciona un archivo de imagen válido', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const maxDim = 1600;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      setSessionChartPreview(compressedBase64);
      showToast('Gráfico de la sesión cargado y optimizado', 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setSessionChartPreview(base64Src) {
  const hiddenInput = document.getElementById('session-chart-base64');
  if (hiddenInput) hiddenInput.value = base64Src;
  const previewImg = document.getElementById('session-chart-preview-img');
  if (previewImg) previewImg.src = base64Src;
  const wrapper = document.getElementById('session-chart-preview-wrapper');
  if (wrapper) wrapper.style.display = 'block';
  const prompt = document.getElementById('session-upload-prompt');
  if (prompt) prompt.style.display = 'none';
}

function removeSessionChartPreview() {
  const hiddenInput = document.getElementById('session-chart-base64');
  if (hiddenInput) hiddenInput.value = '';
  const fileInput = document.getElementById('session-chart-file');
  if (fileInput) fileInput.value = '';
  const previewImg = document.getElementById('session-chart-preview-img');
  if (previewImg) previewImg.src = '';
  const wrapper = document.getElementById('session-chart-preview-wrapper');
  if (wrapper) wrapper.style.display = 'none';
  const prompt = document.getElementById('session-upload-prompt');
  if (prompt) prompt.style.display = 'flex';
}

// Global Clipboard Paste (Ctrl+V) listener para Modal de Trades y Sesión sin entradas
document.addEventListener('paste', (event) => {
  const tradeModal = document.getElementById('trade-modal');
  const isTradeModalOpen = tradeModal && tradeModal.classList.contains('active');

  const step2 = document.getElementById('step-content-2');
  const isStep2Open = step2 && step2.style.display !== 'none';
  const isNoTradesActive = state.noTradesMode;

  if (!isTradeModalOpen && !(isStep2Open && isNoTradesActive)) return;

  const items = (event.clipboardData || event.originalEvent.clipboardData).items;
  for (let index in items) {
    const item = items[index];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (isTradeModalOpen) {
        processImageFile(blob);
        showToast('¡Pantallazo del trade pegado desde el portapapeles!', 'success');
      } else if (isStep2Open && isNoTradesActive) {
        processSessionImageFile(blob);
        showToast('¡Gráfico de la sesión pegado desde el portapapeles!', 'success');
      }
      break;
    }
  }
});

// Lightbox Modal Handling
function openLightbox(imgSrc) {
  const modal = document.getElementById('lightbox-modal');
  document.getElementById('lightbox-img').src = imgSrc;
  modal.classList.add('active');
}

function closeLightbox() {
  document.getElementById('lightbox-modal').classList.remove('active');
}

function saveTradeFromModal(event) {
  event.preventDefault();
  
  const entryVal = parseFloat(document.getElementById('modal-entry-price')?.value);
  const exitVal = parseFloat(document.getElementById('modal-exit-price')?.value);
  const dir = document.getElementById('modal-direction').value;
  let pointsDiff = null;
  if (!isNaN(entryVal) && !isNaN(exitVal) && entryVal > 0 && exitVal > 0) {
    pointsDiff = dir === 'LONG' ? (exitVal - entryVal) : (entryVal - exitVal);
  }

  const tradeData = {
    id: (state.editingTradeIndex >= 0 && state.currentDraftTrades[state.editingTradeIndex]) ? state.currentDraftTrades[state.editingTradeIndex].id : Date.now(),
    account: document.getElementById('modal-trade-account')?.value || 'REPLICATED',
    time: document.getElementById('modal-trade-time')?.value || '',
    entryPrice: !isNaN(entryVal) ? entryVal : null,
    exitPrice: !isNaN(exitVal) ? exitVal : null,
    points: pointsDiff,
    asset: document.getElementById('modal-asset').value.trim(),
    direction: dir,
    lots: parseFloat(document.getElementById('modal-lots').value) || 1,
    pnl: parseFloat(document.getElementById('modal-pnl').value) || 0,
    rr: parseFloat(document.getElementById('modal-rr').value) || 0,
    setup: document.getElementById('modal-setup').value,
    tags: document.getElementById('modal-trade-tags').value,
    chartUrl: document.getElementById('modal-chart-url').value.trim(),
    chartImage: document.getElementById('modal-chart-base64').value,
    notes: document.getElementById('modal-trade-notes').value.trim()
  };

  if (state.editingTradeIndex >= 0) {
    state.currentDraftTrades[state.editingTradeIndex] = tradeData;
    showToast('Trade actualizado correctamente', 'success');
  } else {
    state.currentDraftTrades.push(tradeData);
    showToast('Trade agregado a la sesión', 'success');
  }

  closeTradeModal();
  renderDraftTradesTable();
}

function deleteDraftTrade(index) {
  state.currentDraftTrades.splice(index, 1);
  renderDraftTradesTable();
  showToast('Trade eliminado del borrador', 'info');
}

function renderDraftTradesTable() {
  const tbody = document.getElementById('session-trades-tbody');
  if (!tbody) return;

  if (state.currentDraftTrades.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" class="empty-state" style="padding: 2.5rem 1.5rem;">
          <i class="fa-solid fa-chart-line empty-icon" style="font-size: 2.5rem; color: var(--accent-primary); margin-bottom: 0.75rem;"></i>
          <h4 style="color: var(--text-main); margin-bottom: 0.25rem;">Sin operaciones registradas en esta sesión</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 480px; margin: 0 auto 1.25rem auto;">
            ¿Abriste posiciones hoy o el mercado no cumplió las reglas de tu estrategia? Elige una opción:
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary" onclick="openTradeModal()">
              <i class="fa-solid fa-plus"></i> + Agregar Trade en Vivo
            </button>
            <button type="button" class="btn btn-secondary btn-no-trades" onclick="toggleNoTradesMode(true)">
              <i class="fa-solid fa-shield-halved"></i> No Hubo Entradas Hoy (Subir Gráfico)
            </button>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('current-session-pnl').innerText = '$0.00';
    document.getElementById('current-session-count').innerText = '0';
    return;
  }

  let totalPnl = 0;
  tbody.innerHTML = state.currentDraftTrades.map((t, idx) => {
    totalPnl += t.pnl;
    const isWin = t.pnl >= 0;
    const pnlClass = isWin ? 'badge-profit' : 'badge-loss';
    const dirClass = t.direction === 'LONG' ? 'badge-long' : 'badge-short';

    const imageHtml = t.chartImage ? `
      <img src="${t.chartImage}" class="chart-thumbnail" onclick="openLightbox('${t.chartImage}')" title="Ver pantallazo full size">
    ` : (t.chartUrl ? `
      <a href="${t.chartUrl}" target="_blank" class="btn btn-secondary btn-sm" title="Abrir URL Gráfico"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
    ` : '-');

    let priceHtml = '-';
    if (t.entryPrice !== null && t.entryPrice !== undefined && t.exitPrice !== null && t.exitPrice !== undefined) {
      const ptsBadge = t.points !== null && t.points !== undefined ? `
        <span class="badge ${t.points >= 0 ? 'badge-profit' : 'badge-loss'}" style="font-size: 0.68rem; padding: 1px 5px; margin-left: 4px;">
          ${t.points >= 0 ? '+' : ''}${t.points.toFixed(2)} pts
        </span>
      ` : '';
      priceHtml = `<div style="font-size: 0.8rem; white-space: nowrap;"><strong>${t.entryPrice}</strong> ➔ <strong>${t.exitPrice}</strong>${ptsBadge}</div>`;
    } else if (t.entryPrice !== null && t.entryPrice !== undefined) {
      priceHtml = `<span style="font-size: 0.8rem;">Entrada: <strong>${t.entryPrice}</strong></span>`;
    }

    return `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td><span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;"><i class="fa-regular fa-clock"></i> ${t.time || '--:--'}</span></td>
        <td>
          <strong>${t.asset}</strong>
          ${(t.account && t.account !== 'REPLICATED')
            ? `<div style="margin-top: 2px;"><span class="badge" style="font-size: 0.65rem; background: #e0e7ff; color: #4338ca;"><i class="fa-solid fa-wallet"></i> ${t.account}</span></div>`
            : `<div style="margin-top: 2px;"><span class="badge" style="font-size: 0.65rem; background: #f1f5f9; color: var(--text-muted);"><i class="fa-solid fa-bolt"></i> Replicado</span></div>`}
        </td>
        <td><span class="badge ${dirClass}">${t.direction}</span></td>
        <td>${priceHtml}</td>
        <td>${t.lots} Lotes</td>
        <td>${t.setup}</td>
        <td>${imageHtml}</td>
        <td><span style="font-size: 0.8rem; color: var(--text-muted);">${t.tags || 'Plan estándar'}</span></td>
        <td><span class="badge ${pnlClass}">$${t.pnl.toFixed(2)}</span></td>
        <td><strong>1:${t.rr}</strong></td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openTradeModal(${idx})"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="btn btn-danger btn-sm" onclick="deleteDraftTrade(${idx})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');

  const pnlEl = document.getElementById('current-session-pnl');
  pnlEl.innerText = `$${totalPnl.toFixed(2)}`;
  pnlEl.style.color = totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)';
  document.getElementById('current-session-count').innerText = state.currentDraftTrades.length;
}

// Complete Session Save Handler
function handleSaveSession(event) {
  if (event) {
    event.preventDefault();
  }

  try {
    let totalRiskSum = 0;
    if (state.currentSessionAccounts && Array.isArray(state.currentSessionAccounts)) {
      state.currentSessionAccounts.forEach(a => {
        totalRiskSum += parseFloat(state.currentSessionAccountRisks?.[a] || 0);
      });
    }

    const dateInput = document.getElementById('session-date');
    const timeSlotInput = document.getElementById('session-time-slot');
    const biasInput = document.getElementById('session-bias');
    const preEmotionInput = document.getElementById('session-pre-emotion');
    const energyInput = document.getElementById('session-energy');
    const checkNewsInput = document.getElementById('check-news');
    const checkLevelsInput = document.getElementById('check-levels');
    const checkAcceptLossInput = document.getElementById('check-accept-loss');
    const adherenceInput = document.getElementById('session-adherence');
    const disciplineInput = document.getElementById('session-discipline-score');
    const mistakesInput = document.getElementById('session-mistakes');
    const takeawayInput = document.getElementById('session-takeaway');

    const isNoTrades = state.noTradesMode;
    const noTradeReason = document.getElementById('session-no-trade-reason')?.value || 'Mercado en Consolidación / Rango sucio';
    const sessionChartImg = document.getElementById('session-chart-base64')?.value || '';
    const sessionChartUrl = document.getElementById('session-chart-url')?.value.trim() || '';
    const sessionNoTradeNotes = document.getElementById('session-no-trade-notes')?.value.trim() || '';

    const session = {
      id: 'session_' + Date.now(),
      date: dateInput?.value || new Date().toISOString().split('T')[0],
      timeSlot: timeSlotInput?.value || 'New York Open (8:00 AM - 11:30 AM)',
      account: (state.currentSessionAccounts && state.currentSessionAccounts.length > 0)
        ? state.currentSessionAccounts.join(', ')
        : 'Cuenta Fondeo #1',
      accountsList: state.currentSessionAccounts ? [...state.currentSessionAccounts] : [],
      accountRisks: state.currentSessionAccountRisks ? { ...state.currentSessionAccountRisks } : {},
      totalReplicatorRisk: totalRiskSum,
      bias: biasInput?.value || 'Alcista (Bullish)',
      preEmotion: preEmotionInput?.value || 'Calmado y Enfocado',
      energyScore: parseInt(energyInput?.value) || 8,
      checklist: {
        news: checkNewsInput ? checkNewsInput.checked : false,
        levels: checkLevelsInput ? checkLevelsInput.checked : false,
        acceptLoss: checkAcceptLossInput ? checkAcceptLossInput.checked : false,
        noTradeSession: isNoTrades ? {
          noTrades: true,
          reason: noTradeReason,
          chartImage: sessionChartImg,
          chartUrl: sessionChartUrl,
          notes: sessionNoTradeNotes
        } : null
      },
      noTrades: isNoTrades,
      noTradeReason: isNoTrades ? noTradeReason : null,
      sessionChartImage: isNoTrades ? sessionChartImg : null,
      sessionChartUrl: isNoTrades ? sessionChartUrl : null,
      noTradeNotes: isNoTrades ? sessionNoTradeNotes : null,
      folioMaestro: {
        noDo: [
          document.getElementById('session-nodo-1')?.value.trim() || '',
          document.getElementById('session-nodo-2')?.value.trim() || '',
          document.getElementById('session-nodo-3')?.value.trim() || ''
        ].filter(Boolean),
        improve: document.getElementById('session-improve')?.value.trim() || '',
        ifThen: [
          {
            feel: document.getElementById('session-ifthen-feel-1')?.value.trim() || '',
            do: document.getElementById('session-ifthen-do-1')?.value.trim() || ''
          },
          {
            feel: document.getElementById('session-ifthen-feel-2')?.value.trim() || '',
            do: document.getElementById('session-ifthen-do-2')?.value.trim() || ''
          },
          {
            feel: document.getElementById('session-ifthen-feel-3')?.value.trim() || '',
            do: document.getElementById('session-ifthen-do-3')?.value.trim() || ''
          },
          {
            feel: document.getElementById('session-ifthen-feel-4')?.value.trim() || '',
            do: document.getElementById('session-ifthen-do-4')?.value.trim() || ''
          }
        ].filter(p => p.feel || p.do)
      },
      trades: isNoTrades ? [] : (state.currentDraftTrades ? [...state.currentDraftTrades] : []),
      adherence: adherenceInput?.value || '100% - Ejecución Perfecta según el plan',
      disciplineScore: parseInt(disciplineInput?.value) || (isNoTrades ? 10 : 9),
      mistakes: isNoTrades ? (mistakesInput?.value || 'Ninguno (Plan Seguido)') : (mistakesInput?.value || ''),
      takeaway: takeawayInput?.value || (isNoTrades ? (sessionNoTradeNotes || 'Día de Paciencia y preservación de capital. Sin operaciones ejecutadas según el plan.') : ''),
      netPnl: isNoTrades ? 0 : (state.currentDraftTrades ? state.currentDraftTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) : 0)
    };

    if (!state.sessions) state.sessions = [];
    state.sessions.unshift(session); // Add to top
    saveToLocalStorage();

    // Sincronizar con Supabase si está logueado
    if (state.currentUser && supabaseClient) {
      saveSessionToCloud(session);
    }

    // Reset Folio Maestro Inputs & Textarea
    ['session-nodo-1', 'session-nodo-2', 'session-nodo-3', 'session-improve',
     'session-ifthen-feel-1', 'session-ifthen-do-1', 'session-ifthen-feel-2', 'session-ifthen-do-2',
     'session-ifthen-feel-3', 'session-ifthen-do-3', 'session-ifthen-feel-4', 'session-ifthen-do-4',
     'session-takeaway', 'session-no-trade-notes', 'session-chart-url'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Reset mistakes chips
    document.querySelectorAll('#mistakes-chips .chip').forEach(c => c.classList.remove('selected'));
    if (mistakesInput) mistakesInput.value = '';

    // Reset No Trades State & Draft
    removeSessionChartPreview();
    toggleNoTradesMode(false);
    state.currentDraftTrades = [];
    renderDraftTradesTable();
    goToStep(1);

    showToast('¡Sesión de trading guardada con éxito!', 'success');
    switchTab('dashboard');
  } catch (err) {
    console.error('Error saving trading session:', err);
    showToast('Ocurrió un error al guardar la sesión.', 'danger');
  }
}

// ==========================================================================
// MULTI-CUENTA DE FONDEO: GESTIÓN Y FILTROS
// ==========================================================================
function getAllKnownAccounts() {
  const accountsSet = new Set();
  
  if (Array.isArray(state.currentSessionAccounts)) {
    state.currentSessionAccounts.forEach(a => {
      if (a && a.trim()) accountsSet.add(a.trim());
    });
  }

  if (Array.isArray(state.sessions)) {
    state.sessions.forEach(s => {
      if (Array.isArray(s.accountsList)) {
        s.accountsList.forEach(a => {
          if (a && a.trim()) accountsSet.add(a.trim());
        });
      } else if (s.account) {
        s.account.split(',').forEach(a => {
          const clean = a.trim();
          if (clean && clean !== 'Sin Cuenta') accountsSet.add(clean);
        });
      }

      if (Array.isArray(s.trades)) {
        s.trades.forEach(t => {
          if (t.account && t.account !== 'REPLICATED' && t.account.trim()) {
            accountsSet.add(t.account.trim());
          }
        });
      }
    });
  }

  return Array.from(accountsSet);
}

function renderDashboardAccountPills() {
  const container = document.getElementById('dashboard-account-pills');
  if (!container) return;

  const accounts = getAllKnownAccounts();
  const current = state.selectedDashboardAccount || 'ALL';

  let html = `
    <div class="dash-account-pill ${current === 'ALL' ? 'active' : ''}" onclick="setDashboardAccountFilter('ALL')">
      <i class="fa-solid fa-globe"></i> Consolidado (Todas)
    </div>
  `;

  accounts.forEach(acc => {
    const isActive = current === acc;
    const safeAcc = acc.replace(/'/g, "\\'");
    html += `
      <div class="dash-account-pill ${isActive ? 'active' : ''}" onclick="setDashboardAccountFilter('${safeAcc}')">
        <i class="fa-solid fa-wallet"></i> ${acc}
      </div>
    `;
  });

  container.innerHTML = html;
}

function setDashboardAccountFilter(accountName) {
  state.selectedDashboardAccount = accountName;
  renderDashboardAccountPills();
  renderDashboard();
}

function promptAddQuickAccount() {
  const name = prompt('Nombre de la nueva cuenta de fondeo (ej: FTMO 200K, Apex 50K #3, Topstep 50K):');
  if (!name || !name.trim()) return;
  const cleanName = name.trim();
  if (!state.currentSessionAccounts.includes(cleanName)) {
    state.currentSessionAccounts.push(cleanName);
    const defaultRisk = cleanName.toLowerCase().includes('100') ? 1000 : (cleanName.toLowerCase().includes('200') ? 2000 : 500);
    state.currentSessionAccountRisks[cleanName] = defaultRisk;
  }
  setDashboardAccountFilter(cleanName);
  renderAccountsChips();
  renderRiskInputs();
  showToast(`Cuenta "${cleanName}" agregada y seleccionada`, 'success');
}

function renderAccountsComparisonTable() {
  const tbody = document.getElementById('accounts-comparison-tbody');
  const badge = document.getElementById('accounts-count-badge');
  if (!tbody) return;

  const accounts = getAllKnownAccounts();
  if (badge) {
    badge.innerText = `${accounts.length} ${accounts.length === 1 ? 'Cuenta Registrada' : 'Cuentas Registradas'}`;
  }

  if (accounts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No hay cuentas registradas aún. Agrega una cuenta arriba para comenzar a comparar.
        </td>
      </tr>
    `;
    return;
  }

  const allSessions = state.sessions || [];

  let rowsHtml = '';
  accounts.forEach(acc => {
    let accPnl = 0;
    let accTrades = 0;
    let accWins = 0;
    let accLosses = 0;
    let accGrossProfit = 0;
    let accGrossLoss = 0;
    let accPeakCapital = 0;
    let accRunningCapital = 0;
    let accMaxDrawdown = 0;

    allSessions.forEach(s => {
      const hasAccount = (s.accountsList && s.accountsList.includes(acc)) ||
                         (s.account && s.account.includes(acc));
      if (!hasAccount) return;

      (s.trades || []).forEach(t => {
        if (!t.account || t.account === 'REPLICATED' || t.account === acc) {
          accTrades++;
          accPnl += (t.pnl || 0);
          accRunningCapital += (t.pnl || 0);
          if (accRunningCapital > accPeakCapital) accPeakCapital = accRunningCapital;
          const dd = accPeakCapital - accRunningCapital;
          if (dd > accMaxDrawdown) accMaxDrawdown = dd;

          if (t.pnl >= 0) {
            accWins++;
            accGrossProfit += t.pnl;
          } else {
            accLosses++;
            accGrossLoss += Math.abs(t.pnl);
          }
        }
      });
    });

    const wr = accTrades > 0 ? ((accWins / accTrades) * 100).toFixed(1) : '0.0';
    const pf = accGrossLoss > 0 ? (accGrossProfit / accGrossLoss).toFixed(2) : (accGrossProfit > 0 ? 'INF' : '0.00');
    const risk = state.currentSessionAccountRisks?.[acc] || (acc.toLowerCase().includes('100') ? 1000 : 500);
    const isWin = accPnl >= 0;
    const pnlClass = isWin ? 'badge-profit' : 'badge-loss';

    let statusBadge = '<span class="badge" style="background: #f1f5f9; color: var(--text-muted);">Breakeven</span>';
    if (accPnl > 0) {
      statusBadge = '<span class="badge badge-profit"><i class="fa-solid fa-arrow-trend-up"></i> En Ganancia</span>';
    } else if (accPnl < 0) {
      statusBadge = '<span class="badge badge-loss"><i class="fa-solid fa-arrow-trend-down"></i> Drawdown</span>';
    }

    const isCurrentActive = state.selectedDashboardAccount === acc;
    const safeAcc = acc.replace(/'/g, "\\'");

    rowsHtml += `
      <tr style="${isCurrentActive ? 'background: rgba(79, 70, 229, 0.06);' : ''}">
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-wallet" style="color: var(--accent-primary);"></i>
            <strong>${acc}</strong>
            ${isCurrentActive ? '<span class="badge" style="background: var(--accent-primary); color: #fff; font-size: 0.65rem; padding: 2px 6px;">Filtro Activo</span>' : ''}
          </div>
        </td>
        <td><span style="font-family: var(--font-mono); font-size: 0.85rem;">$${parseFloat(risk).toFixed(0)}</span></td>
        <td><span class="badge ${pnlClass}" style="font-family: var(--font-mono); font-size: 0.85rem;">$${accPnl.toFixed(2)}</span></td>
        <td>${accTrades} <span style="font-size: 0.75rem; color: var(--text-subtle);">(${accWins}W / ${accLosses}L)</span></td>
        <td>
          <span style="font-weight: 700;">${wr}%</span>
          <div class="account-wr-bar" title="Win Rate ${wr}%">
            <div class="account-wr-fill" style="width: ${Math.min(100, Math.max(0, parseFloat(wr)))}%;"></div>
          </div>
        </td>
        <td><strong>${pf}</strong></td>
        <td><span style="color: var(--loss); font-family: var(--font-mono); font-size: 0.85rem;">-$${accMaxDrawdown.toFixed(2)}</span></td>
        <td>${statusBadge}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="setDashboardAccountFilter('${safeAcc}')" title="Filtrar Dashboard por esta cuenta">
            <i class="fa-solid fa-filter"></i> ${isCurrentActive ? 'Viendo' : 'Ver'}
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;
}

// ==========================================================================
// CALENDARIO P&L ESTILO TRADEZELLA
// ==========================================================================
function changeCalendarMonth(delta) {
  state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + delta, 1);
  renderDashboard();
}

function goToCalendarCurrentMonth() {
  state.calendarDate = new Date();
  renderDashboard();
}

function renderDashboardCalendar(filteredSessions) {
  const grid = document.getElementById('dashboard-calendar-grid');
  const title = document.getElementById('cal-month-title');
  if (!grid || !title) return;

  const viewYear = state.calendarDate.getFullYear();
  const viewMonth = state.calendarDate.getMonth(); // 0 to 11

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  title.innerText = `${monthNames[viewMonth]} ${viewYear}`;

  // Group filtered sessions and trades by YYYY-MM-DD
  const daysMap = {};
  filteredSessions.forEach(s => {
    if (!s.date) return;
    const dStr = s.date.trim();
    if (!daysMap[dStr]) {
      daysMap[dStr] = {
        sessions: [],
        trades: [],
        netPnl: 0,
        isPatienceDay: false,
        hasNotesOrMedia: false
      };
    }
    daysMap[dStr].sessions.push(s);
    if (s.noTrades) {
      daysMap[dStr].isPatienceDay = true;
    }
    if (s.chartImage || s.takeaway || (s.psychologyPlan && (s.psychologyPlan.nodo1 || s.psychologyPlan.improve))) {
      daysMap[dStr].hasNotesOrMedia = true;
    }
    (s.trades || []).forEach(t => {
      daysMap[dStr].trades.push(t);
      daysMap[dStr].netPnl += (t.pnl || 0);
      if (t.chartImage || t.chartUrl || t.notes) {
        daysMap[dStr].hasNotesOrMedia = true;
      }
    });
  });

  // Calculate calendar layout
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const today = new Date();
  const isCurrentMonthActual = (today.getFullYear() === viewYear && today.getMonth() === viewMonth);
  const actualTodayDate = today.getDate();

  let monthNetPnl = 0;
  let greenDays = 0;
  let redDays = 0;
  let patienceDays = 0;
  let totalMonthTrades = 0;

  let cellsHtml = '';

  // 1. Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDayNum = daysInPrevMonth - i;
    cellsHtml += `
      <div class="cal-day-cell day-other-month">
        <div class="cal-day-header">
          <span class="cal-day-number">${prevDayNum}</span>
        </div>
      </div>
    `;
  }

  // Format compact P&L helper: e.g. +$1.15K or -$350.00
  function formatCompactPnl(val) {
    const abs = Math.abs(val);
    const sign = val >= 0 ? '+' : '-';
    if (abs >= 1000) {
      return `${sign}$${(abs / 1000).toFixed(2)}K`;
    }
    return `${sign}$${abs.toFixed(2)}`;
  }

  // 2. Current month days
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = daysMap[dateStr];
    const isToday = isCurrentMonthActual && (day === actualTodayDate);

    if (dayData) {
      const hasTrades = dayData.trades.length > 0;
      let cellClass = '';
      let pnlFormatted = '';
      let subText = '';
      let dotClass = '';

      if (hasTrades) {
        totalMonthTrades += dayData.trades.length;
        monthNetPnl += dayData.netPnl;

        if (dayData.netPnl > 0) {
          greenDays++;
          cellClass = 'day-win';
          dotClass = 'dot-win';
        } else if (dayData.netPnl < 0) {
          redDays++;
          cellClass = 'day-loss';
          dotClass = 'dot-loss';
        } else {
          cellClass = 'day-patience';
          dotClass = 'dot-win';
        }

        const winTrades = dayData.trades.filter(t => t.pnl >= 0).length;
        const winRate = ((winTrades / dayData.trades.length) * 100).toFixed(0);
        pnlFormatted = formatCompactPnl(dayData.netPnl);
        subText = `${dayData.trades.length} ${dayData.trades.length === 1 ? 'trade' : 'trades'} • ${winRate}%`;
      } else if (dayData.isPatienceDay) {
        patienceDays++;
        cellClass = 'day-patience';
        pnlFormatted = '$0.00';
        subText = '🛡️ Paciencia';
      } else {
        cellClass = '';
        pnlFormatted = '';
        subText = '';
      }

      const mediaIcon = dayData.hasNotesOrMedia ? '<i class="fa-solid fa-camera" title="Tiene bitácora / captura"></i>' : '';
      const dotHtml = dotClass ? `<span class="cal-day-dot ${dotClass}"></span>` : '';

      cellsHtml += `
        <div class="cal-day-cell has-activity ${cellClass} ${isToday ? 'is-today' : ''}" onclick="openCalendarDayDetails('${dateStr}')" title="Ver detalle del ${day} de ${monthNames[viewMonth]}">
          <div class="cal-day-header">
            <span class="cal-day-number">${day}</span>
            <div class="cal-day-icons">
              ${mediaIcon}
              ${dotHtml}
            </div>
          </div>
          <div class="cal-day-pnl ${dayData.netPnl > 0 ? 'pnl-win' : (dayData.netPnl < 0 ? 'pnl-loss' : 'pnl-neutral')}">
            ${pnlFormatted}
          </div>
          <div class="cal-day-sub">
            <span>${subText}</span>
          </div>
        </div>
      `;
    } else {
      // Day with no activity
      cellsHtml += `
        <div class="cal-day-cell ${isToday ? 'is-today' : ''}">
          <div class="cal-day-header">
            <span class="cal-day-number">${day}</span>
          </div>
          <div class="cal-day-pnl pnl-neutral" style="opacity: 0.3; font-size: 0.8rem;">-</div>
          <div class="cal-day-sub"></div>
        </div>
      `;
    }
  }

  // 3. Next month leading days to complete grid
  const totalCells = firstDayOfWeek + daysInCurrentMonth;
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    cellsHtml += `
      <div class="cal-day-cell day-other-month">
        <div class="cal-day-header">
          <span class="cal-day-number">${i}</span>
        </div>
      </div>
    `;
  }

  grid.innerHTML = cellsHtml;

  // Update month summary badges
  const pnlEl = document.getElementById('cal-month-pnl');
  if (pnlEl) {
    pnlEl.innerText = `${monthNetPnl >= 0 ? '+' : ''}$${monthNetPnl.toFixed(2)}`;
    pnlEl.className = `cal-stat-val ${monthNetPnl >= 0 ? 'profit' : 'loss'}`;
  }

  const daysEl = document.getElementById('cal-month-days');
  if (daysEl) {
    daysEl.innerText = `${greenDays}W - ${redDays}L`;
  }

  const wrEl = document.getElementById('cal-month-winrate');
  if (wrEl) {
    const totalDecidedDays = greenDays + redDays;
    const wr = totalDecidedDays > 0 ? ((greenDays / totalDecidedDays) * 100).toFixed(1) : '0.0';
    wrEl.innerText = `${wr}% WR`;
  }

  const patEl = document.getElementById('cal-month-patience');
  if (patEl) {
    patEl.innerText = `${patienceDays} 🛡️`;
  }
}

// Modal Detalle del Día
function openCalendarDayDetails(dateStr) {
  const modal = document.getElementById('calendar-day-modal');
  const title = document.getElementById('cal-day-modal-title');
  const subtitle = document.getElementById('cal-day-modal-subtitle');
  const body = document.getElementById('cal-day-modal-body');
  if (!modal || !body) return;

  const parts = dateStr.split('-');
  const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = dateObj.toLocaleDateString('es-ES', options);

  title.innerHTML = `<i class="fa-regular fa-calendar-check" style="color: var(--accent-primary);"></i> ${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}`;

  const isFiltered = state.selectedDashboardAccount && state.selectedDashboardAccount !== 'ALL';
  const targetAccount = state.selectedDashboardAccount;

  const sessions = (state.sessions || []).filter(s => {
    if (s.date !== dateStr) return false;
    if (isFiltered) {
      return (s.accountsList && s.accountsList.includes(targetAccount)) ||
             (s.account && s.account.includes(targetAccount));
    }
    return true;
  });

  subtitle.innerText = isFiltered ? `Filtro activo: ${targetAccount} • ${sessions.length} sesión(es)` : `Consolidado (Todas las cuentas) • ${sessions.length} sesión(es)`;

  let totalDayPnl = 0;
  let allTrades = [];
  let patienceSessions = [];

  sessions.forEach(s => {
    if (s.noTrades) {
      patienceSessions.push(s);
    }
    (s.trades || []).forEach(t => {
      if (!isFiltered || !t.account || t.account === 'REPLICATED' || t.account === targetAccount) {
        allTrades.push({ ...t, sessionAccount: s.account });
        totalDayPnl += (t.pnl || 0);
      }
    });
  });

  const wins = allTrades.filter(t => t.pnl >= 0).length;
  const losses = allTrades.filter(t => t.pnl < 0).length;
  const wr = allTrades.length > 0 ? ((wins / allTrades.length) * 100).toFixed(1) : '0.0';

  let bodyHtml = `
    <div class="cal-modal-summary-grid">
      <div class="cal-modal-stat-card">
        <div class="label">P&L Neto Día</div>
        <div class="val" style="color: ${totalDayPnl >= 0 ? 'var(--profit)' : 'var(--loss)'};">
          ${totalDayPnl >= 0 ? '+' : ''}$${totalDayPnl.toFixed(2)}
        </div>
      </div>
      <div class="cal-modal-stat-card">
        <div class="label">Operaciones</div>
        <div class="val">${allTrades.length}</div>
      </div>
      <div class="cal-modal-stat-card">
        <div class="label">Win Rate</div>
        <div class="val">${wr}%</div>
      </div>
      <div class="cal-modal-stat-card">
        <div class="label">Ganadas / Perdidas</div>
        <div class="val" style="font-size: 1.05rem;">${wins}W / ${losses}L</div>
      </div>
    </div>
  `;

  // Patience Sessions
  if (patienceSessions.length > 0) {
    bodyHtml += `
      <div style="margin-bottom: 1.5rem;">
        <h4 style="color: #0284c7; font-size: 0.95rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-shield-halved"></i> Registro de Día de Paciencia (Sin Operaciones)
        </h4>
    `;

    patienceSessions.forEach(ps => {
      const reason = ps.mistakes && ps.mistakes.includes('Paciencia') ? ps.mistakes : (ps.noTradeReason || 'Mercado sin setup claro / Cumplimiento del plan');
      const chartHtml = ps.chartImage ? `
        <div style="margin-top: 0.75rem;">
          <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">Captura del Gráfico:</span><br>
          <img src="${ps.chartImage}" class="chart-thumbnail" style="max-height: 140px; margin-top: 4px;" onclick="openLightbox('${ps.chartImage}')" title="Ver pantallazo full size">
        </div>
      ` : '';

      bodyHtml += `
        <div class="no-trade-history-box" style="margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span class="badge badge-no-trades"><i class="fa-solid fa-shield-halved"></i> Capital Preservado ($0.00)</span>
            <span style="font-size: 0.8rem; color: var(--text-subtle);"><i class="fa-solid fa-wallet"></i> ${ps.account}</span>
          </div>
          <p style="font-size: 0.85rem; margin: 0 0 0.4rem 0;"><strong>Motivo:</strong> ${reason}</p>
          ${ps.takeaway ? `<p style="font-size: 0.83rem; color: var(--text-muted); margin: 0 0 0.4rem 0;"><strong>Notas:</strong> ${ps.takeaway}</p>` : ''}
          ${chartHtml}
        </div>
      `;
    });

    bodyHtml += `</div>`;
  }

  // Trades List
  if (allTrades.length > 0) {
    bodyHtml += `
      <h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
        <i class="fa-solid fa-list-check" style="color: var(--accent-primary);"></i> Operaciones Ejecutadas (${allTrades.length})
      </h4>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
    `;

    allTrades.forEach((t, idx) => {
      const isWin = t.pnl >= 0;
      const pnlClass = isWin ? 'badge-profit' : 'badge-loss';
      const dirClass = t.direction === 'LONG' ? 'badge-long' : 'badge-short';
      const accountBadge = (t.account && t.account !== 'REPLICATED')
        ? `<span class="badge" style="background: #e0e7ff; color: #4338ca; font-size: 0.72rem;"><i class="fa-solid fa-wallet"></i> ${t.account}</span>`
        : `<span class="badge" style="background: #f1f5f9; color: var(--text-muted); font-size: 0.72rem;"><i class="fa-solid fa-bolt"></i> Replicado</span>`;

      let priceHtml = '';
      if (t.entryPrice !== null && t.entryPrice !== undefined && t.exitPrice !== null && t.exitPrice !== undefined) {
        const ptsBadge = t.points !== null && t.points !== undefined ? `
          <span class="badge ${t.points >= 0 ? 'badge-profit' : 'badge-loss'}" style="font-size: 0.7rem; padding: 1px 6px;">
            ${t.points >= 0 ? '+' : ''}${t.points.toFixed(2)} pts
          </span>
        ` : '';
        priceHtml = `<span style="font-size: 0.82rem; font-family: var(--font-mono);">${t.entryPrice} ➔ ${t.exitPrice}</span> ${ptsBadge}`;
      }

      const imgHtml = t.chartImage ? `
        <div style="margin-top: 0.5rem;">
          <img src="${t.chartImage}" class="chart-thumbnail" style="max-height: 120px;" onclick="openLightbox('${t.chartImage}')" title="Ver captura en grande">
        </div>
      ` : (t.chartUrl ? `
        <div style="margin-top: 0.4rem;">
          <a href="${t.chartUrl}" target="_blank" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir Gráfico TradingView</a>
        </div>
      ` : '');

      bodyHtml += `
        <div class="cal-trade-item-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-weight: 800; font-size: 0.95rem;">#${idx + 1} ${t.asset}</span>
              <span class="badge ${dirClass}">${t.direction}</span>
              ${accountBadge}
              <span style="font-size: 0.8rem; color: var(--text-subtle);"><i class="fa-regular fa-clock"></i> ${t.time || '--:--'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="badge ${pnlClass}" style="font-family: var(--font-mono); font-size: 0.95rem; font-weight: 800;">
                ${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}
              </span>
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-subtle);">1:${t.rr || '0'}</span>
            </div>
          </div>

          <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.4rem;">
            <div><strong>Lotes:</strong> ${t.lots}</div>
            <div><strong>Setup:</strong> ${t.setup || 'Plan Estándar'}</div>
            ${priceHtml ? `<div><strong>Precios:</strong> ${priceHtml}</div>` : ''}
          </div>

          ${t.tags ? `<div style="margin-bottom: 0.4rem;"><span class="chip" style="font-size: 0.75rem;">${t.tags}</span></div>` : ''}
          ${t.notes ? `<p style="font-size: 0.82rem; color: var(--text-main); margin: 0.4rem 0 0 0; background: var(--bg-main); padding: 0.5rem 0.75rem; border-radius: 6px;"><strong>Notas:</strong> ${t.notes}</p>` : ''}
          ${imgHtml}
        </div>
      `;
    });

    bodyHtml += `</div>`;
  } else if (patienceSessions.length === 0) {
    bodyHtml += `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <i class="fa-regular fa-calendar-xmark" style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.6;"></i>
        <p>No se encontraron operaciones registradas para este día con el filtro actual.</p>
      </div>
    `;
  }

  body.innerHTML = bodyHtml;
  modal.classList.add('active');
}

function closeCalendarDayModal() {
  const modal = document.getElementById('calendar-day-modal');
  if (modal) modal.classList.remove('active');
}

// Dashboard Calculations & Rendering
function renderDashboard() {
  const isFiltered = state.selectedDashboardAccount && state.selectedDashboardAccount !== 'ALL';
  const targetAccount = state.selectedDashboardAccount;
  const allSessions = state.sessions || [];

  // Filter sessions according to selected account
  const filteredSessions = allSessions.map(s => {
    if (!isFiltered) return s;

    const hasAccount = (s.accountsList && s.accountsList.includes(targetAccount)) ||
                       (s.account && s.account.includes(targetAccount));
    if (!hasAccount) return null;

    // Filter trades in this session
    const matchingTrades = (s.trades || []).filter(t => {
      if (!t.account || t.account === 'REPLICATED') return true;
      return t.account === targetAccount;
    });

    const net = s.noTrades ? 0 : matchingTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    return {
      ...s,
      trades: matchingTrades,
      netPnl: net
    };
  }).filter(Boolean);

  let totalPnl = 0;
  let totalTrades = 0;
  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalDiscipline = 0;
  let maxDrawdown = 0;
  let peakCapital = 0;
  let runningCapital = 0;

  const mistakesMap = {};

  filteredSessions.forEach(s => {
    totalDiscipline += s.disciplineScore || 10;
    
    // Process mistakes
    if (s.mistakes) {
      s.mistakes.split(',').forEach(m => {
        const clean = m.trim();
        if (clean && clean !== 'Ninguno - Seguí mi plan' && clean !== 'Ninguno (Plan Seguido)') {
          mistakesMap[clean] = (mistakesMap[clean] || 0) + 1;
        }
      });
    }

    (s.trades || []).forEach(t => {
      totalTrades++;
      totalPnl += (t.pnl || 0);
      runningCapital += (t.pnl || 0);

      if (runningCapital > peakCapital) {
        peakCapital = runningCapital;
      }
      const dd = peakCapital - runningCapital;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }

      if (t.pnl >= 0) {
        wins++;
        grossProfit += (t.pnl || 0);
      } else {
        losses++;
        grossLoss += Math.abs(t.pnl || 0);
      }
    });
  });

  // Calculate Metrics
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? 'INF' : '0.00');
  const avgDiscipline = filteredSessions.length > 0 ? (totalDiscipline / filteredSessions.length).toFixed(1) : '10.0';

  // Update UI Cards
  const pnlEl = document.getElementById('dash-net-pnl');
  if (pnlEl) {
    pnlEl.innerText = `$${totalPnl.toFixed(2)}`;
    pnlEl.style.color = totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)';
  }

  const pnlSub = document.getElementById('dash-pnl-sub');
  if (pnlSub) {
    if (isFiltered) {
      pnlSub.innerHTML = `<i class="fa-solid fa-wallet"></i> Cuenta: ${targetAccount} (${filteredSessions.length} Sesiones)`;
    } else {
      pnlSub.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> ${filteredSessions.length} Sesiones (Consolidado)`;
    }
  }

  const wrEl = document.getElementById('dash-winrate');
  if (wrEl) wrEl.innerText = `${winRate}%`;

  const wrSub = document.getElementById('dash-winrate-sub');
  if (wrSub) wrSub.innerText = `${wins} Ganadas / ${losses} Pérdidas (${totalTrades} total)`;

  const pfEl = document.getElementById('dash-profit-factor');
  if (pfEl) pfEl.innerText = profitFactor;

  const discEl = document.getElementById('dash-discipline');
  if (discEl) discEl.innerText = `${avgDiscipline} / 10`;

  const ddEl = document.getElementById('dash-drawdown');
  if (ddEl) ddEl.innerText = `$${maxDrawdown.toFixed(2)}`;

  // Render Account Pills
  renderDashboardAccountPills();

  // Render TradeZella Calendar
  renderDashboardCalendar(filteredSessions);

  // Render Charts
  renderEquityChart(filteredSessions);
  renderErrorsChart(mistakesMap);

  // Render Accounts Comparison Table
  renderAccountsComparisonTable();

  // Render Recent Table
  renderRecentSessionsTable(filteredSessions.slice(0, 5));
}

function renderRecentSessionsTable(recentSessions) {
  const tbody = document.getElementById('recent-sessions-tbody');
  if (!tbody) return;

  if (recentSessions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <i class="fa-solid fa-folder-open empty-icon"></i>
          <p>Aún no has registrado ninguna sesión. ¡Haz clic en "Nueva Sesión" para comenzar!</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = recentSessions.map(s => {
    const isWin = s.netPnl >= 0;
    const pnlClass = isWin ? 'badge-profit' : 'badge-loss';
    
    return `
      <tr>
        <td><strong>${s.date}</strong> <br><span style="font-size: 0.75rem; color: var(--text-subtle);">${s.timeSlot}</span></td>
        <td>${s.account}</td>
        <td><span class="chip" style="font-size: 0.75rem;">${s.preEmotion}</span></td>
        <td>${s.trades ? s.trades.length : 0} Trades</td>
        <td><span class="badge ${pnlClass}">$${s.netPnl.toFixed(2)}</span></td>
        <td><strong>${s.disciplineScore}/10</strong></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="exportSingleSessionReport('${s.id}')">
            <i class="fa-solid fa-brain"></i> Copy MD
          </button>
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteSession('${s.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Chart.js Implementations
function renderEquityChart(sessions) {
  const ctx = document.getElementById('chartEquity')?.getContext('2d');
  if (!ctx) return;

  if (state.equityChart) {
    state.equityChart.destroy();
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipTitle = isDark ? '#f8fafc' : '#0f172a';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  // Reverse to get chronological order for equity curve
  const chronoSessions = [...sessions].reverse();
  
  let cumulative = 0;
  const labels = ['Inicio'];
  const dataPoints = [0];

  chronoSessions.forEach(s => {
    cumulative += s.netPnl;
    labels.push(s.date);
    dataPoints.push(cumulative);
  });

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.35)');
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

  state.equityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Capital Net P&L ($)',
        data: dataPoints,
        borderColor: '#10b981',
        borderWidth: 3,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#10b981',
        pointRadius: 4,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: tooltipBg,
          titleColor: tooltipTitle,
          bodyColor: '#10b981',
          borderColor: tooltipBorder,
          borderWidth: 1,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            font: { family: 'Inter', size: 11 },
            callback: value => '$' + value
          }
        }
      }
    }
  });
}

function renderErrorsChart(mistakesMap) {
  const ctx = document.getElementById('chartErrors')?.getContext('2d');
  if (!ctx) return;

  if (state.errorsChart) {
    state.errorsChart.destroy();
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const legendColor = isDark ? '#94a3b8' : '#475569';
  const doughnutBorder = isDark ? '#111827' : '#ffffff';

  const labels = Object.keys(mistakesMap);
  const data = Object.values(mistakesMap);

  if (labels.length === 0) {
    labels.push('Sin Errores / Plan Seguido');
    data.push(1);
  }

  state.errorsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#e11d48',
          '#d97706',
          '#7c3aed',
          '#2563eb',
          '#0891b2',
          '#db2777',
          '#ea580c',
          '#0284c7',
          '#9333ea',
          '#4f46e5'
        ],
        borderWidth: 2,
        borderColor: doughnutBorder
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: legendColor, font: { family: 'Inter', size: 11 }, boxWidth: 12 }
        }
      }
    }
  });
}


// Render Full History Tab
function renderHistory() {
  const container = document.getElementById('history-list-container');
  if (!container) return;

  const sessions = state.sessions;
  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-history empty-icon"></i>
        <p>No tienes sesiones almacenadas en tu historial.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = sessions.map(s => {
    const isWin = s.netPnl >= 0;
    const pnlClass = isWin ? 'badge-profit' : 'badge-loss';

    return `
      <div class="glass-card" style="margin-bottom: 1rem;">
        <div class="card-header">
          <div>
            <h3 class="card-title">${s.date} &mdash; ${s.account}</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted);">${s.timeSlot} | Bias: ${s.bias} | Emoción: ${s.preEmotion}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span class="badge ${pnlClass}" style="font-size: 1rem; padding: 0.4rem 0.8rem;">$${s.netPnl.toFixed(2)}</span>
            <button class="btn btn-secondary btn-sm" onclick="exportSingleSessionReport('${s.id}')">
              <i class="fa-solid fa-brain"></i> Export MD
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteSession('${s.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <div style="font-size: 0.88rem; color: var(--text-main); margin-bottom: 0.75rem;">
          <strong>Disciplina:</strong> ${s.disciplineScore}/10 | <strong>Cumplimiento Plan:</strong> ${s.adherence}
          <br><strong>Errores:</strong> ${s.mistakes || 'Ninguno'}
          <br><strong>Lección Clave:</strong> ${s.takeaway || 'Sin notas adicionales.'}
        </div>

        ${s.folioMaestro && (s.folioMaestro.noDo?.length || s.folioMaestro.improve || s.folioMaestro.ifThen?.length) ? `
          <div style="background: rgba(124, 58, 237, 0.04); border: 1px solid rgba(124, 58, 237, 0.2); padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem; font-size: 0.82rem;">
            <div style="color: #7c3aed; font-weight: 700; margin-bottom: 0.3rem;"><i class="fa-solid fa-brain"></i> Folio Maestro (Medicina Preventiva):</div>
            ${s.folioMaestro.noDo?.length ? `<div style="color: var(--loss); font-weight: 600;">🚫 Hoy NO Haré: ${s.folioMaestro.noDo.join(' | ')}</div>` : ''}
            ${s.folioMaestro.improve ? `<div style="color: var(--profit); font-weight: 600;">🎯 Hoy Mejoraré: ${s.folioMaestro.improve}</div>` : ''}
            ${s.folioMaestro.ifThen?.length ? `<div style="color: var(--accent-primary); font-weight: 600;">⚡ Si-Entonces: ${s.folioMaestro.ifThen.map(p => `Si ${p.feel} ➔ ${p.do}`).join(' ; ')}</div>` : ''}
          </div>
        ` : ''}

        ${(s.noTrades || s.checklist?.noTradeSession?.noTrades) ? `
          <div class="no-trade-history-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
              <span class="badge-no-trades"><i class="fa-solid fa-shield-halved"></i> DÍA DE PACIENCIA • SIN OPERACIONES</span>
              <span style="font-size: 0.8rem; font-weight: 700; color: #0284c7;">Motivo: ${s.noTradeReason || s.checklist?.noTradeSession?.reason || 'Mercado en Consolidación / Rango sucio'}</span>
            </div>
            ${(s.sessionChartImage || s.checklist?.noTradeSession?.chartImage || s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl) ? `
              <div style="display: flex; gap: 1rem; align-items: center; margin: 0.75rem 0;">
                ${(s.sessionChartImage || s.checklist?.noTradeSession?.chartImage) ? `
                  <img src="${s.sessionChartImage || s.checklist?.noTradeSession?.chartImage}" class="chart-thumbnail" style="width: 72px; height: 72px; border-radius: 8px;" onclick="openLightbox(this.src)" title="Ver pantallazo del gráfico de la sesión">
                ` : ''}
                <div style="flex: 1;">
                  ${(s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl) ? `
                    <a href="${s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl}" target="_blank" class="btn btn-secondary btn-sm" style="margin-bottom: 0.4rem; display: inline-flex; align-items: center; gap: 4px;">
                      <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver Gráfico en TradingView
                    </a>
                  ` : ''}
                  <div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">
                    "${s.noTradeNotes || s.checklist?.noTradeSession?.notes || s.takeaway || 'Se preservó el capital al no presentarse ventajas claras en el mercado.'}"
                  </div>
                </div>
              </div>
            ` : `
              <div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic; margin-top: 0.4rem;">
                "${s.noTradeNotes || s.checklist?.noTradeSession?.notes || s.takeaway || 'Se preservó el capital al no presentarse ventajas claras en el mercado.'}"
              </div>
            `}
          </div>
        ` : (s.trades && s.trades.length > 0 ? `
          <div class="table-responsive">
            <table class="custom-table" style="font-size: 0.8rem;">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Activo</th>
                  <th>Tipo</th>
                  <th>Entrada ➔ Salida</th>
                  <th>Setup</th>
                  <th>Gráfico</th>
                  <th>P&L ($)</th>
                  <th>R:R</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                ${s.trades.map(t => {
                  const imgBtn = t.chartImage ? `
                    <img src="${t.chartImage}" class="chart-thumbnail" onclick="openLightbox('${t.chartImage}')" title="Ver pantallazo full size">
                  ` : (t.chartUrl ? `
                    <a href="${t.chartUrl}" target="_blank" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrow-up-right-from-square"></i> URL</a>
                  ` : '-');

                  let priceStr = '-';
                  if (t.entryPrice !== null && t.entryPrice !== undefined && t.exitPrice !== null && t.exitPrice !== undefined) {
                    const pts = t.points !== null && t.points !== undefined ? ` (${t.points >= 0 ? '+' : ''}${t.points.toFixed(2)} pts)` : '';
                    priceStr = `${t.entryPrice} ➔ ${t.exitPrice}${pts}`;
                  } else if (t.entryPrice !== null && t.entryPrice !== undefined) {
                    priceStr = `${t.entryPrice}`;
                  }

                  return `
                    <tr>
                      <td><span style="color: var(--text-muted); font-weight: 600;"><i class="fa-regular fa-clock"></i> ${t.time || '--:--'}</span></td>
                      <td><strong>${t.asset}</strong></td>
                      <td><span class="badge ${t.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${t.direction}</span></td>
                      <td style="font-size: 0.78rem;">${priceStr}</td>
                      <td>${t.setup}</td>
                      <td>${imgBtn}</td>
                      <td><span class="badge ${t.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">$${t.pnl.toFixed(2)}</span></td>
                      <td>1:${t.rr}</td>
                      <td>${t.notes || t.tags || '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="font-size: 0.8rem; color: var(--text-subtle);">No se registraron trades individuales en esta sesión.</p>')}
      </div>
    `;
  }).join('');
}

function filterHistory() {
  const query = document.getElementById('history-search').value.toLowerCase();
  const filtered = state.sessions.filter(s => 
    s.account.toLowerCase().includes(query) ||
    s.date.includes(query) ||
    (s.takeaway && s.takeaway.toLowerCase().includes(query))
  );

  const container = document.getElementById('history-list-container');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-state">No se encontraron sesiones que coincidan con la búsqueda.</p>';
    return;
  }

  // Render filtered inline
  const saved = state.sessions;
  state.sessions = filtered;
  renderHistory();
  state.sessions = saved;
}

function deleteSession(id) {
  if (confirm('¿Estás seguro de eliminar esta sesión del diario?')) {
    state.sessions = state.sessions.filter(s => s.id !== id);
    saveToLocalStorage();
    if (state.currentUser && supabaseClient) {
      deleteSessionFromCloud(id);
    }
    renderDashboard();
    renderHistory();
    showToast('Sesión eliminada', 'info');
  }
}

// NOTEBOOKLM MARKDOWN REPORT GENERATOR
function populateSessionSelect() {
  const select = document.getElementById('report-session-id');
  if (!select) return;

  if (state.sessions.length === 0) {
    select.innerHTML = '<option value="">No hay sesiones registradas</option>';
    return;
  }

  select.innerHTML = state.sessions.map(s => `
    <option value="${s.id}">${s.date} - ${s.account} ($${s.netPnl.toFixed(2)})</option>
  `).join('');
}

let currentReportMode = 'notebooklm';

function switchReportMode(mode) {
  currentReportMode = mode;

  const btnNotebook = document.getElementById('mode-btn-notebooklm');
  const btnPersonal = document.getElementById('mode-btn-personal');
  const bannerNotebook = document.getElementById('banner-notebooklm');
  const bannerPersonal = document.getElementById('banner-personal');
  const actionsNotebook = document.getElementById('actions-notebooklm');
  const actionsPersonal = document.getElementById('actions-personal');
  const markdownOutput = document.getElementById('markdown-output');
  const personalOutput = document.getElementById('personal-output');

  if (mode === 'personal') {
    btnNotebook.classList.remove('active');
    btnPersonal.classList.add('active');
    bannerNotebook.style.display = 'none';
    bannerPersonal.style.display = 'flex';
    actionsNotebook.style.display = 'none';
    actionsPersonal.style.display = 'flex';
    markdownOutput.style.display = 'none';
    personalOutput.style.display = 'block';
  } else {
    btnPersonal.classList.remove('active');
    btnNotebook.classList.add('active');
    bannerPersonal.style.display = 'none';
    bannerNotebook.style.display = 'flex';
    actionsPersonal.style.display = 'none';
    actionsNotebook.style.display = 'flex';
    personalOutput.style.display = 'none';
    markdownOutput.style.display = 'block';
  }

  generateNotebookLMReport();
}

function generateNotebookLMReport() {
  const reportType = document.getElementById('report-type')?.value || 'daily';
  const sessionSelectContainer = document.getElementById('session-select-container');
  const markdownOutput = document.getElementById('markdown-output');
  const personalOutput = document.getElementById('personal-output');
  if (!markdownOutput || !personalOutput) return;

  if (reportType === 'daily') {
    if (sessionSelectContainer) sessionSelectContainer.style.display = 'flex';
    const selectedId = document.getElementById('report-session-id')?.value;
    const session = state.sessions.find(s => s.id === selectedId) || state.sessions[0];

    if (!session) {
      markdownOutput.innerText = '# No hay datos suficientes\nPor favor registra una sesión o carga datos demo para generar el reporte.';
      personalOutput.innerHTML = '<p class="empty-state">No hay sesiones disponibles para mostrar.</p>';
      return;
    }

    markdownOutput.innerText = buildDailyMarkdown(session);
    personalOutput.innerHTML = buildDailyPersonalHTML(session);
  } else {
    if (sessionSelectContainer) sessionSelectContainer.style.display = 'none';
    markdownOutput.innerText = buildConsolidatedMarkdown(reportType);
    personalOutput.innerHTML = buildConsolidatedPersonalHTML(reportType);
  }
}

// Clean Personal HTML Generators (Without AI Prompts - Always Light Paper Theme)
function buildDailyPersonalHTML(s) {
  const isProfit = s.netPnl >= 0;

  const pnlClass = isProfit ? 'badge-profit' : 'badge-loss';

  let html = `
    <div class="personal-report-header" style="border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.5rem;">
      <div>
        <h2 class="personal-report-title" style="color: #0f172a !important; font-size: 1.8rem; margin-bottom: 0.25rem;">Informe Diario de Trading</h2>
        <p style="color: #64748b !important; font-size: 0.9rem;">${s.date} &bull; ${s.timeSlot} &bull; ${s.account}</p>
      </div>
      <div>
        <span class="badge ${pnlClass}" style="font-size: 1.25rem; padding: 0.5rem 1rem;">
          ${isProfit ? '+$' : '-$'}${Math.abs(s.netPnl).toFixed(2)} USD
        </span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="metrics-grid" style="margin-bottom: 1.5rem;">
      <div class="metric-card purple-theme" style="background: #ffffff !important; border: 1px solid #e2e8f0 !important;">
        <div class="metric-label" style="color: #64748b !important;">Disciplina</div>
        <div class="metric-value" style="color: #0f172a !important;">${s.disciplineScore}/10</div>
        <div class="metric-subtext" style="color: #64748b !important;">${s.adherence}</div>
      </div>
      <div class="metric-card ${isProfit ? 'profit-theme' : 'loss-theme'}" style="background: #ffffff !important; border: 1px solid #e2e8f0 !important;">
        <div class="metric-label" style="color: #64748b !important;">Estado Mental</div>
        <div class="metric-value" style="font-size: 1.2rem; color: #0f172a !important;">${s.preEmotion}</div>
        <div class="metric-subtext" style="color: #64748b !important;">Energía: ${s.energyScore}/10 | Sesgo: ${s.bias}</div>
      </div>
    </div>

    ${s.accountRisks && Object.keys(s.accountRisks).length > 0 ? `
      <div style="background: #ffffff; border: 1px solid #fecdd3; padding: 1.2rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; box-shadow: var(--shadow-sm);">
        <h4 style="color: #e11d48 !important; font-size: 0.92rem; margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-shield-halved"></i> Límites de Riesgo Monetario por Cuenta de Fondeo (Definidos Hoy):
        </h4>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          ${Object.entries(s.accountRisks).map(([accName, riskVal]) => `
            <span class="badge badge-loss" style="font-size: 0.82rem; padding: 4px 10px;">
              <i class="fa-solid fa-wallet"></i> ${accName}: Máx -$${riskVal} USD
            </span>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${s.folioMaestro && (s.folioMaestro.noDo?.length || s.folioMaestro.improve || s.folioMaestro.ifThen?.length) ? `
      <div style="background: #faf5ff; border: 1.5px solid #d8b4fe; padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; box-shadow: var(--shadow-sm);">
        <h4 style="color: #7c3aed !important; font-size: 1rem; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-brain"></i> Folio Maestro: Medicina Preventiva Psicológica (Definida Pre-Sesión)
        </h4>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; font-size: 0.88rem;">
          ${s.folioMaestro.noDo && s.folioMaestro.noDo.length > 0 ? `
            <div style="background: #ffffff; padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid #e9d5ff;">
              <strong style="color: #e11d48 !important; font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.4rem;">
                <i class="fa-solid fa-ban"></i> 1. Hoy NO Haré:
              </strong>
              <ul style="margin: 0; padding-left: 1.2rem; color: #1e293b !important; line-height: 1.5;">
                ${s.folioMaestro.noDo.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${s.folioMaestro.improve ? `
            <div style="background: #ffffff; padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid #e9d5ff;">
              <strong style="color: #059669 !important; font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.4rem;">
                <i class="fa-solid fa-crosshair"></i> 2. Hoy Mejoraré en:
              </strong>
              <p style="margin: 0; color: #1e293b !important; font-weight: 600; line-height: 1.5;">${s.folioMaestro.improve}</p>
            </div>
          ` : ''}

          ${s.folioMaestro.ifThen && s.folioMaestro.ifThen.length > 0 ? `
            <div style="grid-column: 1 / -1; background: #ffffff; padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid #e9d5ff;">
              <strong style="color: #4f46e5 !important; font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.5rem;">
                <i class="fa-solid fa-code-branch"></i> 3. Protocolos Si-Entonces (Comandos de Emergencia):
              </strong>
              <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                ${s.folioMaestro.ifThen.map(p => `
                  <div style="background: #f8fafc; padding: 0.45rem 0.85rem; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.84rem; color: #1e293b !important;">
                    <span style="color: #4f46e5 !important; font-weight: 700;">Si siento:</span> ${p.feel} <strong style="color: #4f46e5 !important; margin: 0 4px;">➔ Haré:</strong> <span style="color: #059669 !important; font-weight: 700;">${p.do}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    ` : ''}

    <!-- Trades Table or No-Trades Banner -->
    <h3 style="font-family: var(--font-heading); color: #0f172a !important; margin-bottom: 0.75rem;">Operaciones & Ejecución</h3>

  `;

  if (s.noTrades || s.checklist?.noTradeSession?.noTrades) {
    const sessionReason = s.noTradeReason || s.checklist?.noTradeSession?.reason || 'Mercado en Consolidación / Sin ventaja estadística';
    const sessionNotes = s.noTradeNotes || s.checklist?.noTradeSession?.notes || s.takeaway || 'Se preservó el capital al no presentarse ventajas claras en el mercado.';
    const sessionChart = s.sessionChartImage || s.checklist?.noTradeSession?.chartImage || s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl;

    html += `
      <div style="background: #f0fdf4; border: 1.5px solid #86efac; padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
          <h4 style="color: #15803d !important; margin: 0; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-shield-halved"></i> SESIÓN SIN OPERACIONES • DÍA DE PACIENCIA Y PRESERVACIÓN
          </h4>
          <span class="badge badge-profit" style="font-size: 0.82rem; padding: 4px 10px;">Capital 100% Protegido</span>
        </div>
        <p style="color: #1e293b !important; font-size: 0.9rem; margin: 0.3rem 0;">
          <strong>Motivo de No Operar:</strong> ${sessionReason}
        </p>
        <p style="color: #475569 !important; font-size: 0.85rem; font-style: italic; margin-top: 0.4rem;">
          "${sessionNotes}"
        </p>
      </div>

      ${sessionChart ? `
        <div class="annex-card" style="background: #ffffff; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 8px; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
            <span style="font-family: var(--font-heading); font-weight: 700; color: #0f172a !important; font-size: 1.05rem;">
              📷 Captura del Gráfico de la Sesión (Análisis Técnico & Justificación)
            </span>
            <span class="badge badge-profit">0 Trades / Disciplina 10/10</span>
          </div>
          <div style="text-align: center;">
            <img src="${sessionChart}" class="annex-img" onclick="openLightbox(this.src)" title="Haz clic para ver fullscreen">
          </div>
        </div>
      ` : ''}
    `;
  } else if (s.trades && s.trades.length > 0) {
    html += `
      <div class="table-responsive" style="margin-bottom: 1.5rem;">
        <table class="custom-table" style="background: #ffffff !important; border-collapse: collapse !important;">
          <thead>
            <tr style="background: #f8fafc !important;">
              <th class="col-center" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">#</th>
              <th class="col-center" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Hora</th>
              <th class="col-left" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Activo</th>
              <th class="col-center" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Dirección</th>
              <th class="col-center" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Entrada ➔ Salida</th>
              <th class="col-center" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Lotes</th>
              <th class="col-left" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Estrategia</th>
              <th class="col-right" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">P&L ($)</th>
              <th class="col-center" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">R:R</th>
              <th class="col-center" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Gráfico</th>
              <th class="col-left" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Etiquetas / Notas</th>
            </tr>
          </thead>
          <tbody>
            ${s.trades.map((t, idx) => {
              let priceStr = '-';
              if (t.entryPrice !== null && t.entryPrice !== undefined && t.exitPrice !== null && t.exitPrice !== undefined) {
                const pts = t.points !== null && t.points !== undefined ? `<br><small class="badge ${t.points >= 0 ? 'badge-profit' : 'badge-loss'}" style="font-size: 0.68rem; padding: 1px 4px;">${t.points >= 0 ? '+' : ''}${t.points.toFixed(2)} pts</small>` : '';
                priceStr = `<strong>${t.entryPrice}</strong> ➔ <strong>${t.exitPrice}</strong>${pts}`;
              } else if (t.entryPrice !== null && t.entryPrice !== undefined) {
                priceStr = `${t.entryPrice}`;
              }

              return `
                <tr style="border-bottom: 1px solid #e2e8f0 !important; background: #ffffff !important;">
                  <td class="col-center" style="color: #0f172a !important;"><strong>${idx + 1}</strong></td>
                  <td class="col-center" style="color: #64748b !important; font-size: 0.82rem; font-weight: 600;">${t.time || '--:--'}</td>
                  <td class="col-left" style="color: #0f172a !important;"><strong>${t.asset}</strong></td>
                  <td class="col-center"><span class="badge ${t.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${t.direction}</span></td>
                  <td class="col-center" style="font-size: 0.8rem;">${priceStr}</td>
                  <td class="col-center" style="color: #0f172a !important;">${t.lots}</td>
                  <td class="col-left" style="color: #0f172a !important;">${t.setup}</td>
                  <td class="col-right"><span class="badge ${t.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">$${t.pnl.toFixed(2)}</span></td>
                  <td class="col-center" style="color: #0f172a !important;">1:${t.rr}</td>
                  <td class="col-center">
                    ${t.chartImage || t.chartUrl ? `<span style="color: #059669; font-weight: 700; cursor: pointer; font-size: 0.78rem; white-space: nowrap;" onclick="openLightbox('${t.chartImage || t.chartUrl}')"><i class="fa-solid fa-camera"></i> Anexo #${idx + 1}</span>` : '-'}
                  </td>
                  <td class="col-left" style="line-height: 1.4; color: #1e293b !important;">${t.tags || '-'} ${t.notes ? `<br><small style="color: #64748b !important;">${t.notes}</small>` : ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    html += `<p style="color: #64748b !important; margin-bottom: 1.5rem;">No se realizaron operaciones en esta sesión.</p>`;
  }

  html += `
    <!-- Retrospective -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
      <h4 style="color: #4f46e5 !important; margin-bottom: 0.5rem;"><i class="fa-solid fa-lightbulb"></i> Lección Principal del Día</h4>
      <p style="font-size: 0.95rem; color: #1e293b !important;">${s.takeaway || 'Sin comentarios registrados.'}</p>
      ${s.mistakes ? `<p style="font-size: 0.85rem; color: #e11d48 !important; margin-top: 0.5rem;"><strong>Errores anotados:</strong> ${s.mistakes}</p>` : ''}
    </div>
  `;

  // Chart Annex for Daily Report (only for trade-level charts)
  const tradesWithImages = s.trades ? s.trades.filter(t => t.chartImage || t.chartUrl) : [];
  if (tradesWithImages.length > 0) {
    html += `
      <div class="print-page-break" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 2px dashed #cbd5e1;">
        <h3 style="font-family: var(--font-heading); color: #4f46e5 !important; margin-bottom: 0.5rem; font-size: 1.3rem;">
          <i class="fa-solid fa-images"></i> ANEXO: CAPTURAS DE PANTALLA Y ANÁLISIS DE GRÁFICOS
        </h3>
        <p style="font-size: 0.85rem; color: #64748b !important; margin-bottom: 1rem;">
          A continuación se presentan en tamaño completo los pantallazos asociados a las operaciones de la sesión:
        </p>
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          ${tradesWithImages.map(t => `
            <div class="annex-card" style="background: #ffffff; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">
                <span style="font-family: var(--font-heading); font-weight: 700; color: #0f172a !important; font-size: 1.05rem;">
                  📷 Anexo #${s.trades.indexOf(t) + 1}: ${t.asset} (${t.direction}) &mdash; Setup: ${t.setup}
                </span>
                <span class="badge ${t.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">
                  ${t.pnl >= 0 ? '+$' : '-$'}${Math.abs(t.pnl).toFixed(2)} USD (R:R 1:${t.rr})
                </span>
              </div>
              ${t.notes ? `<p style="font-size: 0.85rem; color: #64748b !important; margin-top: 0.5rem;"><strong>Notas / Bitácora:</strong> ${t.notes}</p>` : ''}
              <div style="text-align: center; margin-top: 0.75rem;">
                <img src="${t.chartImage || t.chartUrl}" class="annex-img" onclick="openLightbox(this.src)" title="Haz clic para ver fullscreen">
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return html;
}

function buildConsolidatedPersonalHTML(rangeType) {
  let daysLimit = 7;
  let title = 'Semanal';
  if (rangeType === 'monthly') { daysLimit = 30; title = 'Mensual'; }
  if (rangeType === 'yearly') { daysLimit = 365; title = 'Anual'; }
  if (rangeType === 'all') { daysLimit = 9999; title = 'Histórico Completo'; }

  const relevant = state.sessions.slice(0, daysLimit);
  if (relevant.length === 0) return '<p class="empty-state" style="color: #64748b !important;">No hay datos suficientes.</p>';

  let totalPnl = 0;
  let wins = 0;
  let losses = 0;
  let totalTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  const allAnnexTrades = [];

  relevant.forEach(s => {
    totalPnl += s.netPnl;
    s.trades.forEach(t => {
      totalTrades++;
      if (t.pnl >= 0) { wins++; grossProfit += t.pnl; } else { losses++; grossLoss += Math.abs(t.pnl); }
      if (t.chartImage || t.chartUrl) {
        allAnnexTrades.push({ sessionDate: s.date, account: s.account, trade: t });
      }
    });
  });

  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? 'INF' : '0.00');

  let html = `
    <div class="personal-report-header" style="border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.5rem;">
      <div>
        <h2 class="personal-report-title" style="color: #0f172a !important; font-size: 1.8rem; margin-bottom: 0.25rem;">Informe Ejecutivo ${title}</h2>
        <p style="color: #64748b !important; font-size: 0.9rem;">Consolidado de ${relevant.length} sesiones de trading</p>
      </div>
      <div>
        <span class="badge ${totalPnl >= 0 ? 'badge-profit' : 'badge-loss'}" style="font-size: 1.25rem; padding: 0.5rem 1rem;">
          ${totalPnl >= 0 ? '+$' : '-$'}${Math.abs(totalPnl).toFixed(2)} USD
        </span>
      </div>
    </div>

    <!-- High level metrics -->
    <div class="metrics-grid" style="margin-bottom: 2rem;">
      <div class="metric-card purple-theme" style="background: #ffffff !important; border: 1px solid #e2e8f0 !important;">
        <div class="metric-label" style="color: #64748b !important;">Win Rate</div>
        <div class="metric-value" style="color: #0f172a !important;">${winRate}%</div>
        <div class="metric-subtext" style="color: #64748b !important;">${wins} Ganadas / ${losses} Perdidas</div>
      </div>
      <div class="metric-card profit-theme" style="background: #ffffff !important; border: 1px solid #e2e8f0 !important;">
        <div class="metric-label" style="color: #64748b !important;">Profit Factor</div>
        <div class="metric-value" style="color: #0f172a !important;">${profitFactor}</div>
        <div class="metric-subtext" style="color: #64748b !important;">Beneficio vs Pérdida</div>
      </div>
      <div class="metric-card warning-theme" style="background: #ffffff !important; border: 1px solid #e2e8f0 !important;">
        <div class="metric-label" style="color: #64748b !important;">Total Trades</div>
        <div class="metric-value" style="color: #0f172a !important;">${totalTrades}</div>
        <div class="metric-subtext" style="color: #64748b !important;">Operaciones Ejecutadas</div>
      </div>
    </div>

    <h3 style="font-family: var(--font-heading); color: #0f172a !important; margin-bottom: 1rem;">Sesiones del Período</h3>
  `;

  relevant.forEach((s, idx) => {
    const isWin = s.netPnl >= 0;
    html += `
      <div class="personal-session-block" style="background: #ffffff !important; border: 1px solid #e2e8f0 !important; color: #0f172a !important;">
        <div class="personal-session-title" style="color: #0f172a !important;">
          <span style="color: #0f172a !important;"><strong>Día ${idx + 1}: ${s.date}</strong> (${s.account})</span>
          <span class="badge ${isWin ? 'badge-profit' : 'badge-loss'}">${isWin ? '+$' : '-$'}${Math.abs(s.netPnl).toFixed(2)}</span>
        </div>
        <p style="font-size: 0.85rem; color: #64748b !important; margin-bottom: 0.5rem;">
          <strong>Estado Pre-Mercado:</strong> ${s.preEmotion} | <strong>Disciplina:</strong> ${s.disciplineScore}/10
        </p>
        <p style="font-size: 0.9rem; color: #1e293b !important; background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.6rem 0.9rem; border-radius: 6px; margin-bottom: 0.75rem;">
          💡 <em>"${s.takeaway || 'Sin comentarios.'}"</em>
        </p>

        ${s.trades && s.trades.length > 0 ? `
          <table class="custom-table" style="font-size: 0.8rem; background: #ffffff !important; border-collapse: collapse !important;">
            <thead>
              <tr style="background: #f8fafc !important;">
                <th class="col-left" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Activo</th>
                <th class="col-center" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Dirección</th>
                <th class="col-left" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Estrategia</th>
                <th class="col-right" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">P&L ($)</th>
                <th class="col-center" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">R:R</th>
                <th class="col-center" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Captura</th>
                <th class="col-left" style="color: #0f172a !important; background: #f8fafc !important; border-bottom: 2px solid #cbd5e1 !important;">Notas</th>
              </tr>
            </thead>
            <tbody>
              ${s.trades.map((t, tIdx) => `
                <tr style="border-bottom: 1px solid #e2e8f0 !important; background: #ffffff !important;">
                  <td class="col-left" style="color: #0f172a !important;"><strong>${t.asset}</strong></td>
                  <td class="col-center"><span class="badge ${t.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${t.direction}</span></td>
                  <td class="col-left" style="color: #0f172a !important;">${t.setup}</td>
                  <td class="col-right"><span class="badge ${t.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">$${t.pnl.toFixed(2)}</span></td>
                  <td class="col-center" style="color: #0f172a !important;">1:${t.rr}</td>
                  <td class="col-center">${t.chartImage || t.chartUrl ? `<span class="badge badge-profit" onclick="openLightbox('${t.chartImage || t.chartUrl}')" style="cursor: pointer; font-size: 0.7rem;"><i class="fa-solid fa-camera"></i> Anexo</span>` : '-'}</td>
                  <td class="col-left" style="color: #1e293b !important;">${t.tags || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    `;
  });

  // Consolidated Chart Annex
  if (allAnnexTrades.length > 0) {
    html += `
      <div class="print-page-break" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 2px dashed #cbd5e1;">
        <h3 style="font-family: var(--font-heading); color: #4f46e5 !important; margin-bottom: 0.5rem; font-size: 1.3rem;">
          <i class="fa-solid fa-images"></i> ANEXO CONSOLIDADO DE CAPTURAS Y ANÁLISIS GRÁFICO
        </h3>
        <p style="font-size: 0.85rem; color: #64748b !important; margin-bottom: 1rem;">
          Galería completa de capturas de pantalla registradas en las sesiones del período (${allAnnexTrades.length} imágenes):
        </p>
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          ${allAnnexTrades.map((item, idx) => `
            <div class="annex-card" style="background: #ffffff; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">
                <span style="font-family: var(--font-heading); font-weight: 700; color: #0f172a !important; font-size: 1.05rem;">
                  📷 Anexo #${idx + 1}: ${item.sessionDate} (${item.account}) &mdash; ${item.trade.asset} (${item.trade.direction})
                </span>
                <span class="badge ${item.trade.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">
                  ${item.trade.pnl >= 0 ? '+$' : '-$'}${Math.abs(item.trade.pnl).toFixed(2)} USD (Setup: ${item.trade.setup})
                </span>
              </div>
              ${item.trade.notes ? `<p style="font-size: 0.85rem; color: #64748b !important; margin-top: 0.5rem;"><strong>Notas:</strong> ${item.trade.notes}</p>` : ''}
              <div style="text-align: center; margin-top: 0.75rem;">
                <img src="${item.trade.chartImage || item.trade.chartUrl}" class="annex-img" onclick="openLightbox(this.src)" title="Haz clic para ver fullscreen">
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return html;
}


function copyCleanTextToClipboard() {

  const container = document.getElementById('personal-output');
  if (!container) return;

  const cleanText = container.innerText;
  navigator.clipboard.writeText(cleanText).then(() => {
    showToast('¡Texto limpio copiado al portapapeles sin códigos ni etiquetas!', 'success');
  }).catch(() => {
    showToast('Error al copiar el texto', 'error');
  });
}


function buildDailyMarkdown(s) {
  const isProfit = s.netPnl >= 0;
  let md = `# DIARIO DE TRADING & PSICOLOGÍA - REPORTE DIARIO\n`;
  md += `**Fecha:** ${s.date} | **Hora/Turno:** ${s.timeSlot} | **Cuenta:** ${s.account}\n`;
  md += `**Resultado Neto (P&L):** $${s.netPnl.toFixed(2)} (${isProfit ? 'GANANCIA' : 'PÉRDIDA'})\n`;
  md += `**Índice de Disciplina:** ${s.disciplineScore}/10 | **Cumplimiento del Plan:** ${s.adherence}\n\n`;

  md += `---\n\n`;
  md += `## 1. PRE-SESIÓN (ESTADO MENTAL Y PREPARACIÓN)\n`;
  md += `- **Estado Emocional Inicial:** ${s.preEmotion}\n`;
  md += `- **Nivel de Energía / Sueño:** ${s.energyScore}/10\n`;
  md += `- **Sesgo del Mercado:** ${s.bias}\n`;
  md += `- **Checklist Ejecutado:** Noticias (${s.checklist.news ? 'Sí' : 'No'}), Niveles/Zonas (${s.checklist.levels ? 'Sí' : 'No'}), Aceptación de Riesgo (${s.checklist.acceptLoss ? 'Sí' : 'No'})\n\n`;

  if (s.folioMaestro && (s.folioMaestro.noDo?.length || s.folioMaestro.improve || s.folioMaestro.ifThen?.length)) {
    md += `### Folio Maestro: Medicina Preventiva Psicológica\n`;
    if (s.folioMaestro.noDo?.length) {
      md += `- **Hoy NO Haré (Tentaciones a Evitar):**\n`;
      s.folioMaestro.noDo.forEach(item => { md += `  - 🚫 ${item}\n`; });
    }
    if (s.folioMaestro.improve) {
      md += `- **Hoy Mejoraré en (1 Meta Concreta):** 🎯 ${s.folioMaestro.improve}\n`;
    }
    if (s.folioMaestro.ifThen?.length) {
      md += `- **Protocolos Si-Entonces (Comandos de Emergencia):**\n`;
      s.folioMaestro.ifThen.forEach(p => { md += `  - Si siento *"${p.feel}"* ➔ Haré *"${p.do}"*\n`; });
    }
    md += `\n`;
  }

  md += `## 2. OPERACIONES EJECUTADAS (EN VIVO)\n`;
  if (s.noTrades || s.checklist?.noTradeSession?.noTrades) {
    const sessionReason = s.noTradeReason || s.checklist?.noTradeSession?.reason || 'Mercado en Consolidación / Rango sucio';
    const sessionNotes = s.noTradeNotes || s.checklist?.noTradeSession?.notes || s.takeaway || 'Sin trades ejecutados según el plan.';
    const imgRef = (s.sessionChartImage || s.checklist?.noTradeSession?.chartImage) ? '[Pantallazo de la Sesión Adjunto]' : ((s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl) ? `[Link Gráfico](${s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl})` : '-');

    md += `### 🛡️ SESIÓN SIN OPERACIONES (DÍA DE PACIENCIA Y PRESERVACIÓN DE CAPITAL)\n`;
    md += `- **Estado:** Capital 100% Protegido (0 Trades ejecutados)\n`;
    md += `- **Motivo de No Operar:** ${sessionReason}\n`;
    md += `- **Análisis Técnico / Observaciones:** ${sessionNotes}\n`;
    md += `- **Captura del Gráfico:** ${imgRef}\n\n`;
  } else if (s.trades && s.trades.length > 0) {
    md += `| # | Hora | Activo | Tipo | Entrada | Salida | Pts/Pips | Lotes | Setup | P&L ($) | R:R | Captura Gráfico | Psicología / Notas |\n`;
    md += `|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
    s.trades.forEach((t, i) => {
      const imgRef = t.chartImage ? `[Pantallazo Adjunto]` : (t.chartUrl ? `[Link Gráfico](${t.chartUrl})` : '-');
      const entryStr = (t.entryPrice !== null && t.entryPrice !== undefined) ? t.entryPrice : '-';
      const exitStr = (t.exitPrice !== null && t.exitPrice !== undefined) ? t.exitPrice : '-';
      const ptsStr = (t.points !== null && t.points !== undefined) ? `${t.points >= 0 ? '+' : ''}${t.points.toFixed(2)} pts` : '-';
      md += `| ${i + 1} | ${t.time || '--:--'} | ${t.asset} | ${t.direction} | ${entryStr} | ${exitStr} | ${ptsStr} | ${t.lots} | ${t.setup} | $${t.pnl.toFixed(2)} | 1:${t.rr} | ${imgRef} | ${t.tags || '-'} ${t.notes ? '(' + t.notes + ')' : ''} |\n`;
    });
    md += `\n`;
  } else {
    md += `*No se registraron operaciones individuales en esta sesión.*\n\n`;
  }

  md += `## 3. RETROSPECTIVA & PSICOLOGÍA POST-MERCADO\n`;
  md += `- **Errores Cometidos:** ${s.mistakes || 'Ninguno - Seguí mi plan a la perfección.'}\n`;
  md += `- **Lección Clave del Día:** ${s.takeaway || 'Sin comentarios.'}\n\n`;

  md += `---\n\n`;
  md += `## PROMPT DE ANÁLISIS PARA NOTEBOOKLM\n`;
  if (s.noTrades || s.checklist?.noTradeSession?.noTrades) {
    const reasonText = s.noTradeReason || s.checklist?.noTradeSession?.reason || 'Mercado en Consolidación';
    md += `> *"Actúa como mi Head Trader y Mentor de Psicología en Trading de Cuentas de Fondeo. En esta sesión de hoy NO abrí operaciones para preservar mi capital y apegarme a mi plan. Lee este reporte y evalúa mi decisión de no operar por '${reasonText}'. Analiza la disciplina demostrada al no forzar entradas y dame recomendaciones para mantener esta paciencia en las próximas sesiones."*\n`;
  } else {
    md += `> *"Actúa como mi Head Trader y Mentor de Psicología en Trading de Cuentas de Fondeo. Lee este reporte diario junto con mi Plan de Trading pre-cargado en esta libreta. Analiza si mi ejecución hoy estuvo alineada a mis reglas, evalúa si caí en el ciclo de auge/crisis (tilteo o sobreconfianza), y dame 3 recomendaciones concretas y específicas para mi próxima sesión."*\n`;
  }

  return md;
}

function buildConsolidatedMarkdown(rangeType) {
  let daysLimit = 7;
  let title = 'SEMANAL';
  if (rangeType === 'monthly') { daysLimit = 30; title = 'MENSUAL'; }
  if (rangeType === 'yearly') { daysLimit = 365; title = 'ANUAL'; }
  if (rangeType === 'all') { daysLimit = 9999; title = 'HISTÓRICO COMPLETO'; }

  const relevant = state.sessions.slice(0, daysLimit);
  if (relevant.length === 0) {
    return '# Sin datos suficientes para consolidar.\nPor favor registra sesiones de trading o carga datos demo para generar el reporte.';
  }

  let totalPnl = 0;
  let wins = 0;
  let losses = 0;
  let totalTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let disciplineSum = 0;

  relevant.forEach(s => {
    totalPnl += s.netPnl;
    disciplineSum += s.disciplineScore || 10;
    s.trades.forEach(t => {
      totalTrades++;
      if (t.pnl >= 0) {
        wins++;
        grossProfit += t.pnl;
      } else {
        losses++;
        grossLoss += Math.abs(t.pnl);
      }
    });
  });

  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? 'INF' : '0.00');
  const avgDiscipline = (disciplineSum / relevant.length).toFixed(1);

  let md = `# DIARIO DE TRADING - REPORTE CONSOLIDADO DETALLADO (${title})\n`;
  md += `**Nota para NotebookLM:** Este archivo consolida los reportes completos de **${relevant.length} sesiones** en un solo documento para optimizar el límite de 50 archivos de tu libreta.\n\n`;
  
  md += `## 📊 RESUMEN EJECUTIVO DEL PERÍODO\n`;
  md += `- **Sesiones Incluidas:** ${relevant.length}\n`;
  md += `- **P&L Total Acumulado:** $${totalPnl.toFixed(2)} (${totalPnl >= 0 ? 'PROFIT' : 'DRAWDOWN'})\n`;
  md += `- **Win Rate:** ${winRate}% (${wins} Ganadas / ${losses} Perdidas en ${totalTrades} trades)\n`;
  md += `- **Profit Factor:** ${profitFactor}\n`;
  md += `- **Promedio de Disciplina:** ${avgDiscipline}/10\n\n`;

  md += `### TABLA RESUMEN RÁPIDA\n`;
  md += `| Fecha | Cuenta | Estado Pre | Trades | P&L ($) | Disciplina | Lección Clave |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  relevant.forEach(s => {
    md += `| ${s.date} | ${s.account} | ${s.preEmotion} | ${s.trades ? s.trades.length : 0} | $${s.netPnl.toFixed(2)} | ${s.disciplineScore}/10 | ${s.takeaway ? s.takeaway.replace(/\|/g, '') : '-'} |\n`;
  });

  md += `\n---\n\n`;
  md += `## 📁 DETALLE COMPLETO DE CADA SESIÓN DEL PERÍODO\n\n`;

  relevant.forEach((s, idx) => {
    md += `### [Sesión ${idx + 1}/${relevant.length}] &mdash; Fecha: ${s.date} (${s.account})\n`;
    md += `- **P&L de la Sesión:** $${s.netPnl.toFixed(2)}\n`;
    md += `- **Turno:** ${s.timeSlot} | **Sesgo:** ${s.bias}\n`;
    md += `- **Estado Emocional Pre-Sesión:** ${s.preEmotion} (Energía: ${s.energyScore}/10)\n`;
    md += `- **Checklist:** Noticias (${s.checklist?.news ? 'Sí' : 'No'}), Niveles (${s.checklist?.levels ? 'Sí' : 'No'}), Riesgo Aceptado (${s.checklist?.acceptLoss ? 'Sí' : 'No'})\n`;
    md += `- **Adherencia al Plan:** ${s.adherence} (Disciplina: ${s.disciplineScore}/10)\n`;
    md += `- **Errores Identificados:** ${s.mistakes || 'Ninguno - Seguí mi plan a la perfección.'}\n`;
    md += `- **Lección Principal / Reflexión:** ${s.takeaway || 'Sin notas adicooles.'}\n\n`;

    if (s.trades && s.trades.length > 0) {
      md += `#### Operaciones Ejecutadas en esta Sesión:\n`;
      md += `| # | Activo | Tipo | Lotes | Setup | P&L ($) | R:R | Captura | Notas / Psicología |\n`;
      md += `|---|---|---|---|---|---|---|---|---|\n`;
      s.trades.forEach((t, i) => {
        const imgRef = t.chartImage ? `[Pantallazo Adjunto]` : (t.chartUrl ? `[Link Gráfico](${t.chartUrl})` : '-');
        md += `| ${i + 1} | ${t.asset} | ${t.direction} | ${t.lots} | ${t.setup} | $${t.pnl.toFixed(2)} | 1:${t.rr} | ${imgRef} | ${t.tags || '-'} ${t.notes ? '(' + t.notes + ')' : ''} |\n`;
      });
      md += `\n`;
    } else {
      md += `*No se registraron trades individuales en esta sesión.*\n\n`;
    }

    md += `---\n\n`;
  });

  md += `## 🤖 PROMPT AUDITOR DE PERÍODO PARA NOTEBOOKLM\n`;
  md += `> *"Actúa como mi Head Risk Manager y Coach de Trading de Prop Firm. Analiza este reporte consolidado ${title.toLowerCase()} que contiene el detalle completo de mis últimas ${relevant.length} sesiones de trading junto con mi Plan de Trading pre-cargado en esta libreta. Identifica patrones emocionales recurrentes (especialmente si caí en el ciclo de auge/crisis por sobreconfianza o tilteo), evalúa mi porcentaje real de cumplimiento de reglas y redacta una auditoría con 4 áreas clave de mejora prioritarias para mi próxima semana de operaciones."*\n`;

  return md;
}


function exportSingleSessionReport(sessionId) {
  switchTab('notebooklm');
  document.getElementById('report-type').value = 'daily';
  populateSessionSelect();
  document.getElementById('report-session-id').value = sessionId;
  generateNotebookLMReport();
  copyMarkdownToClipboard();
}

function copyMarkdownToClipboard() {
  const text = document.getElementById('markdown-output').innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('¡Markdown copiado al portapapeles! Listo para pegar en NotebookLM.', 'success');
  }).catch(() => {
    showToast('Error al copiar al portapapeles', 'error');
  });
}

function downloadMarkdownFile() {
  const text = document.getElementById('markdown-output').innerText;
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Trading_Journal_Report_${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Archivo Markdown descargado', 'success');
}

// Backup & Demo Data Loaders
function exportBackupJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.sessions, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `trading_journal_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Copia de seguridad JSON descargada', 'success');
}

function triggerImportBackup() {
  const fileInput = document.getElementById('backup-file-input');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}

function importBackupJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedSessions = JSON.parse(e.target.result);
      if (Array.isArray(importedSessions)) {
        if (confirm(`Se encontraron ${importedSessions.length} sesiones en el archivo de respaldo. ¿Deseas restaurarlas en tu diario?`)) {
          state.sessions = importedSessions;
          saveToLocalStorage();
          renderDashboard();
          renderHistory();
          if (typeof generateNotebookLMReport === 'function') generateNotebookLMReport();
          showToast(`¡Se restauraron ${importedSessions.length} sesiones con éxito!`, 'success');

          // Si está logueado en Supabase, subir también el respaldo importado a la nube
          if (state.currentUser && supabaseClient && typeof syncSessionsArrayToCloud === 'function') {
            syncSessionsArrayToCloud(importedSessions);
          }
        }
      } else {
        showToast('El archivo JSON no tiene un formato válido de respaldo.', 'danger');
      }
    } catch (err) {
      console.error('Error importing backup JSON:', err);
      showToast('Error al leer el archivo de respaldo JSON.', 'danger');
    }
  };
  reader.readAsText(file);
}

function loadDemoData() {
  const realSessions = (state.sessions || []).filter(s => s.id && !String(s.id).startsWith('demo_'));

  const demoSessions = [
    {
      id: 'demo_1',
      date: '2026-08-05',
      timeSlot: 'New York Open (8:00 AM - 11:30 AM)',
      account: 'FTMO 100K Funded',
      bias: 'Alcista (Bullish)',
      preEmotion: 'Calmado y Enfocado',
      energyScore: 9,
      checklist: { news: true, levels: true, acceptLoss: true },
      accountRisks: { 'FTMO 100K Funded': 1000 },
      folioMaestro: {
        noDo: [
          'No operaré en la primera media hora tras las noticias de las 8:30 AM',
          'No moveré el Stop Loss a breakeven antes de llegar al ratio 1:1.5',
          'No abriré posiciones adicionales si la primera operación entra en flotante negativo'
        ],
        improve: 'Esperar 5 minutos de confirmación en temporizador de 5m antes de pulsar compra',
        ifThen: [
          { feel: 'FOMO tras ver velón verde dispararse', do: 'Cerrar ventana de trading 10 minutos y hacer 5 respiraciones profundas' },
          { feel: 'Rabia por un Stop Loss rasante', do: 'Levantarme del escritorio y hacer 20 flexiones de pecho antes de tocar el mouse' },
          { feel: 'Euforia tras una ganancia grande', do: 'Reducir el tamaño de la siguiente posición a la mitad para evitar sobreconfianza' },
          { feel: 'Impaciencia por falta de volatilidad', do: 'Distanciarme 15 minutos del gráfico sin abrir ninguna posición' }
        ]
      },
      adherence: '100% - Ejecución Perfecta según el plan',
      disciplineScore: 10,
      mistakes: 'Ninguno (Plan Seguido)',
      takeaway: 'Esperar a la barrida de liquidez en NY dio la entrada limpia. Mantener paciencia siempre.',
      netPnl: 1250.00,
      trades: [
        { id: 101, asset: 'NQ1!', direction: 'LONG', lots: 2.0, pnl: 1250.00, rr: 3.1, setup: 'Order Block + Liquidez', tags: 'Plan Ejecutado 100%', notes: 'Reacción perfecta en FVG de 15m' }
      ]
    },
    {
      id: 'demo_2',
      date: '2026-08-04',
      timeSlot: 'New York Open (8:00 AM - 11:30 AM)',
      account: 'FTMO 100K Funded',
      bias: 'Bajista (Bearish)',
      preEmotion: 'Ansioso / Con Prisa',
      energyScore: 6,
      checklist: { news: true, levels: true, acceptLoss: false },
      adherence: '50% - Rompí algunas reglas (FOMO / Cierre temprano)',
      disciplineScore: 6,
      mistakes: 'Entrada Temprana / FOMO, Cierre Prematuro por Miedo',
      takeaway: 'Entré sin confirmación por prisa de ver las velas verdes mover subiendo. Ajustar rutina de respiración antes de abrir MT5.',
      netPnl: -450.00,
      trades: [
        { id: 102, asset: 'NQ1!', direction: 'SHORT', lots: 1.5, pnl: -450.00, rr: 1.0, setup: 'Breakout & Retest', tags: 'FOMO / Entrada Con Prisa', notes: 'Me sacó el Stop Loss por entrar en la punta del impulso' }
      ]
    },
    {
      id: 'demo_3',
      date: '2026-08-03',
      timeSlot: 'London Open (3:00 AM - 6:00 AM)',
      account: 'FTMO 100K Funded',
      bias: 'Alcista (Bullish)',
      preEmotion: 'Calmado y Enfocado',
      energyScore: 8,
      checklist: { news: true, levels: true, acceptLoss: true },
      adherence: '100% - Ejecución Perfecta según el plan',
      disciplineScore: 9,
      mistakes: 'Ninguno (Plan Seguido)',
      takeaway: 'Entrada impecable en EURUSD. Respeté el TP parcial y dejé correr el runner.',
      netPnl: 880.00,
      trades: [
        { id: 103, asset: 'EURUSD', direction: 'LONG', lots: 5.0, pnl: 880.00, rr: 2.5, setup: 'Fair Value Gap (FVG)', tags: 'Plan Ejecutado 100%', notes: 'London Judas swing directo a nuestro nivel' }
      ]
    },
    {
      id: 'demo_4',
      date: '2026-08-01',
      timeSlot: 'New York Open (8:00 AM - 11:30 AM)',
      account: 'FTMO 100K Funded',
      bias: 'Rango / Neutral',
      preEmotion: 'Frustrado (Tras perder ayer)',
      energyScore: 5,
      checklist: { news: false, levels: true, acceptLoss: false },
      adherence: '0% - Total Indisciplina / Tilt',
      disciplineScore: 4,
      mistakes: 'Operar por Venganza, Sobre-lotaje (Riesgo Excesivo)',
      takeaway: '¡ALERTA DE CRISIS! Aumenté lotes tras perder el primer trade. Rompí la regla de riesgo diario. NO operar si el puntaje mental es menor a 7.',
      netPnl: -1400.00,
      trades: [
        { id: 104, asset: 'GOLD', direction: 'SHORT', lots: 3.0, pnl: -600.00, rr: 1.0, setup: 'Reversión en Soporte/Resistencia', tags: 'Moví Stop Loss', notes: 'Trade perdedor normal' },
        { id: 105, asset: 'GOLD', direction: 'SHORT', lots: 6.0, pnl: -800.00, rr: 0.5, setup: 'Otro / Improvisado', tags: 'Revenge Trade (Venganza)', notes: 'Venganza directa tras la primera pérdida' }
      ]
    }
  ];

  state.sessions = [...demoSessions, ...realSessions];
  saveToLocalStorage();
  renderDashboard();
  renderHistory();
  if (typeof generateNotebookLMReport === 'function') generateNotebookLMReport();
  showToast('¡Datos demo cargados! Explora los gráficos y reportes para NotebookLM.', 'success');
}

// Clear Demo Data Handler
function clearDemoData() {
  if (!state.sessions || state.sessions.length === 0) {
    showToast('No hay sesiones registradas en el diario.', 'info');
    return;
  }

  const demoSessionsCount = state.sessions.filter(s => s.id && String(s.id).startsWith('demo_')).length;

  if (demoSessionsCount > 0) {
    if (confirm(`¿Estás seguro de que deseas eliminar las ${demoSessionsCount} sesiones demo?`)) {
      state.sessions = state.sessions.filter(s => !s.id || !String(s.id).startsWith('demo_'));
      saveToLocalStorage();
      renderDashboard();
      renderHistory();
      if (typeof generateNotebookLMReport === 'function') generateNotebookLMReport();
      showToast(`¡Se eliminaron ${demoSessionsCount} sesiones demo!`, 'success');
    }
  } else {
    if (confirm('No se encontraron datos demo. ¿Deseas eliminar TODAS las sesiones de tu diario de trading?')) {
      state.sessions = [];
      saveToLocalStorage();
      renderDashboard();
      renderHistory();
      if (typeof generateNotebookLMReport === 'function') generateNotebookLMReport();
      showToast('¡Todas las sesiones han sido eliminadas!', 'info');
    }
  }
}


// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i> <span>${message}</span>`;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Paper Template Modal & Printing Functions
function openPaperTemplate() {
  const modal = document.getElementById('paper-template-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('print-paper-mode');
  }
}

function closePaperTemplate() {
  const modal = document.getElementById('paper-template-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.classList.remove('print-paper-mode');
  }
}

function printPaperTemplate() {
  document.body.classList.add('print-paper-mode');
  window.print();
}

window.addEventListener('beforeprint', () => {
  const modal = document.getElementById('paper-template-modal');
  if (modal && modal.classList.contains('active')) {
    document.body.classList.add('print-paper-mode');
  }
});

window.addEventListener('afterprint', () => {
  const modal = document.getElementById('paper-template-modal');
  if (!modal || !modal.classList.contains('active')) {
    document.body.classList.remove('print-paper-mode');
  }
});

/* ==========================================================================
   SUPABASE AUTHENTICATION & CLOUD DATABASE SYNC
   ========================================================================== */

function initSupabase() {
  if (window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      setupAuthStateListener();
    } catch (e) {
      console.error('Error al inicializar Supabase:', e);
    }
  } else {
    console.warn('Supabase SDK no está disponible en window.supabase');
  }
}

function setupAuthStateListener() {
  if (!supabaseClient) return;

  // Escuchar cambios de estado de autenticación (Login, Logout, Token Refresh)
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      state.currentUser = session.user;
      state.isCloudSynced = true;
      updateAuthUI(true, session.user.email);
      await loadUserSessionsFromCloud(session.user.id);
    } else {
      state.currentUser = null;
      state.isCloudSynced = false;
      updateAuthUI(false);
      loadFromLocalStorage();
      renderDashboard();
      renderHistory();
      if (typeof generateNotebookLMReport === 'function') generateNotebookLMReport();
    }
  });

  // Verificar sesión existente al cargar la página
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session && session.user) {
      state.currentUser = session.user;
      state.isCloudSynced = true;
      updateAuthUI(true, session.user.email);
      loadUserSessionsFromCloud(session.user.id);
    } else {
      updateAuthUI(false);
    }
  }).catch(err => {
    console.warn('No active Supabase session found:', err);
    updateAuthUI(false);
  });
}

function updateAuthUI(isLoggedIn, userEmail = '') {
  const btnLogin = document.getElementById('btn-open-login');
  const userLoggedBox = document.getElementById('user-logged-box');
  const userEmailText = document.getElementById('user-email-text');

  if (isLoggedIn) {
    if (btnLogin) btnLogin.style.display = 'none';
    if (userLoggedBox) userLoggedBox.style.display = 'flex';
    if (userEmailText) userEmailText.innerText = userEmail;
  } else {
    if (btnLogin) btnLogin.style.display = 'inline-flex';
    if (userLoggedBox) userLoggedBox.style.display = 'none';
  }

  // Sincronizar estado de la tarjeta de la nube en la portada
  if (typeof updateHomeCloudCard === 'function') {
    updateHomeCloudCard();
  }
}

// Control del Modal de Autenticación
function openAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('active');
    switchAuthTab(mode);
    clearAuthAlert();
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('active');
    clearAuthAlert();
  }
}

function switchAuthTab(mode) {
  const tabLogin = document.getElementById('tab-btn-login');
  const tabRegister = document.getElementById('tab-btn-register');
  const formLogin = document.getElementById('auth-form-login');
  const formRegister = document.getElementById('auth-form-register');

  clearAuthAlert();

  if (mode === 'register') {
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabRegister) tabRegister.classList.add('active');
    if (formLogin) formLogin.style.display = 'none';
    if (formRegister) formRegister.style.display = 'block';
  } else {
    if (tabRegister) tabRegister.classList.remove('active');
    if (tabLogin) tabLogin.classList.add('active');
    if (formRegister) formRegister.style.display = 'none';
    if (formLogin) formLogin.style.display = 'block';
  }
}

function showAuthAlert(message, type = 'danger') {
  const alertBox = document.getElementById('auth-alert');
  if (!alertBox) return;
  alertBox.className = `auth-alert ${type}`;
  alertBox.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : (type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-info')}"></i> <span>${message}</span>`;
  alertBox.style.display = 'flex';
}

function clearAuthAlert() {
  const alertBox = document.getElementById('auth-alert');
  if (alertBox) {
    alertBox.innerHTML = '';
    alertBox.style.display = 'none';
  }
}

// Handlers de Envío de Formularios
async function handleLoginSubmit(event) {
  event.preventDefault();
  if (!supabaseClient) {
    showAuthAlert('Supabase no está conectado correctamente.');
    return;
  }

  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const submitBtn = document.getElementById('login-submit-btn');

  if (!email || !password) {
    showAuthAlert('Por favor ingresa tu correo y contraseña.');
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    closeAuthModal();
    showToast(`¡Bienvenido de nuevo, ${email}!`, 'success');
  } catch (err) {
    console.error('Login error:', err);
    let msg = err.message || 'Error al iniciar sesión.';
    if (msg.includes('Invalid login credentials')) {
      msg = 'Correo o contraseña incorrectos. Verifica tus datos o crea una cuenta si eres nuevo.';
    }
    showAuthAlert(msg, 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Entrar a mi Diario';
    }
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  if (!supabaseClient) {
    showAuthAlert('Supabase no está conectado.');
    return;
  }

  const email = document.getElementById('reg-email')?.value.trim();
  const password = document.getElementById('reg-password')?.value;
  const confirmPassword = document.getElementById('reg-password-confirm')?.value;
  const submitBtn = document.getElementById('reg-submit-btn');

  if (password !== confirmPassword) {
    showAuthAlert('Las contraseñas no coinciden.', 'danger');
    return;
  }

  if (password.length < 6) {
    showAuthAlert('La contraseña debe tener al menos 6 caracteres.', 'danger');
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando cuenta...';
    }

    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;

    if (data?.session) {
      closeAuthModal();
      showToast('¡Cuenta creada e inicio de sesión exitoso!', 'success');
    } else {
      showAuthAlert('¡Cuenta creada exitosamente! Revisa tu correo si tienes confirmación activada, o inicia sesión.', 'success');
    }
  } catch (err) {
    console.error('Registration error:', err);
    showAuthAlert(err.message || 'Error al registrar la cuenta.', 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Crear mi Cuenta Gratis';
    }
  }
}

async function handleLogout() {
  if (!supabaseClient) return;
  try {
    await supabaseClient.auth.signOut();
    showToast('Sesión cerrada. Modo local activo.', 'info');
  } catch (err) {
    console.error('Logout error:', err);
  }
}

// Persistencia en PostgreSQL de Supabase
async function loadUserSessionsFromCloud(userId) {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('trading_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    const cloudSessions = (data || []).map(row => ({
      id: row.id,
      date: row.date,
      timeSlot: row.time_slot,
      account: row.account,
      accountsList: row.accounts_list || [],
      accountRisks: row.account_risks || {},
      totalReplicatorRisk: parseFloat(row.total_replicator_risk || 0),
      bias: row.bias,
      preEmotion: row.pre_emotion,
      energyScore: row.energy_score,
      checklist: row.checklist || {},
      folioMaestro: row.folio_maestro || {},
      trades: row.trades || [],
      adherence: row.adherence,
      disciplineScore: row.discipline_score,
      mistakes: row.mistakes,
      takeaway: row.takeaway,
      netPnl: parseFloat(row.net_pnl || 0)
    }));

    // Verificar si hay sesiones locales previas para ofrecer migración
    const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    let localSessions = [];
    if (localRaw) {
      try { localSessions = JSON.parse(localRaw); } catch (e) {}
    }
    const nonDemoLocal = localSessions.filter(s => s.id && !String(s.id).startsWith('demo_'));

    state.sessions = cloudSessions;
    saveToLocalStorage(); // Mantener caché local para offline
    renderDashboard();
    renderHistory();
    if (typeof generateNotebookLMReport === 'function') generateNotebookLMReport();

    // Si la nube está vacía pero hay sesiones locales reales, ofrecer migración automática
    if (cloudSessions.length === 0 && nonDemoLocal.length > 0) {
      showMigrationModal(nonDemoLocal.length);
    }
  } catch (err) {
    console.error('Error fetching sessions from Supabase:', err);
    showToast('Error al conectar con la base de datos en la nube.', 'danger');
  }
}

async function saveSessionToCloud(session) {
  if (!supabaseClient || !state.currentUser) return;
  try {
    const row = {
      id: session.id,
      user_id: state.currentUser.id,
      date: session.date,
      time_slot: session.timeSlot,
      account: session.account,
      accounts_list: session.accountsList || [],
      account_risks: session.accountRisks || {},
      total_replicator_risk: session.totalReplicatorRisk || 0,
      bias: session.bias,
      pre_emotion: session.preEmotion,
      energy_score: session.energyScore || 8,
      checklist: session.checklist || {},
      folio_maestro: session.folioMaestro || {},
      trades: session.trades || [],
      adherence: session.adherence,
      discipline_score: session.disciplineScore || 10,
      mistakes: session.mistakes || '',
      takeaway: session.takeaway || '',
      net_pnl: session.netPnl || 0,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient.from('trading_sessions').upsert([row]);
    if (error) {
      console.error('Error saving session to Supabase:', error);
      showToast('Sesión guardada en caché local, pero falló en la nube.', 'warning');
    } else {
      showToast('¡Sesión sincronizada en tu nube de Supabase!', 'success');
    }
  } catch (err) {
    console.error('Exception in saveSessionToCloud:', err);
  }
}

async function deleteSessionFromCloud(sessionId) {
  if (!supabaseClient || !state.currentUser) return;
  try {
    const { error } = await supabaseClient
      .from('trading_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', state.currentUser.id);
    if (error) {
      console.error('Error deleting session in Supabase:', error);
    }
  } catch (err) {
    console.error('Exception in deleteSessionFromCloud:', err);
  }
}

// Handlers del Modal de Migración
function showMigrationModal(count) {
  const modal = document.getElementById('migrate-modal');
  const countEl = document.getElementById('local-sessions-count');
  if (countEl) countEl.innerText = count;
  if (modal) modal.classList.add('active');
}

function dismissMigrationModal() {
  const modal = document.getElementById('migrate-modal');
  if (modal) modal.classList.remove('active');
}

async function syncSessionsArrayToCloud(sessionsArray) {
  if (!supabaseClient || !state.currentUser || !Array.isArray(sessionsArray)) return;
  const nonDemo = sessionsArray.filter(s => s.id && !String(s.id).startsWith('demo_'));
  if (nonDemo.length === 0) return;

  const rows = nonDemo.map(session => ({
    id: session.id,
    user_id: state.currentUser.id,
    date: session.date,
    time_slot: session.timeSlot,
    account: session.account,
    accounts_list: session.accountsList || [],
    account_risks: session.accountRisks || {},
    total_replicator_risk: session.totalReplicatorRisk || 0,
    bias: session.bias,
    pre_emotion: session.preEmotion,
    energy_score: session.energyScore || 8,
    checklist: session.checklist || {},
    folio_maestro: session.folioMaestro || {},
    trades: session.trades || [],
    adherence: session.adherence,
    discipline_score: session.disciplineScore || 10,
    mistakes: session.mistakes || '',
    takeaway: session.takeaway || '',
    net_pnl: session.netPnl || 0,
    updated_at: new Date().toISOString()
  }));

  try {
    const { error } = await supabaseClient.from('trading_sessions').upsert(rows);
    if (!error) {
      showToast(`¡${rows.length} sesiones sincronizadas en la nube!`, 'success');
    }
  } catch (err) {
    console.error('Error in syncSessionsArrayToCloud:', err);
  }
}

async function confirmCloudMigration() {
  dismissMigrationModal();
  if (!supabaseClient || !state.currentUser) return;

  const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!localRaw) return;
  
  let localSessions = [];
  try { localSessions = JSON.parse(localRaw); } catch (e) { return; }
  const nonDemo = localSessions.filter(s => s.id && !String(s.id).startsWith('demo_'));

  if (nonDemo.length === 0) return;

  showToast(`Sincronizando ${nonDemo.length} sesiones a la nube...`, 'info');

  const rows = nonDemo.map(session => ({
    id: session.id,
    user_id: state.currentUser.id,
    date: session.date,
    time_slot: session.timeSlot,
    account: session.account,
    accounts_list: session.accountsList || [],
    account_risks: session.accountRisks || {},
    total_replicator_risk: session.totalReplicatorRisk || 0,
    bias: session.bias,
    pre_emotion: session.preEmotion,
    energy_score: session.energyScore || 8,
    checklist: session.checklist || {},
    folio_maestro: session.folioMaestro || {},
    trades: session.trades || [],
    adherence: session.adherence,
    discipline_score: session.disciplineScore || 10,
    mistakes: session.mistakes || '',
    takeaway: session.takeaway || '',
    net_pnl: session.netPnl || 0,
    updated_at: new Date().toISOString()
  }));

  try {
    const { error } = await supabaseClient.from('trading_sessions').upsert(rows);
    if (error) throw error;

    showToast(`¡${rows.length} sesiones migradas a la nube con éxito!`, 'success');
    await loadUserSessionsFromCloud(state.currentUser.id);
  } catch (err) {
    console.error('Error during cloud migration:', err);
    showToast('Error al migrar sesiones a la nube.', 'danger');
  }
}

// Cerrar modales y menú desplegable al hacer clic fuera
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'auth-modal') closeAuthModal();
  if (e.target && e.target.id === 'migrate-modal') dismissMigrationModal();
  
  // Cerrar menú de herramientas del header si se hace clic fuera
  const dropdownWrap = document.querySelector('.header-dropdown-wrap');
  if (dropdownWrap && !dropdownWrap.contains(e.target)) {
    closeHeaderToolsMenu();
  }
});

/* ==========================================================================
   TAB 0: PORTADA & HOME HUB INTERACTIVITY
   ========================================================================== */

// 1. Mini Métricas en Tiempo Real para la Portada
function renderHomeMetrics() {
  const pnlEl = document.getElementById('home-stat-pnl');
  const winrateEl = document.getElementById('home-stat-winrate');
  const sessionsEl = document.getElementById('home-stat-sessions');

  if (!state.sessions || state.sessions.length === 0) {
    if (pnlEl) {
      pnlEl.innerText = '$0.00';
      pnlEl.style.color = 'var(--text-main)';
    }
    if (winrateEl) winrateEl.innerText = '0.0%';
    if (sessionsEl) sessionsEl.innerText = '0';
  } else {
    let totalPnl = 0;
    let winningSessions = 0;

    state.sessions.forEach(session => {
      const pnl = parseFloat(session.netPnl || 0);
      totalPnl += pnl;
      if (pnl > 0) winningSessions++;
    });

    const winRate = state.sessions.length > 0 
      ? ((winningSessions / state.sessions.length) * 100).toFixed(1)
      : '0.0';

    if (pnlEl) {
      pnlEl.innerText = (totalPnl >= 0 ? '+' : '') + `$${totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      pnlEl.style.color = totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)';
    }

    if (winrateEl) winrateEl.innerText = `${winRate}%`;
    if (sessionsEl) sessionsEl.innerText = `${state.sessions.length}`;
  }

  // Actualizar Tarjeta de Supabase en la Portada
  updateHomeCloudCard();
}

function updateHomeCloudCard() {
  const offlineView = document.getElementById('cloud-offline-view');
  const onlineView = document.getElementById('cloud-online-view');
  const userEmailEl = document.getElementById('home-cloud-user-email');
  const badgeEl = document.getElementById('home-cloud-badge');
  const actionBtn = document.getElementById('home-cloud-action-btn');

  if (state.currentUser) {
    if (offlineView) offlineView.style.display = 'none';
    if (onlineView) onlineView.style.display = 'flex';
    if (userEmailEl) userEmailEl.innerText = state.currentUser.email || 'Conectado';
    if (badgeEl) badgeEl.innerText = 'NUBE ACTIVA (RLS)';
    if (actionBtn) {
      actionBtn.className = 'btn btn-secondary btn-block btn-gateway';
      actionBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Sincronizado ✓';
      actionBtn.onclick = () => showToast(`Conectado a la nube como: ${state.currentUser.email}`, 'success');
    }
  } else {
    if (offlineView) offlineView.style.display = 'flex';
    if (onlineView) onlineView.style.display = 'none';
    if (badgeEl) badgeEl.innerText = 'BÓVEDA POSTGRESQL';
    if (actionBtn) {
      actionBtn.className = 'btn btn-outline-primary btn-block btn-gateway';
      actionBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Conectar / Crear Cuenta';
      actionBtn.onclick = () => openAuthModal('login');
    }
  }
}

// 2. Reloj y Monitor de Sesiones Mundiales de Mercado
let marketSessionsInterval = null;

function initMarketSessionsClock() {
  updateMarketSessionsClock();
  if (!marketSessionsInterval) {
    marketSessionsInterval = setInterval(updateMarketSessionsClock, 1000);
  }
}

function updateMarketSessionsClock() {
  const now = new Date();
  
  // Reloj local HH:MM:SS
  const clockEl = document.getElementById('clock-display');
  if (clockEl) {
    clockEl.innerText = now.toLocaleTimeString('es-ES', { hour12: false });
  }

  // Cálculos en Horario UTC
  const utcDay = now.getUTCDay(); // 0 = Domingo, 6 = Sábado
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcTimeDec = utcHours + (utcMinutes / 60);

  const isWeekend = (utcDay === 6 || (utcDay === 0 && utcHours < 22)); // Sábado completo o Domingo antes de sesión asiática

  // 1. Nueva York (NYSE / NASDAQ):
  // RTH: 14:30 - 21:00 UTC (9:30 AM - 4:00 PM EST)
  // Pre-market: 12:00 - 14:30 UTC (7:00 AM - 9:30 AM EST)
  const nyPill = document.getElementById('ticker-ny');
  const nyBadge = document.getElementById('badge-ny');
  if (nyPill && nyBadge) {
    if (isWeekend) {
      nyPill.className = 'market-ticker-pill closed';
      nyBadge.innerText = 'Cerrado';
    } else if (utcTimeDec >= 14.5 && utcTimeDec < 21.0) {
      nyPill.className = 'market-ticker-pill open';
      nyBadge.innerText = 'Abierto';
    } else if (utcTimeDec >= 12.0 && utcTimeDec < 14.5) {
      nyPill.className = 'market-ticker-pill pre-market';
      nyBadge.innerText = 'Pre-Mercado';
    } else {
      nyPill.className = 'market-ticker-pill closed';
      nyBadge.innerText = 'Cerrado';
    }
  }

  // 2. Londres (LSE):
  // 08:00 - 16:30 UTC
  const londonPill = document.getElementById('ticker-london');
  const londonBadge = document.getElementById('badge-london');
  if (londonPill && londonBadge) {
    if (isWeekend) {
      londonPill.className = 'market-ticker-pill closed';
      londonBadge.innerText = 'Cerrado';
    } else if (utcTimeDec >= 8.0 && utcTimeDec < 16.5) {
      londonPill.className = 'market-ticker-pill open';
      londonBadge.innerText = 'Abierto';
    } else {
      londonPill.className = 'market-ticker-pill closed';
      londonBadge.innerText = 'Cerrado';
    }
  }

  // 3. Tokio / Asia:
  // 00:00 - 09:00 UTC (o Domingo tarde 22:00+ UTC apertura de Sydney/Asia)
  const asiaPill = document.getElementById('ticker-asia');
  const asiaBadge = document.getElementById('badge-asia');
  if (asiaPill && asiaBadge) {
    const isAsiaOpen = (!isWeekend && (utcTimeDec >= 0.0 && utcTimeDec < 9.0)) || 
                       (utcDay === 0 && utcTimeDec >= 22.0);
    if (isAsiaOpen) {
      asiaPill.className = 'market-ticker-pill open';
      asiaBadge.innerText = 'Abierto';
    } else {
      asiaPill.className = 'market-ticker-pill closed';
      asiaBadge.innerText = 'Cerrado';
    }
  }
}

// 3. Píldora de Psicología & Mindset del Trader
const TRADING_QUOTES = [
  {
    quote: "El mercado es un espejo que refleja tus más profundas emociones y creencias sobre el dinero. Cuando dejas de intentar tener la razón, comienzas a extraer dinero con disciplina.",
    author: "— Mark Douglas, Trading in the Zone"
  },
  {
    quote: "No puedes controlar lo que hará el mercado en los próximos 5 minutos. Tu único trabajo es controlar tu riesgo y ejecutar tu plan con total desapego al resultado de un trade individual.",
    author: "— Jared Tendler, The Mental Game of Trading"
  },
  {
    quote: "Los traders perdedores se enfocan en cuánto dinero pueden ganar. Los traders consistentes se obsesionan con cuánto pueden perder si el trade no funciona.",
    author: "— Paul Tudor Jones"
  },
  {
    quote: "El dolor de perder un trade ejecutado según tus reglas es momentáneo. El dolor de perder por romper tus reglas destruye tu confianza.",
    author: "— Tom Hougaard, Best Loser Wins"
  },
  {
    quote: "La consistencia no es una estrategia de trading; es un estado mental de paciencia implacable. Espera a tu presa como un francotirador.",
    author: "— Brett Steenbarger, The Daily Trading Coach"
  },
  {
    quote: "Cualquier trade individual tiene un resultado aleatorio. Es la ley de las probabilidades a lo largo de 50 trades bien ejecutados lo que te otorga consistencia.",
    author: "— Mark Douglas"
  },
  {
    quote: "Si no eres capaz de aceptar una pequeña pérdida con serenidad, tarde o temprano el mercado te obligará a aceptar una pérdida catastrófica.",
    author: "— Ed Seykota, Market Wizards"
  },
  {
    quote: "El autocontrol es la habilidad de no actuar cuando el mercado no ofrece una ventaja matemática clara. La paciencia también es una posición.",
    author: "— Charlie Munger"
  }
];

let currentQuoteIndex = 0;

function initMindsetQuotes() {
  currentQuoteIndex = Math.floor(Math.random() * TRADING_QUOTES.length);
  displayMindsetQuote(currentQuoteIndex);
}

function displayMindsetQuote(index) {
  const quoteText = document.getElementById('home-quote-text');
  const quoteAuthor = document.getElementById('home-quote-author');
  if (!quoteText || !quoteAuthor) return;

  const item = TRADING_QUOTES[index];
  quoteText.style.opacity = '0';
  quoteAuthor.style.opacity = '0';

  setTimeout(() => {
    quoteText.innerText = `"${item.quote}"`;
    quoteAuthor.innerText = item.author;
    quoteText.style.transition = 'opacity 0.3s ease';
    quoteAuthor.style.transition = 'opacity 0.3s ease';
    quoteText.style.opacity = '1';
    quoteAuthor.style.opacity = '1';
  }, 150);
}

function cycleMindsetQuote() {
  currentQuoteIndex = (currentQuoteIndex + 1) % TRADING_QUOTES.length;
  displayMindsetQuote(currentQuoteIndex);
}

// 4. Quick Mood Check
function selectQuickMood(mood, buttonEl) {
  document.querySelectorAll('.state-btn').forEach(btn => btn.classList.remove('selected'));
  if (buttonEl) buttonEl.classList.add('selected');

  const feedbackBox = document.getElementById('mindset-feedback-message');
  if (!feedbackBox) return;

  feedbackBox.style.display = 'block';

  if (mood === 'calm') {
    feedbackBox.style.background = 'var(--profit-bg)';
    feedbackBox.style.color = 'var(--profit)';
    feedbackBox.style.border = '1px solid rgba(5, 150, 105, 0.2)';
    feedbackBox.innerHTML = '<i class="fa-solid fa-circle-check"></i> <strong>Estado Óptimo:</strong> Calma y paciencia detectadas. Deja que el precio venga a tus zonas clave y respeta tu R:R hoy.';
  } else if (mood === 'cautious') {
    feedbackBox.style.background = 'var(--warning-bg)';
    feedbackBox.style.color = 'var(--warning)';
    feedbackBox.style.border = '1px solid rgba(217, 119, 6, 0.2)';
    feedbackBox.innerHTML = '<i class="fa-solid fa-shield-halved"></i> <strong>Modo Vigilante:</strong> Prudencia activa. Considera arriesgar la mitad del riesgo estándar por contrato y busca confirmación extra.';
  } else if (mood === 'fatigued') {
    feedbackBox.style.background = 'var(--loss-bg)';
    feedbackBox.style.color = 'var(--loss)';
    feedbackBox.style.border = '1px solid rgba(225, 29, 72, 0.2)';
    feedbackBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Alerta de Enfoque:</strong> Fatiga o ansiedad presentes. Si operas hoy, hazlo en cuenta demo o apaga la pantalla tras tu primer trade.';
  }
}

// 5. Menú Desplegable de Herramientas Rápidas en el Header
function toggleHeaderToolsMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('header-tools-menu');
  if (menu) {
    menu.classList.toggle('active');
  }
}

function closeHeaderToolsMenu() {
  const menu = document.getElementById('header-tools-menu');
  if (menu) {
    menu.classList.remove('active');
  }
}

/* ==========================================================================
   THEME SWITCHER (MODO OSCURO / CLARO PRO)
   ========================================================================== */

function initTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark') {
      applyTheme('dark');
    } else if (savedTheme === 'light') {
      applyTheme('light');
    } else {
      // Si el usuario tiene modo oscuro en su sistema operativo, respetarlo
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  } catch (e) {
    console.warn('Error reading theme from localStorage', e);
  }
}

function applyTheme(theme) {
  const icon = document.getElementById('theme-icon');
  const toggleBtn = document.getElementById('theme-toggle-btn');
  
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (icon) {
      icon.className = 'fa-solid fa-sun';
    }
    if (toggleBtn) {
      toggleBtn.title = 'Cambiar a Modo Claro';
    }
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (icon) {
      icon.className = 'fa-solid fa-moon';
    }
    if (toggleBtn) {
      toggleBtn.title = 'Cambiar a Modo Oscuro';
    }
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  applyTheme(newTheme);
  
  try {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  } catch (e) {
    console.warn('Error saving theme to localStorage', e);
  }

  showToast(`Modo ${newTheme === 'dark' ? 'Oscuro Terminal' : 'Claro Ejecutivo'} activado`, 'info');

  // Actualizar gráficos si están en pantalla
  if (state.sessions && state.sessions.length > 0) {
    renderEquityChart(state.sessions);
    renderErrorsChart(calculateErrorsMap(state.sessions));
  }
}

/* ==========================================================================
   AI STRATEGY & PLAYBOOK GENERATOR (NOTEBOOKLM READY)
   ========================================================================== */

const STRATEGY_STORAGE_KEY = 'trading_playbook_data';
const GEMINI_KEY_STORAGE = 'gemini_api_key';

let strategyState = {
  rawInput: '',
  markdown: '',
  style: 'SMC / ICT & Order Flow',
  updatedAt: null
};

// Inicialización de la pestaña de Estrategia
function initStrategyTab() {
  // 1. Cargar API Key
  const savedApiKey = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  const apiKeyInput = document.getElementById('gemini-api-key');
  if (apiKeyInput) {
    apiKeyInput.value = savedApiKey;
  }
  updateApiKeyStatusUI(savedApiKey);

  // 2. Contador de caracteres en textarea
  const rawInputEl = document.getElementById('strategy-raw-input');
  if (rawInputEl && !rawInputEl.dataset.listenerAttached) {
    rawInputEl.dataset.listenerAttached = 'true';
    rawInputEl.addEventListener('input', () => {
      updateStrategyCharCount();
    });
  }

  // 3. Cargar Playbook guardado
  loadPlaybookFromStorage();
}

function updateStrategyCharCount() {
  const rawInputEl = document.getElementById('strategy-raw-input');
  const countEl = document.getElementById('strategy-char-count');
  if (rawInputEl && countEl) {
    countEl.textContent = `${rawInputEl.value.length} caracteres`;
  }
}

function updateApiKeyStatusUI(key) {
  const statusEl = document.getElementById('api-key-status');
  const statusText = document.getElementById('api-status-text');
  if (!statusEl || !statusText) return;

  const dot = statusEl.querySelector('.status-dot');
  if (key && key.trim().length > 15) {
    if (dot) dot.className = 'status-dot active';
    statusText.textContent = '🟢 Conectado con Google Gemini API (Modo IA)';
    statusText.style.color = 'var(--profit)';
  } else {
    if (dot) dot.className = 'status-dot';
    statusText.textContent = '⚡ Modo Local Activo (Genera sin clave en 1 clic)';
    statusText.style.color = 'var(--text-muted)';
  }
}

function toggleApiKeyVisibility() {
  const input = document.getElementById('gemini-api-key');
  const icon = document.getElementById('toggle-key-icon');
  if (!input || !icon) return;

  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-regular fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-regular fa-eye';
  }
}

function saveGeminiKeyAction() {
  const input = document.getElementById('gemini-api-key');
  if (!input) return;
  const key = input.value.trim();

  if (key) {
    localStorage.setItem(GEMINI_KEY_STORAGE, key);
    updateApiKeyStatusUI(key);
    showToast('Clave API de Gemini guardada de forma segura en tu navegador', 'success');
  } else {
    localStorage.removeItem(GEMINI_KEY_STORAGE);
    updateApiKeyStatusUI('');
    showToast('Clave API eliminada. Activado Modo Local sin clave.', 'info');
  }
}

function loadSampleStrategy() {
  const sample = `- Activo Principal: Nasdaq (NQ1! / MNQ) y EURUSD.
- Sesiones de Operativa: New York Open (09:30 a 11:30 EST) y London Open (03:00 a 05:00 EST).
- Filtro Macro & Noticias: Prohibido abrir posiciones 15 min antes y 15 min después de noticias de alto impacto (CPI, NFP, PPI, FOMC).
- Contexto de Mercado:
  * Identificar Sesgo (Bias) diario en 4H y 1H.
  * Trazar liquidez clave: Asian High/Low, Previous Day High/Low (PDH/PDL).
- Modelo de Entrada A+ (Toma de Liquidez + MSS + FVG):
  1. El precio debe barrer liquidez externa (Asian High o PDH/PDL) con mecha de rechazo.
  2. En 1m o 5m, esperar un Market Structure Shift (MSS / ChoCH) con vela de cuerpo decisivo.
  3. Identificar el FVG (Fair Value Gap) creado por el desplazamiento institucional.
  4. Entrada límite o de confirmación al 50% del FVG (Consequent Encroachment) o retroceso al nivel OTE (62%-79% Fibonacci).
- Gestión de Riesgo & Invalidación Técnica:
  * Stop Loss: Siempre e invariablemente detrás del swing estructural que causó el desplazamiento (máximo 20 puntos en NQ).
  * Criterio de Salida Temprana: Si una vela de 5m cierra con cuerpo pleno vulnerando el FVG de entrada, se cierra manualmente por invalidación técnica.
  * Ratio Riesgo:Beneficio Mínimo: 1:2.
  * Parciales & Breakeven: Al alcanzar 1:2 RR, tomar 50% de ganancia y mover Stop Loss inmediatamente a Breakeven.
  * Take Profit Final: Siguiente zona de liquidez contraria o 1:3 RR.
- Gestión Monetaria & Disciplina:
  * Riesgo máximo por operación: 1% del capital de la cuenta.
  * Máximo de operaciones por sesión: 2 trades.
  * Pérdida máxima diaria permitida: 2% (si tengo 2 Stop Loss seguidos, se apagan pantallas hasta mañana).
- Protocolos de Emergencia & Psicotrading:
  * Si pierdo una entrada válida: NO perseguir el precio con FOMO. Esperar el siguiente ciclo de liquidez.
  * Tras un Stop Loss: Pausa obligatoria de 15 minutos lejos de la pantalla para evitar entrar por revancha (Revenge Trading).`;

  const inputEl = document.getElementById('strategy-raw-input');
  if (inputEl) {
    inputEl.value = sample;
    updateStrategyCharCount();
  }
  const styleSelect = document.getElementById('strategy-style-select');
  if (styleSelect) {
    styleSelect.value = 'SMC / ICT & Order Flow';
  }
  showToast('Plantilla de ejemplo institucional cargada', 'info');
}

function clearStrategyInput() {
  const inputEl = document.getElementById('strategy-raw-input');
  if (inputEl) {
    inputEl.value = '';
    updateStrategyCharCount();
    inputEl.focus();
  }
}

// System prompt institucional para el Playbook
function buildPlaybookSystemPrompt(style) {
  return `Eres un Trader Institucional Cuantitativo y Gestor de Riesgos de un Fondo de Cobertura (Hedge Fund).
Tu objetivo es tomar notas de trading desordenadas, reglas empíricas o pensamientos de un trader, y estructurarlos en un PLAYBOOK DE TRADING MAESTRO riguroso, formal y de nivel profesional.

El documento resultante debe estar estrictamente optimizado como FUENTE DE CONOCIMIENTO PARA GOOGLE NOTEBOOKLM, permitiendo que la IA audite posteriormente las bitácoras y trades del usuario contrastándolos contra este playbook.

REGLAS DE FORMATO Y ESTRUCTURA OBLIGATORIAS:
- Utiliza Markdown limpio, encabezados bien jerarquizados (#, ##, ###) y listas con viñetas claras.
- Estilo Operativo Seleccionado: ${style}.
- Sé específico, directo y elimina cualquier ambigüedad.
- Si el usuario omitió detalles vitales (como reglas de breakeven, noticias o gestión psicológica), infiere la mejor práctica institucional acorde a su estilo y márcala claramente con la etiqueta [RECOMENDACIÓN INSTITUCIONAL].

Estructura obligatoria del documento:
# PLAYBOOK DE TRADING INSTITUCIONAL: [NOMBRE O ESTILO DE ESTRATEGIA]
> **Propósito:** Documento de gobernanza operativa para auditoría algorítmica y psicotrading en Google NotebookLM.

## 1. PARÁMETROS OPERATIVOS & CONTEXTO DE MERCADO
- **Activos Autorizados:** [Lista de activos]
- **Sesiones & Horarios de Alta Probabilidad:** [Horarios exactos]
- **Filtros Macro & Noticias de Alto Impacto:** [Reglas estrictas ante noticias]
- **Definición de Sesgo (Market Bias):** [Cómo se determina la dirección diaria]

## 2. MODELOS DE ENTRADA & SETUPS A+
- **Fase 1: Condición de Liquidez Previa:** [De dónde viene la liquidez]
- **Fase 2: Confirmación Estructural:** [Qué patrón o quiebre técnico se exige]
- **Fase 3: Gatillo & Zona de Ejecución:** [Punto exacto de entrada]

## 3. GESTIÓN DE RIESGO & CRITERIOS DE INVALIDACIÓN (NO NEGOCIABLES)
- **Ubicación Técnica del Stop Loss:** [Regla invariable de colocación]
- **Criterios de Invalidación Prematura:** [Cuándo cerrar antes de tocar SL]
- **Gestión de Ganancias (Parciales & Breakeven):** [Cuándo tomar beneficios y mover a 0]
- **Riesgo Máximo por Operación:** [% o $]
- **Límite de Pérdida Diaria (Daily Loss Limit):** [Límite máximo permitido antes de bloquear la sesión]
- **Máximo de Trades Permitidos por Sesión:** [Cantidad]

## 4. PROTOCOLOS DE EMERGENCIA & PSICOTRADING
- **Protocolo Anti-FOMO:** [Si pierdo una entrada, comando automático]
- **Protocolo Post-Pérdida (Anti-Revenge):** [Comando obligatorio tras un Stop Loss]
- **Límite de Racha Negativa:** [Qué hacer ante 2 pérdidas seguidas]

## 5. CHECKLIST PRE-TRADE (FILTRO DE 5 PUNTOS)
- [ ] 1. ¿El horario y las noticias permiten operar?
- [ ] 2. ¿El activo se encuentra en una zona de liquidez clave?
- [ ] 3. ¿Existe confirmación estructural clara en temporalidad operativa?
- [ ] 4. ¿El Stop Loss técnico respeta mi límite de riesgo máximo?
- [ ] 5. ¿Acepto la pérdida de este trade con total calma y sin apego emocional?

## 6. PREGUNTAS DE AUDITORÍA RECOMENDADAS PARA NOTEBOOKLM
- "¿En qué trades de mis bitácoras violé los criterios de invalidación técnica de este Playbook?"
- "¿Las pérdidas acumuladas se debieron al riesgo natural del setup o a indisciplina operativa?"
- "¿Cuál de mis sesiones tuvo la mayor desviación entre mi plan escrito y las operaciones ejecutadas?"`;
}

// Generador Heurístico Local Inteligente (100% Offline y Gratis sin API Key)
function generateLocalPlaybook(rawText, style) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const buckets = {
    assets: [],
    sessions: [],
    news: [],
    bias: [],
    setups: [],
    riskSl: [],
    exits: [],
    psychology: []
  };

  const uncategorized = [];

  lines.forEach(line => {
    const clean = line.replace(/^[-*•0-9.)\s]+/, '').trim();
    if (!clean) return;
    const lower = clean.toLowerCase();

    if (lower.includes('activo') || lower.includes('par') || lower.includes('nq') || lower.includes('es') || lower.includes('eurusd') || lower.includes('gbpusd') || lower.includes('oro') || lower.includes('gold') || lower.includes('crypto') || lower.includes('btc') || lower.includes('nasdaq')) {
      buckets.assets.push(clean);
    } else if (lower.includes('sesion') || lower.includes('sesión') || lower.includes('hora') || lower.includes('horario') || lower.includes('london') || lower.includes('ny') || lower.includes('new york') || lower.includes('asia') || lower.includes('apertura') || lower.includes('campana')) {
      buckets.sessions.push(clean);
    } else if (lower.includes('noticia') || lower.includes('cpi') || lower.includes('nfp') || lower.includes('fomc') || lower.includes('fed') || lower.includes('macro') || lower.includes('calendario') || lower.includes('impacto')) {
      buckets.news.push(clean);
    } else if (lower.includes('bias') || lower.includes('sesgo') || lower.includes('tendencia') || lower.includes('direcc') || lower.includes('4h') || lower.includes('1h') || lower.includes('diario') || lower.includes('daily')) {
      buckets.bias.push(clean);
    } else if (lower.includes('stop') || lower.includes('sl') || lower.includes('invalida') || lower.includes('riesgo') || lower.includes('pérdida') || lower.includes('perdida') || lower.includes('drawdown') || lower.includes('lot') || lower.includes('capital') || lower.includes('máximo') || lower.includes('maximo')) {
      buckets.riskSl.push(clean);
    } else if (lower.includes('tp') || lower.includes('target') || lower.includes('parcial') || lower.includes('breakeven') || lower.includes('be ') || lower.includes('r:r') || lower.includes('beneficio') || lower.includes('salida') || lower.includes('ratio')) {
      buckets.exits.push(clean);
    } else if (lower.includes('fomo') || lower.includes('revancha') || lower.includes('revenge') || lower.includes('emocion') || lower.includes('emoción') || lower.includes('calma') || lower.includes('psico') || lower.includes('tilt') || lower.includes('paciencia') || lower.includes('regla') || lower.includes('caminar') || lower.includes('apagar')) {
      buckets.psychology.push(clean);
    } else if (lower.includes('fvg') || lower.includes('liquidez') || lower.includes('mss') || lower.includes('choch') || lower.includes('setup') || lower.includes('entrada') || lower.includes('gatillo') || lower.includes('vela') || lower.includes('confirmac') || lower.includes('rompe') || lower.includes('soporte') || lower.includes('resistencia') || lower.includes('patron') || lower.includes('patrón') || lower.includes('ote') || lower.includes('fib')) {
      buckets.setups.push(clean);
    } else {
      uncategorized.push(clean);
    }
  });

  const formatList = (items, fallbackText) => {
    if (items.length === 0) return `- ${fallbackText} *(Recomendación Institucional)*`;
    return items.map(i => `- ${i}`).join('\n');
  };

  const md = `# PLAYBOOK DE TRADING INSTITUCIONAL: ${style.toUpperCase()}
> **Propósito:** Documento de gobernanza operativa para auditoría algorítmica y psicotrading en Google NotebookLM.
> **Modo de Generación:** Motor Local Inteligente ($0 Costo - Procesado en tu navegador).

---

## 1. PARÁMETROS OPERATIVOS & CONTEXTO DE MERCADO
### Activos Autorizados
${formatList(buckets.assets, 'Operar exclusivamente en activos de alta liquidez definidos en la sesión (ej: NQ1!, ES1!, EURUSD)')}

### Sesiones & Horarios de Alta Probabilidad
${formatList(buckets.sessions, 'Operar únicamente durante las ventanas de volumen institucional (New York Open 09:30-11:30 EST o London Open 03:00-05:00 EST)')}

### Filtros Macro & Noticias de Alto Impacto
${formatList(buckets.news, 'Prohibido abrir posiciones 15 minutos antes y 15 minutos después de eventos de alto impacto (CPI, NFP, FOMC)')}

### Definición de Sesgo (Market Bias)
${formatList(buckets.bias, 'Determinar el sesgo direccional en temporalidad de 4H y 1H mediante la estructura de máximos/mínimos y flujo de órdenes')}

---

## 2. MODELOS DE ENTRADA & SETUPS A+
### Condiciones Técnicas & Gatillo de Ejecución
${formatList(buckets.setups, 'Esperar toma de liquidez previa + desplazamiento institucional + confirmación en temporalidad menor (1m/5m)')}

${uncategorized.length > 0 ? `### Reglas y Consideraciones Adicionales\n${uncategorized.map(u => `- ${u}`).join('\n')}` : ''}

---

## 3. GESTIÓN DE RIESGO & CRITERIOS DE INVALIDACIÓN (NO NEGOCIABLES)
### Ubicación de Stop Loss & Criterios de Salida
${formatList(buckets.riskSl, 'El Stop Loss se coloca invariablemente detrás del swing estructural de validación. Nunca mover el Stop Loss en contra')}

### Gestión de Ganancias (Parciales & Breakeven)
${formatList(buckets.exits, 'Ratio mínimo 1:2 RR. Al alcanzar 1:2 RR, tomar parciales (50%) y mover Stop Loss inmediatamente a Breakeven')}

---

## 4. PROTOCOLOS DE EMERGENCIA & PSICOTRADING
### Reglas Psicológicas & Control de Tilt
${formatList(buckets.psychology, 'Prohibido operar por revancha (Revenge Trading). Si se pierden 2 operaciones consecutivas, cerrar la plataforma por el resto del día')}

---

## 5. CHECKLIST PRE-TRADE (FILTRO DE 5 PUNTOS)
- [ ] 1. ¿El horario y el calendario de noticias permiten operar hoy?
- [ ] 2. ¿El precio se encuentra en una zona de liquidez clave o nivel institucional?
- [ ] 3. ¿Existe confirmación y gatillo técnico según las reglas de mi setup?
- [ ] 4. ¿El Stop Loss técnico respeta mi límite de pérdida monetaria estricto?
- [ ] 5. ¿Acepto el riesgo del trade con total serenidad y sin apego emocional?

---

## 6. PREGUNTAS DE AUDITORÍA RECOMENDADAS PARA NOTEBOOKLM
- "¿En qué operaciones registradas en mis bitácoras violé las reglas de Stop Loss o entrada de este Playbook?"
- "¿Las pérdidas acumuladas de este periodo provinieron de fallos del setup o de errores de ejecución emocional (FOMO/venganza)?"
- "¿Qué sesión y horario específico registraron la mejor tasa de acierto y respeto al plan según mis datos?"`;

  return md;
}

// Generador Dual: con Gemini API si hay clave o Modo Local si no hay clave
async function generateAIPlaybook() {
  const rawInputEl = document.getElementById('strategy-raw-input');
  const styleSelect = document.getElementById('strategy-style-select');
  const rawText = rawInputEl ? rawInputEl.value.trim() : '';
  const style = styleSelect ? styleSelect.value : 'SMC / ICT & Order Flow';

  if (!rawText || rawText.length < 20) {
    showToast('Por favor escribe o pega tus notas de estrategia (mínimo 20 caracteres) o carga el ejemplo.', 'warning');
    if (rawInputEl) rawInputEl.focus();
    return;
  }

  const apiKey = (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
  const btn = document.getElementById('btn-generate-playbook');
  const btnText = document.getElementById('generate-btn-text');
  const originalHtml = btnText ? btnText.innerHTML : '';

  // CASO 1: SIN API KEY -> MODO LOCAL INTELIGENTE ($0 COSTO, SIN REGISTRO)
  if (!apiKey) {
    try {
      if (btn) btn.disabled = true;
      if (btnText) {
        btnText.innerHTML = '<i class="fa-solid fa-bolt"></i> Estructurando en Modo Local...';
      }

      await new Promise(resolve => setTimeout(resolve, 350)); // feedback visual suave

      const localMarkdown = generateLocalPlaybook(rawText, style);

      strategyState.rawInput = rawText;
      strategyState.style = style;
      strategyState.markdown = localMarkdown;
      strategyState.updatedAt = new Date().toISOString();

      const editorEl = document.getElementById('playbook-raw-markdown');
      if (editorEl) editorEl.value = localMarkdown;

      renderPlaybookMarkdown(localMarkdown);
      switchPlaybookView('preview');
      savePlaybookToStorage();

      showToast('⚡ ¡Playbook estructurado con éxito (Modo Local sin API)! Listo para NotebookLM.', 'success');
    } catch (err) {
      console.error('Error en modo local:', err);
      showToast('Error al estructurar el playbook local', 'danger');
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.innerHTML = originalHtml;
    }
    return;
  }

  // CASO 2: CON API KEY -> GOOGLE GEMINI CON FALLBACK AL MODO LOCAL
  try {
    if (btn) btn.disabled = true;
    if (btnText) {
      btnText.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Analizando con IA (Google Gemini)...';
    }

    const systemInstruction = buildPlaybookSystemPrompt(style);
    const userPromptText = `Aquí están mis notas y reglas brutas de trading para que las estructures en mi Playbook Institucional:\n\n${rawText}`;

    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    let generatedMarkdown = null;
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\n---\n\n${userPromptText}` }]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4096
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Error ${response.status}: ${response.statusText}`;
          throw new Error(errMsg);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          generatedMarkdown = data.candidates[0].content.parts[0].text;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Falló modelo ${model}:`, err.message);
      }
    }

    if (!generatedMarkdown) {
      throw lastError || new Error('No se pudo obtener respuesta de la API de Gemini');
    }

    strategyState.rawInput = rawText;
    strategyState.style = style;
    strategyState.markdown = generatedMarkdown;
    strategyState.updatedAt = new Date().toISOString();

    const editorEl = document.getElementById('playbook-raw-markdown');
    if (editorEl) editorEl.value = generatedMarkdown;

    renderPlaybookMarkdown(generatedMarkdown);
    switchPlaybookView('preview');
    savePlaybookToStorage();

    showToast('✨ ¡Playbook Institucional generado con IA (Gemini) con éxito!', 'success');

  } catch (error) {
    console.warn('Fallo llamada a Gemini API, activando fallback local:', error);
    showToast(`Gemini API: ${error.message}. Activando Modo Local Automático...`, 'warning');

    // Fallback inmediato a Modo Local para no dejar al usuario bloqueado
    const localMarkdown = generateLocalPlaybook(rawText, style);
    strategyState.rawInput = rawText;
    strategyState.style = style;
    strategyState.markdown = localMarkdown;
    strategyState.updatedAt = new Date().toISOString();

    const editorEl = document.getElementById('playbook-raw-markdown');
    if (editorEl) editorEl.value = localMarkdown;

    renderPlaybookMarkdown(localMarkdown);
    switchPlaybookView('preview');
    savePlaybookToStorage();
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.innerHTML = originalHtml;
  }
}

// Copiar Prompt Maestro para usar en ChatGPT / Claude / Gemini Web
function copyMasterStrategyPrompt() {
  const rawInputEl = document.getElementById('strategy-raw-input');
  const styleSelect = document.getElementById('strategy-style-select');
  const rawText = rawInputEl ? rawInputEl.value.trim() : '';
  const style = styleSelect ? styleSelect.value : 'SMC / ICT & Order Flow';

  const userNotes = rawText || '[PEGA AQUÍ TUS REGLAS, HORARIOS, SETUPS Y LÍMITES DE RIESGO]';
  const systemPrompt = buildPlaybookSystemPrompt(style);

  const fullPrompt = `${systemPrompt}

================================================================================
AQUÍ ESTÁN MIS NOTAS Y REGLAS OPERATIVAS PARA ESTRUCTURAR MI PLAYBOOK:
================================================================================
${userNotes}

Por favor genera el Playbook en Markdown completo siguiendo la estructura institucional requerida.`;

  navigator.clipboard.writeText(fullPrompt).then(() => {
    showToast('📋 ¡Prompt Maestro copiado! Pégalo en ChatGPT, Claude o Gemini Web y luego copia el resultado aquí.', 'success');
    switchPlaybookView('edit');
    const editorEl = document.getElementById('playbook-raw-markdown');
    if (editorEl) editorEl.focus();
  }).catch(() => {
    showToast('No se pudo copiar automáticamente al portapapeles', 'warning');
  });
}

// Switcher entre vista visual y editor markdown
function switchPlaybookView(viewMode) {
  const previewTabBtn = document.getElementById('btn-tab-preview');
  const editTabBtn = document.getElementById('btn-tab-edit');
  const previewContainer = document.getElementById('playbook-preview-container');
  const editorTextarea = document.getElementById('playbook-raw-markdown');

  if (viewMode === 'preview') {
    if (previewTabBtn) previewTabBtn.classList.add('active');
    if (editTabBtn) editTabBtn.classList.remove('active');
    if (previewContainer) previewContainer.style.display = 'block';
    if (editorTextarea) editorTextarea.style.display = 'none';

    // Sincronizar cambios si el usuario editó en modo textarea
    if (editorTextarea) {
      renderPlaybookMarkdown(editorTextarea.value);
    }
  } else {
    if (editTabBtn) editTabBtn.classList.add('active');
    if (previewTabBtn) previewTabBtn.classList.remove('active');
    if (editorTextarea) editorTextarea.style.display = 'block';
    if (previewContainer) previewContainer.style.display = 'none';
    if (editorTextarea) editorTextarea.focus();
  }
}

function syncPlaybookEdit() {
  const editorEl = document.getElementById('playbook-raw-markdown');
  if (editorEl) {
    strategyState.markdown = editorEl.value;
  }
}

// Conversor ligero y seguro de Markdown a HTML para el visor
function renderPlaybookMarkdown(markdown) {
  const emptyState = document.getElementById('playbook-empty-state');
  const contentBody = document.getElementById('playbook-rendered-content');
  if (!contentBody) return;

  if (!markdown || !markdown.trim()) {
    if (emptyState) emptyState.style.display = 'flex';
    contentBody.style.display = 'none';
    contentBody.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  contentBody.style.display = 'block';

  // Sanitizado básico y traducción de sintaxis Markdown
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Encabezados
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^\&gt; (.*$)/gim, '<blockquote>$1</blockquote>');

  // Negritas y cursivas
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Checklists y listas
  html = html.replace(/^- \[ \] (.*$)/gim, '<div style="margin: 4px 0; display:flex; align-items:center; gap:6px;"><input type="checkbox" disabled style="margin:0;"> <span>$1</span></div>');
  html = html.replace(/^- \[x\] (.*$)/gim, '<div style="margin: 4px 0; display:flex; align-items:center; gap:6px;"><input type="checkbox" checked disabled style="margin:0;"> <span>$1</span></div>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

  // Envolver <li> contiguos en <ul>
  html = html.replace(/(<li>.*<\/li>)/gims, (match) => {
    return `<ul>${match}</ul>`;
  });

  // Código en línea
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

  // Saltos de línea en párrafos
  html = html.replace(/\n\n+/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-3]>)/g, '$1');
  html = html.replace(/(<\/h[1-3]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>.*<\/blockquote>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>.*<\/ul>)<\/p>/g, '$1');

  contentBody.innerHTML = html;
}

// Descargar Playbook en formato .MD para NotebookLM
function downloadPlaybookMD() {
  const editorEl = document.getElementById('playbook-raw-markdown');
  const markdown = editorEl ? editorEl.value.trim() : (strategyState.markdown || '');

  if (!markdown) {
    showToast('Primero genera o redacta tu Playbook antes de descargarlo.', 'warning');
    return;
  }

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const cleanDate = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `Playbook_Estrategia_Trading_NotebookLM_${cleanDate}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('📥 Archivo Markdown descargado. ¡Listo para subir como fuente a NotebookLM!', 'success');
}

// Descargar Playbook en formato .TXT para NotebookLM
function downloadPlaybookTXT() {
  const editorEl = document.getElementById('playbook-raw-markdown');
  const markdown = editorEl ? editorEl.value.trim() : (strategyState.markdown || '');

  if (!markdown) {
    showToast('Primero genera o redacta tu Playbook antes de descargarlo.', 'warning');
    return;
  }

  const blob = new Blob([markdown], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const cleanDate = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `Playbook_Estrategia_Trading_NotebookLM_${cleanDate}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('📄 Archivo de texto plano (.txt) descargado para NotebookLM.', 'success');
}

// Copiar todo el Markdown generado al portapapeles
function copyPlaybookMarkdown() {
  const editorEl = document.getElementById('playbook-raw-markdown');
  const markdown = editorEl ? editorEl.value.trim() : (strategyState.markdown || '');

  if (!markdown) {
    showToast('No hay contenido para copiar.', 'warning');
    return;
  }

  navigator.clipboard.writeText(markdown).then(() => {
    showToast('📋 Playbook copiado al portapapeles.', 'success');
  }).catch(() => {
    showToast('No se pudo copiar automáticamente', 'warning');
  });
}

// Guardar Playbook en localStorage y opcionalmente en Supabase
async function savePlaybookAction() {
  const rawInputEl = document.getElementById('strategy-raw-input');
  const styleSelect = document.getElementById('strategy-style-select');
  const editorEl = document.getElementById('playbook-raw-markdown');

  strategyState.rawInput = rawInputEl ? rawInputEl.value : '';
  strategyState.style = styleSelect ? styleSelect.value : 'SMC / ICT & Order Flow';
  strategyState.markdown = editorEl ? editorEl.value : '';
  strategyState.updatedAt = new Date().toISOString();

  savePlaybookToStorage();

  // Sincronizar con Supabase si está logueado
  if (supabaseClient && currentAuthUser) {
    try {
      const payload = {
        id: `playbook_${currentAuthUser.id}`,
        user_id: currentAuthUser.id,
        title: 'Mi Playbook Operativo',
        style: strategyState.style,
        raw_input: strategyState.rawInput,
        markdown_content: strategyState.markdown,
        updated_at: strategyState.updatedAt
      };

      const { error } = await supabaseClient
        .from('trading_playbooks')
        .upsert(payload, { onConflict: 'id' });

      if (!error) {
        showToast('💾 Playbook guardado localmente y sincronizado en Supabase Cloud', 'success');
        return;
      }
    } catch (e) {
      console.warn('Error al sincronizar playbook con Supabase:', e);
    }
  }

  showToast('💾 Playbook guardado en este navegador', 'success');
}

function savePlaybookToStorage() {
  try {
    localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(strategyState));
  } catch (e) {
    console.warn('Error al guardar en localStorage', e);
  }
}

async function loadPlaybookFromStorage() {
  // 1. Intentar cargar desde localStorage
  try {
    const raw = localStorage.getItem(STRATEGY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      strategyState = Object.assign(strategyState, parsed);
    }
  } catch (e) {
    console.warn('Error al leer playbook de localStorage', e);
  }

  // 2. Si está logueado en Supabase, verificar si hay versión más reciente en la nube
  if (supabaseClient && currentAuthUser) {
    try {
      const { data, error } = await supabaseClient
        .from('trading_playbooks')
        .select('*')
        .eq('user_id', currentAuthUser.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        strategyState.rawInput = data.raw_input || strategyState.rawInput;
        strategyState.style = data.style || strategyState.style;
        strategyState.markdown = data.markdown_content || strategyState.markdown;
        strategyState.updatedAt = data.updated_at;
      }
    } catch (e) {
      console.warn('No se pudo cargar playbook de Supabase:', e);
    }
  }

  // 3. Reflejar en la UI
  const rawInputEl = document.getElementById('strategy-raw-input');
  if (rawInputEl && strategyState.rawInput) {
    rawInputEl.value = strategyState.rawInput;
    updateStrategyCharCount();
  }

  const styleSelect = document.getElementById('strategy-style-select');
  if (styleSelect && strategyState.style) {
    styleSelect.value = strategyState.style;
  }

  const editorEl = document.getElementById('playbook-raw-markdown');
  if (editorEl && strategyState.markdown) {
    editorEl.value = strategyState.markdown;
  }

  if (strategyState.markdown) {
    renderPlaybookMarkdown(strategyState.markdown);
  }
}

// Copiar prompts de la guía con feedback visual en la tarjeta
function copyPromptToClipboard(cardEl) {
  const textEl = cardEl.querySelector('.prompt-text');
  if (!textEl) return;
  const prompt = textEl.textContent.replace(/^"|"$/g, '').trim();

  navigator.clipboard.writeText(prompt).then(() => {
    const hint = cardEl.querySelector('.click-copy-hint');
    const originalText = hint ? hint.innerHTML : '';
    if (hint) {
      hint.innerHTML = '<i class="fa-solid fa-check" style="color: var(--profit);"></i> ¡Copiado!';
      setTimeout(() => {
        hint.innerHTML = originalText;
      }, 2000);
    }
    showToast('Prompt de auditoría copiado para NotebookLM', 'info');
  }).catch(() => {
    showToast('No se pudo copiar automáticamente', 'warning');
  });
}


