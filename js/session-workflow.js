/* ==========================================================================
   TheRaiseTrader - SESSION WORKFLOW (NO-TRADES & POST-SESSION SCREENSHOT)
   ========================================================================== */
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

// =============================================================================
// GESTIÓN DE CAPTURA GENERAL DE LA SESIÓN (FASE 3: POST-SESIÓN & RETROSPECTIVA)
// =============================================================================
function handlePostSessionChartFile(event) {
  const file = event.target.files[0];
  if (file) {
    processPostSessionImageFile(file);
  }
}

function processPostSessionImageFile(file) {
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
      setPostSessionChartPreview(compressedBase64);
      showToast('Pantallazo general de la sesión cargado y optimizado', 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setPostSessionChartPreview(base64Src) {
  const hiddenInput = document.getElementById('post-session-chart-base64');
  if (hiddenInput) hiddenInput.value = base64Src;
  const previewImg = document.getElementById('post-session-chart-preview-img');
  if (previewImg) previewImg.src = base64Src;
  const wrapper = document.getElementById('post-session-chart-preview-wrapper');
  if (wrapper) wrapper.style.display = 'block';
  const prompt = document.getElementById('post-session-upload-prompt');
  if (prompt) prompt.style.display = 'none';
}

function removePostSessionChartPreview() {
  const hiddenInput = document.getElementById('post-session-chart-base64');
  if (hiddenInput) hiddenInput.value = '';
  const fileInput = document.getElementById('post-session-chart-file');
  if (fileInput) fileInput.value = '';
  const previewImg = document.getElementById('post-session-chart-preview-img');
  if (previewImg) previewImg.src = '';
  const wrapper = document.getElementById('post-session-chart-preview-wrapper');
  if (wrapper) wrapper.style.display = 'none';
  const prompt = document.getElementById('post-session-upload-prompt');
  if (prompt) prompt.style.display = 'flex';
}

// Inicialización de Arrastrar y Soltar (Drag & Drop) para todas las zonas de subida
function initImageDropZones() {
  const dropConfigs = [
    { zoneId: 'drop-zone', handler: processImageFile },
    { zoneId: 'session-chart-drop-zone', handler: processSessionImageFile },
    { zoneId: 'post-session-chart-drop-zone', handler: processPostSessionImageFile }
  ];

  dropConfigs.forEach(({ zoneId, handler }) => {
    const zone = document.getElementById(zoneId);
    if (!zone) return;

    ['dragenter', 'dragover'].forEach(eventType => {
      zone.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('drag-over');
      });
    });

    ['dragleave', 'dragend'].forEach(eventType => {
      zone.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('drag-over');
      });
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('drag-over');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handler(files[0]);
      }
    });
  });
}

// Global Clipboard Paste (Ctrl+V) listener para Modal de Trades, Sesión sin entradas y Post-Sesión
document.addEventListener('paste', (event) => {
  const tradeModal = document.getElementById('trade-modal');
  const isTradeModalOpen = tradeModal && tradeModal.classList.contains('active');

  const step2 = document.getElementById('step-content-2');
  const isStep2Open = step2 && step2.style.display !== 'none';
  const isNoTradesActive = state.noTradesMode;

  const step3 = document.getElementById('step-content-3');
  const isStep3Open = step3 && step3.style.display !== 'none';

  if (!isTradeModalOpen && !(isStep2Open && isNoTradesActive) && !isStep3Open) return;

  const items = (event.clipboardData || event.originalEvent.clipboardData).items;
  for (let index in items) {
    const item = items[index];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (isTradeModalOpen) {
        processImageFile(blob);
        showToast('¡Pantallazo del trade pegado desde el portapapeles!', 'success');
      } else if (isStep3Open) {
        processPostSessionImageFile(blob);
        showToast('¡Pantallazo general de la sesión pegado desde el portapapeles!', 'success');
      } else if (isStep2Open && isNoTradesActive) {
        processSessionImageFile(blob);
        showToast('¡Gráfico de la sesión pegado desde el portapapeles!', 'success');
      }
      break;
    }
  }
});

// Lightbox Modal Handling

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

    // Captura / Pantallazo General de la Sesión Completa (Fase 3: Post-Sesión)
    const postSessionChartImg = document.getElementById('post-session-chart-base64')?.value || '';
    const postSessionChartUrl = document.getElementById('post-session-chart-url')?.value.trim() || '';

    const finalSessionChartImage = postSessionChartImg || sessionChartImg || null;
    const finalSessionChartUrl = postSessionChartUrl || sessionChartUrl || null;

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
          chartImage: finalSessionChartImage,
          chartUrl: finalSessionChartUrl,
          notes: sessionNoTradeNotes
        } : null
      },
      noTrades: isNoTrades,
      noTradeReason: isNoTrades ? noTradeReason : null,
      sessionChartImage: finalSessionChartImage,
      sessionChartUrl: finalSessionChartUrl,
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
      netPnl: isNoTrades ? 0 : (state.currentDraftTrades ? state.currentDraftTrades.filter(t => t.tradeType !== 'MISSED' && t.tradeType !== 'ANALYSIS').reduce((sum, t) => sum + (t.pnl || 0), 0) : 0)
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
     'session-takeaway', 'session-no-trade-notes', 'session-chart-url', 'post-session-chart-url'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Reset mistakes chips
    document.querySelectorAll('#mistakes-chips .chip').forEach(c => c.classList.remove('selected'));
    if (mistakesInput) mistakesInput.value = '';

    // Reset No Trades State & Draft & Post-session chart
    removeSessionChartPreview();
    removePostSessionChartPreview();
    toggleNoTradesMode(false);
    state.currentDraftTrades = [];
    renderDraftTradesTable();
    goToStep(1);

    // Reset date input to current local date
    const dateInputEl = document.getElementById('session-date');
    if (dateInputEl) dateInputEl.value = getLocalDateString();

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