/* ==========================================================================
   TRADING JOURNAL & PSYCHOLOGY TRACKER - APPLICATION LOGIC
   NotebookLM Integration & 3-Phase Session Workflow
   ========================================================================== */

// Global State
let state = {
  sessions: [],
  currentStep: 1,
  currentDraftTrades: [],
  editingTradeIndex: -1,
  equityChart: null,
  errorsChart: null,
  currentSessionAccounts: ['FTMO 100K', 'Apex 50K #1', 'Apex 50K #2'],
  currentSessionAccountRisks: { 'FTMO 100K': 1000, 'Apex 50K #1': 500, 'Apex 50K #2': 500 }
};

const LOCAL_STORAGE_KEY = 'TRADING_JOURNAL_PRO_DATA_V1';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  initializeDefaults();
  renderDashboard();
  renderHistory();
  generateNotebookLMReport();
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
}

function initializeDefaults() {
  // Set today's date in form
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('session-date');
  if (dateInput) dateInput.value = today;

  renderAccountsChips();
  renderRiskInputs();
  toggleRiskPerAccountBox();
}


// Navigation Tabs
function switchTab(tabId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => btn.getAttribute('onclick')?.includes(tabId));
  if (activeBtn) activeBtn.classList.add('active');

  const targetContent = document.getElementById(`tab-${tabId}`);
  if (targetContent) targetContent.classList.add('active');

  if (tabId === 'dashboard') {
    renderDashboard();
  } else if (tabId === 'history') {
    renderHistory();
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

  // Toggle selected state
  element.classList.toggle('selected');

  // Collect selected chip texts
  const selected = Array.from(container.querySelectorAll('.chip.selected')).map(c => c.innerText.trim());
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

// Live Trade Modal Logic
function openTradeModal(editIndex = -1) {
  state.editingTradeIndex = editIndex;
  const modal = document.getElementById('trade-modal');
  const modalTitle = document.getElementById('trade-modal-title');
  const form = document.getElementById('trade-form');

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
    document.getElementById('modal-lots').value = trade.lots;
    document.getElementById('modal-pnl').value = trade.pnl;
    document.getElementById('modal-rr').value = trade.rr;
    document.getElementById('modal-setup').value = trade.setup;
    document.getElementById('modal-chart-url').value = trade.chartUrl || '';
    document.getElementById('modal-trade-notes').value = trade.notes || '';
    document.getElementById('modal-trade-tags').value = trade.tags || '';

    if (trade.chartImage) {
      setImagePreview(trade.chartImage);
    }
  } else {
    modalTitle.innerHTML = '<i class="fa-solid fa-chart-line"></i> Registrar Trade en Vivo';
    form.reset();
    document.getElementById('modal-lots').value = '1.0';
    document.getElementById('modal-pnl').value = '350.00';
    document.getElementById('modal-rr').value = '2.5';
  }

  modal.classList.add('active');
}

function closeTradeModal() {
  document.getElementById('trade-modal').classList.remove('active');
}

function toggleTradeChip(element) {
  element.classList.toggle('selected');
  const container = element.parentElement;
  const selected = Array.from(container.querySelectorAll('.chip.selected')).map(c => c.innerText.trim());
  document.getElementById('modal-trade-tags').value = selected.join(', ');
}

// Screenshot & Image Handling (File Upload, Drag & Drop, Clipboard Paste)
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
      // Compress image to max 1600px width/height and 0.8 JPEG quality
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

      // Convert to JPEG with 0.8 quality (80-90% size reduction)
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

// Global Clipboard Paste (Ctrl+V) listener when modal is open
document.addEventListener('paste', (event) => {
  const modal = document.getElementById('trade-modal');
  if (!modal || !modal.classList.contains('active')) return;

  const items = (event.clipboardData || event.originalEvent.clipboardData).items;
  for (let index in items) {
    const item = items[index];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      processImageFile(blob);
      showToast('¡Pantallazo pegado desde el portapapeles!', 'success');
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
  
  const tradeData = {
    id: Date.now(),
    asset: document.getElementById('modal-asset').value.trim(),
    direction: document.getElementById('modal-direction').value,
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
    showToast('Trade actualizado', 'success');
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
  showToast('Trade eliminado de la borrador', 'info');
}

function renderDraftTradesTable() {
  const tbody = document.getElementById('session-trades-tbody');
  if (!tbody) return;

  if (state.currentDraftTrades.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <i class="fa-solid fa-chart-bar empty-icon"></i>
          <p>No has registrado trades en esta sesión aún.</p>
          <button type="button" class="btn btn-primary btn-sm" style="margin-top: 0.5rem;" onclick="openTradeModal()">+ Agregar Primer Trade</button>
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

    return `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td><strong>${t.asset}</strong></td>
        <td><span class="badge ${dirClass}">${t.direction}</span></td>
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
        acceptLoss: checkAcceptLossInput ? checkAcceptLossInput.checked : false
      },
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
      trades: state.currentDraftTrades ? [...state.currentDraftTrades] : [],
      adherence: adherenceInput?.value || '100% - Ejecución Perfecta según el plan',
      disciplineScore: parseInt(disciplineInput?.value) || 9,
      mistakes: mistakesInput?.value || '',
      takeaway: takeawayInput?.value || '',
      netPnl: state.currentDraftTrades ? state.currentDraftTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) : 0
    };

    if (!state.sessions) state.sessions = [];
    state.sessions.unshift(session); // Add to top
    saveToLocalStorage();

    // Reset Folio Maestro Inputs & Textarea
    ['session-nodo-1', 'session-nodo-2', 'session-nodo-3', 'session-improve',
     'session-ifthen-feel-1', 'session-ifthen-do-1', 'session-ifthen-feel-2', 'session-ifthen-do-2',
     'session-ifthen-feel-3', 'session-ifthen-do-3', 'session-ifthen-feel-4', 'session-ifthen-do-4',
     'session-takeaway'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Reset mistakes chips
    document.querySelectorAll('#mistakes-chips .chip').forEach(c => c.classList.remove('selected'));
    if (mistakesInput) mistakesInput.value = '';

    // Reset Draft
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

// Dashboard Calculations & Rendering
function renderDashboard() {
  const sessions = state.sessions;

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

  sessions.forEach(s => {
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

    s.trades.forEach(t => {
      totalTrades++;
      totalPnl += t.pnl;
      runningCapital += t.pnl;

      if (runningCapital > peakCapital) {
        peakCapital = runningCapital;
      }
      const dd = peakCapital - runningCapital;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }

      if (t.pnl >= 0) {
        wins++;
        grossProfit += t.pnl;
      } else {
        losses++;
        grossLoss += Math.abs(t.pnl);
      }
    });
  });

  // Calculate Metrics
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? 'INF' : '0.00');
  const avgDiscipline = sessions.length > 0 ? (totalDiscipline / sessions.length).toFixed(1) : '10.0';

  // Update UI Cards
  const pnlEl = document.getElementById('dash-net-pnl');
  pnlEl.innerText = `$${totalPnl.toFixed(2)}`;
  pnlEl.style.color = totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)';

  document.getElementById('dash-pnl-sub').innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> ${sessions.length} Sesiones Registradas`;
  document.getElementById('dash-winrate').innerText = `${winRate}%`;
  document.getElementById('dash-winrate-sub').innerText = `${wins} Ganadas / ${losses} Pérdidas (${totalTrades} total)`;
  document.getElementById('dash-profit-factor').innerText = profitFactor;
  document.getElementById('dash-discipline').innerText = `${avgDiscipline} / 10`;
  document.getElementById('dash-drawdown').innerText = `$${maxDrawdown.toFixed(2)}`;

  // Render Charts
  renderEquityChart(sessions);
  renderErrorsChart(mistakesMap);

  // Render Recent Table
  renderRecentSessionsTable(sessions.slice(0, 5));
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
  gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
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
          backgroundColor: '#ffffff',
          titleColor: '#0f172a',
          bodyColor: '#059669',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }
      },
      scales: {
        x: {
          grid: { color: '#e2e8f0' },
          ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: '#e2e8f0' },
          ticks: {
            color: '#64748b',
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
          '#db2777'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#475569', font: { family: 'Inter', size: 11 }, boxWidth: 12 }
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

        ${s.trades && s.trades.length > 0 ? `
          <div class="table-responsive">
            <table class="custom-table" style="font-size: 0.8rem;">
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Tipo</th>
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

                  return `
                    <tr>
                      <td><strong>${t.asset}</strong></td>
                      <td><span class="badge ${t.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${t.direction}</span></td>
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
        ` : '<p style="font-size: 0.8rem; color: var(--text-subtle);">No se registraron trades individuales en esta sesión.</p>'}
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

// Clean Personal HTML Generators (Without AI Prompts)
function buildDailyPersonalHTML(s) {
  const isProfit = s.netPnl >= 0;

  const pnlClass = isProfit ? 'badge-profit' : 'badge-loss';

  let html = `
    <div class="personal-report-header">
      <div>
        <h2 class="personal-report-title">Informe Diario de Trading</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">${s.date} &bull; ${s.timeSlot} &bull; ${s.account}</p>
      </div>
      <div>
        <span class="badge ${pnlClass}" style="font-size: 1.25rem; padding: 0.5rem 1rem;">
          ${isProfit ? '+$' : '-$'}${Math.abs(s.netPnl).toFixed(2)} USD
        </span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="metrics-grid" style="margin-bottom: 1.5rem;">
      <div class="metric-card purple-theme">
        <div class="metric-label">Disciplina</div>
        <div class="metric-value">${s.disciplineScore}/10</div>
        <div class="metric-subtext">${s.adherence}</div>
      </div>
      <div class="metric-card ${isProfit ? 'profit-theme' : 'loss-theme'}">
        <div class="metric-label">Estado Mental</div>
        <div class="metric-value" style="font-size: 1.2rem;">${s.preEmotion}</div>
        <div class="metric-subtext">Energía: ${s.energyScore}/10 | Sesgo: ${s.bias}</div>
      </div>
    </div>

    ${s.accountRisks && Object.keys(s.accountRisks).length > 0 ? `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.2rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; box-shadow: var(--shadow-sm);">
        <h4 style="color: var(--loss); font-size: 0.92rem; margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.5rem;">
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
      <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.04), rgba(79, 70, 229, 0.02)); border: 1.5px solid rgba(124, 58, 237, 0.25); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; box-shadow: var(--shadow-sm);">
        <h4 style="color: #7c3aed; font-size: 1rem; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-brain"></i> Folio Maestro: Medicina Preventiva Psicológica (Definida Pre-Sesión)
        </h4>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; font-size: 0.88rem;">
          ${s.folioMaestro.noDo && s.folioMaestro.noDo.length > 0 ? `
            <div style="background: var(--bg-card); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
              <strong style="color: var(--loss); font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.4rem;">
                <i class="fa-solid fa-ban"></i> 1. Hoy NO Haré:
              </strong>
              <ul style="margin: 0; padding-left: 1.2rem; color: var(--text-main); line-height: 1.5;">
                ${s.folioMaestro.noDo.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${s.folioMaestro.improve ? `
            <div style="background: var(--bg-card); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
              <strong style="color: var(--profit); font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.4rem;">
                <i class="fa-solid fa-crosshair"></i> 2. Hoy Mejoraré en:
              </strong>
              <p style="margin: 0; color: var(--text-main); font-weight: 600; line-height: 1.5;">${s.folioMaestro.improve}</p>
            </div>
          ` : ''}

          ${s.folioMaestro.ifThen && s.folioMaestro.ifThen.length > 0 ? `
            <div style="grid-column: 1 / -1; background: var(--bg-card); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
              <strong style="color: var(--accent-primary); font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.5rem;">
                <i class="fa-solid fa-code-branch"></i> 3. Protocolos Si-Entonces (Comandos de Emergencia):
              </strong>
              <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                ${s.folioMaestro.ifThen.map(p => `
                  <div style="background: var(--bg-main); padding: 0.45rem 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.84rem;">
                    <span style="color: var(--accent-primary); font-weight: 700;">Si siento:</span> ${p.feel} <strong style="color: var(--accent-primary); margin: 0 4px;">➔ Haré:</strong> <span style="color: var(--profit); font-weight: 700;">${p.do}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    ` : ''}

    <!-- Trades Table -->
    <h3 style="font-family: var(--font-heading); color: var(--text-main); margin-bottom: 0.75rem;">Operaciones Registradas</h3>

  `;

  if (s.trades && s.trades.length > 0) {
    html += `
      <div class="table-responsive" style="margin-bottom: 1.5rem;">
        <table class="custom-table">
          <thead>
            <tr>
              <th class="col-center col-col1">#</th>
              <th class="col-left col-col2">Activo</th>
              <th class="col-center col-col3">Dirección</th>
              <th class="col-center col-col4">Lotes</th>
              <th class="col-left col-col5">Estrategia</th>
              <th class="col-right col-col6">P&L ($)</th>
              <th class="col-center col-col7">R:R</th>
              <th class="col-center col-col8">Gráfico</th>
              <th class="col-left col-col9">Etiquetas / Notas</th>
            </tr>
          </thead>
          <tbody>
            ${s.trades.map((t, idx) => `
              <tr>
                <td class="col-center col-col1"><strong>${idx + 1}</strong></td>
                <td class="col-left col-col2"><strong>${t.asset}</strong></td>
                <td class="col-center col-col3"><span class="badge ${t.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${t.direction}</span></td>
                <td class="col-center col-col4">${t.lots}</td>
                <td class="col-left col-col5">${t.setup}</td>
                <td class="col-right col-col6"><span class="badge ${t.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">$${t.pnl.toFixed(2)}</span></td>
                <td class="col-center col-col7">1:${t.rr}</td>
                <td class="col-center col-col8">
                  ${t.chartImage || t.chartUrl ? `<span style="color: #34d399; font-weight: 700; cursor: pointer; font-size: 0.78rem; white-space: nowrap;" onclick="openLightbox('${t.chartImage || t.chartUrl}')"><i class="fa-solid fa-camera"></i> Anexo #${idx + 1}</span>` : '-'}
                </td>

                <td class="col-left col-col9" style="line-height: 1.4;">${t.tags || '-'} ${t.notes ? `<br><small style="color: var(--text-muted);">${t.notes}</small>` : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    html += `<p style="color: var(--text-muted); margin-bottom: 1.5rem;">No se realizaron operaciones en esta sesión.</p>`;
  }

  html += `
    <!-- Retrospective -->
    <div style="background: #f8fafc; border: 1px solid var(--border-color); padding: 1.25rem; border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
      <h4 style="color: var(--accent-primary); margin-bottom: 0.5rem;"><i class="fa-solid fa-lightbulb"></i> Lección Principal del Día</h4>
      <p style="font-size: 0.95rem; color: var(--text-main);">${s.takeaway || 'Sin comentarios registrados.'}</p>
      ${s.mistakes ? `<p style="font-size: 0.85rem; color: var(--loss); margin-top: 0.5rem;"><strong>Errores anotados:</strong> ${s.mistakes}</p>` : ''}
    </div>
  `;

  // Chart Annex for Daily Report
  const tradesWithImages = s.trades ? s.trades.filter(t => t.chartImage || t.chartUrl) : [];
  if (tradesWithImages.length > 0) {
    html += `
      <div class="print-page-break" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 2px dashed var(--border-color);">
        <h3 style="font-family: var(--font-heading); color: var(--accent-primary); margin-bottom: 0.5rem; font-size: 1.3rem;">
          <i class="fa-solid fa-images"></i> ANEXO: CAPTURAS DE PANTALLA Y ANÁLISIS DE GRÁFICOS
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
          A continuación se presentan en tamaño completo los pantallazos asociados a las operaciones de la sesión:
        </p>
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          ${tradesWithImages.map(t => `
            <div class="annex-card">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                <span style="font-family: var(--font-heading); font-weight: 700; color: var(--text-main); font-size: 1.05rem;">
                  📷 Anexo #${s.trades.indexOf(t) + 1}: ${t.asset} (${t.direction}) &mdash; Setup: ${t.setup}
                </span>
                <span class="badge ${t.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">
                  ${t.pnl >= 0 ? '+$' : '-$'}${Math.abs(t.pnl).toFixed(2)} USD (R:R 1:${t.rr})
                </span>
              </div>
              ${t.notes ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;"><strong>Notas / Bitácora:</strong> ${t.notes}</p>` : ''}
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
  if (relevant.length === 0) return '<p class="empty-state">No hay datos suficientes.</p>';

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
    <div class="personal-report-header">
      <div>
        <h2 class="personal-report-title">Informe Ejecutivo ${title}</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Consolidado de ${relevant.length} sesiones de trading</p>
      </div>
      <div>
        <span class="badge ${totalPnl >= 0 ? 'badge-profit' : 'badge-loss'}" style="font-size: 1.25rem; padding: 0.5rem 1rem;">
          ${totalPnl >= 0 ? '+$' : '-$'}${Math.abs(totalPnl).toFixed(2)} USD
        </span>
      </div>
    </div>

    <!-- High level metrics -->
    <div class="metrics-grid" style="margin-bottom: 2rem;">
      <div class="metric-card purple-theme">
        <div class="metric-label">Win Rate</div>
        <div class="metric-value">${winRate}%</div>
        <div class="metric-subtext">${wins} Ganadas / ${losses} Perdidas</div>
      </div>
      <div class="metric-card profit-theme">
        <div class="metric-label">Profit Factor</div>
        <div class="metric-value">${profitFactor}</div>
        <div class="metric-subtext">Beneficio vs Pérdida</div>
      </div>
      <div class="metric-card warning-theme">
        <div class="metric-label">Total Trades</div>
        <div class="metric-value">${totalTrades}</div>
        <div class="metric-subtext">Operaciones Ejecutadas</div>
      </div>
    </div>

    <h3 style="font-family: var(--font-heading); color: var(--text-main); margin-bottom: 1rem;">Sesiones del Período</h3>
  `;

  relevant.forEach((s, idx) => {
    const isWin = s.netPnl >= 0;
    html += `
      <div class="personal-session-block">
        <div class="personal-session-title">
          <span><strong>Día ${idx + 1}: ${s.date}</strong> (${s.account})</span>
          <span class="badge ${isWin ? 'badge-profit' : 'badge-loss'}">${isWin ? '+$' : '-$'}${Math.abs(s.netPnl).toFixed(2)}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          <strong>Estado Pre-Mercado:</strong> ${s.preEmotion} | <strong>Disciplina:</strong> ${s.disciplineScore}/10
        </p>
        <p style="font-size: 0.9rem; color: var(--text-main); background: #f1f5f9; border: 1px solid #e2e8f0; padding: 0.6rem 0.9rem; border-radius: 6px; margin-bottom: 0.75rem;">
          💡 <em>"${s.takeaway || 'Sin comentarios.'}"</em>
        </p>

        ${s.trades && s.trades.length > 0 ? `
          <table class="custom-table" style="font-size: 0.8rem;">
            <thead>
              <tr>
                <th class="col-left">Activo</th>
                <th class="col-center">Dirección</th>
                <th class="col-left">Estrategia</th>
                <th class="col-right">P&L ($)</th>
                <th class="col-center">R:R</th>
                <th class="col-center">Captura</th>
                <th class="col-left">Notas</th>
              </tr>
            </thead>
            <tbody>
              ${s.trades.map((t, tIdx) => `
                <tr>
                  <td class="col-left"><strong>${t.asset}</strong></td>
                  <td class="col-center"><span class="badge ${t.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${t.direction}</span></td>
                  <td class="col-left">${t.setup}</td>
                  <td class="col-right"><span class="badge ${t.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">$${t.pnl.toFixed(2)}</span></td>
                  <td class="col-center">1:${t.rr}</td>
                  <td class="col-center">${t.chartImage || t.chartUrl ? `<span class="badge badge-profit" onclick="openLightbox('${t.chartImage || t.chartUrl}')" style="cursor: pointer; font-size: 0.7rem;"><i class="fa-solid fa-camera"></i> Anexo</span>` : '-'}</td>
                  <td class="col-left">${t.tags || '-'}</td>
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
      <div class="print-page-break" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 2px dashed var(--border-color);">
        <h3 style="font-family: var(--font-heading); color: var(--accent-primary); margin-bottom: 0.5rem; font-size: 1.3rem;">
          <i class="fa-solid fa-images"></i> ANEXO CONSOLIDADO DE CAPTURAS Y ANÁLISIS GRÁFICO
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
          Galería completa de capturas de pantalla registradas en las sesiones del período (${allAnnexTrades.length} imágenes):
        </p>
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          ${allAnnexTrades.map((item, idx) => `
            <div class="annex-card">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                <span style="font-family: var(--font-heading); font-weight: 700; color: var(--text-main); font-size: 1.05rem;">
                  📷 Anexo #${idx + 1}: ${item.sessionDate} (${item.account}) &mdash; ${item.trade.asset} (${item.trade.direction})
                </span>
                <span class="badge ${item.trade.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">
                  ${item.trade.pnl >= 0 ? '+$' : '-$'}${Math.abs(item.trade.pnl).toFixed(2)} USD (Setup: ${item.trade.setup})
                </span>
              </div>
              ${item.trade.notes ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;"><strong>Notas:</strong> ${item.trade.notes}</p>` : ''}
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
  if (s.trades && s.trades.length > 0) {
    md += `| # | Activo | Tipo | Lotes | Setup | P&L ($) | R:R | Captura Gráfico | Psicología / Notas |\n`;
    md += `|---|---|---|---|---|---|---|---|---|\n`;
    s.trades.forEach((t, i) => {
      const imgRef = t.chartImage ? `[Pantallazo Adjunto]` : (t.chartUrl ? `[Link Gráfico](${t.chartUrl})` : '-');
      md += `| ${i + 1} | ${t.asset} | ${t.direction} | ${t.lots} | ${t.setup} | $${t.pnl.toFixed(2)} | 1:${t.rr} | ${imgRef} | ${t.tags || '-'} ${t.notes ? '(' + t.notes + ')' : ''} |\n`;
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
  md += `> *"Actúa como mi Head Trader y Mentor de Psicología en Trading de Cuentas de Fondeo. Lee este reporte diario junto con mi Plan de Trading pre-cargado en esta libreta. Analiza si mi ejecución hoy estuvo alineada a mis reglas, evalúa si caí en el ciclo de auge/crisis (tilteo o sobreconfianza), y dame 3 recomendaciones concretas y específicas para mi próxima sesión."*\n`;

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
  }
}

function closePaperTemplate() {
  const modal = document.getElementById('paper-template-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function printPaperTemplate() {
  window.print();
}
