/* ==========================================================================
   TheRaiseTrader - TRADES MANAGER (LIVE, MISSED & ANALYSIS MODES)
   ========================================================================== */
function setTradeModalCurrentTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const timeInput = document.getElementById('modal-trade-time');
  if (timeInput) {
    timeInput.value = `${hh}:${mm}`;
    calculateTradeDurationInModal();
  }
}

function setTradeModalCurrentExitTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const timeInput = document.getElementById('modal-trade-exit-time');
  if (timeInput) {
    timeInput.value = `${hh}:${mm}`;
    calculateTradeDurationInModal();
  }
}

function formatTradeDuration(entryTime, exitTime) {
  if (!entryTime || !exitTime) return null;
  const p1 = entryTime.split(':').map(Number);
  const p2 = exitTime.split(':').map(Number);
  if (p1.length < 2 || p2.length < 2 || isNaN(p1[0]) || isNaN(p1[1]) || isNaN(p2[0]) || isNaN(p2[1])) return null;

  let diffMinutes = (p2[0] * 60 + p2[1]) - (p1[0] * 60 + p1[1]);
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Para trades que cruzan la medianoche
  }

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

function getTradeDurationMinutes(entryTime, exitTime) {
  if (!entryTime || !exitTime) return null;
  const p1 = entryTime.split(':').map(Number);
  const p2 = exitTime.split(':').map(Number);
  if (p1.length < 2 || p2.length < 2 || isNaN(p1[0]) || isNaN(p1[1]) || isNaN(p2[0]) || isNaN(p2[1])) return null;

  let diffMinutes = (p2[0] * 60 + p2[1]) - (p1[0] * 60 + p1[1]);
  if (diffMinutes < 0) diffMinutes += 24 * 60;
  return diffMinutes;
}

function calculateTradeDurationInModal() {
  const entryInput = document.getElementById('modal-trade-time');
  const exitInput = document.getElementById('modal-trade-exit-time');
  const badge = document.getElementById('modal-duration-badge');
  const textEl = document.getElementById('modal-duration-text');
  if (!badge || !textEl) return;

  const entryVal = entryInput ? entryInput.value : '';
  const exitVal = exitInput ? exitInput.value : '';

  if (entryVal && exitVal) {
    const formatted = formatTradeDuration(entryVal, exitVal);
    if (formatted) {
      textEl.innerText = formatted;
      badge.style.display = 'inline-flex';
      return;
    }
  }
  badge.style.display = 'none';
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

// =============================================================================
// GESTIÓN DE MODOS DE TRADE: EJECUTADO vs OMITIDO vs ANÁLISIS
// =============================================================================
function setTradeTypeMode(type) {
  const tradeTypeInput = document.getElementById('modal-trade-type');
  if (tradeTypeInput) tradeTypeInput.value = type;

  const btnExec = document.getElementById('btn-type-executed');
  const btnMiss = document.getElementById('btn-type-missed');
  const btnAna = document.getElementById('btn-type-analysis');
  const missedSection = document.getElementById('modal-missed-section');
  const pnlGroup = document.getElementById('form-group-modal-pnl');
  const pnlInput = document.getElementById('modal-pnl');
  const modalTitle = document.getElementById('trade-modal-title');
  const missedSectionTitle = document.getElementById('missed-section-title');

  if (btnExec) btnExec.classList.toggle('active', type === 'EXECUTED');
  if (btnMiss) btnMiss.classList.toggle('active', type === 'MISSED');
  if (btnAna) btnAna.classList.toggle('active', type === 'ANALYSIS');

  if (type === 'EXECUTED') {
    if (missedSection) missedSection.style.display = 'none';
    if (pnlGroup) pnlGroup.style.display = 'block';
    if (pnlInput) pnlInput.required = true;
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-chart-line"></i> Registrar Trade en Vivo';
  } else if (type === 'MISSED') {
    if (missedSection) missedSection.style.display = 'block';
    if (pnlGroup) pnlGroup.style.display = 'none';
    if (pnlInput) { pnlInput.required = false; pnlInput.value = '0'; }
    if (missedSectionTitle) missedSectionTitle.innerText = 'Motivo y Análisis Psicológico de la Omisión';
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-clock-rotate-left" style="color: #f59e0b;"></i> Registrar Trade Omitido (Missed Trade)';
  } else if (type === 'ANALYSIS') {
    if (missedSection) missedSection.style.display = 'block';
    if (pnlGroup) pnlGroup.style.display = 'none';
    if (pnlInput) { pnlInput.required = false; pnlInput.value = '0'; }
    if (missedSectionTitle) missedSectionTitle.innerText = 'Objetivo y Estudio del Análisis Técnico';
    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-microscope" style="color: #38bdf8;"></i> Registrar Análisis / Estudio Técnico';
  }
}

function selectMissedReason(element, reason) {
  document.querySelectorAll('#modal-missed-reasons-chips .chip').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
  const input = document.getElementById('modal-missed-reason');
  if (input) input.value = reason;
  
  const customInput = document.getElementById('modal-missed-custom-reason');
  if (reason.includes('Otro') && customInput) {
    customInput.focus();
  }
}

function syncCustomMissedReason(val) {
  const hiddenReason = document.getElementById('modal-missed-reason');
  if (val && val.trim()) {
    if (hiddenReason) hiddenReason.value = val.trim();
  } else {
    const selectedChip = document.querySelector('#modal-missed-reasons-chips .chip.selected');
    if (selectedChip && hiddenReason) {
      hiddenReason.value = selectedChip.innerText.replace(/^[^\s]+\s/, '').trim();
    }
  }
}

// Live Trade Modal Logic
function openTradeModal(editIndex = -1, defaultType = 'EXECUTED') {
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
    const trade = state.currentDraftTrades[editIndex];
    const tradeType = trade.tradeType || 'EXECUTED';
    setTradeTypeMode(tradeType);

    if (tradeType === 'EXECUTED') {
      modalTitle.innerHTML = '<i class="fa-solid fa-pen"></i> Editar Trade';
    } else if (tradeType === 'MISSED') {
      modalTitle.innerHTML = '<i class="fa-solid fa-pen" style="color: #f59e0b;"></i> Editar Trade Omitido';
    } else {
      modalTitle.innerHTML = '<i class="fa-solid fa-pen" style="color: #38bdf8;"></i> Editar Análisis';
    }

    document.getElementById('modal-asset').value = trade.asset;
    document.getElementById('modal-direction').value = trade.direction;
    document.getElementById('modal-trade-time').value = trade.time || '';
    document.getElementById('modal-trade-exit-time').value = trade.exitTime || '';
    document.getElementById('modal-entry-price').value = (trade.entryPrice !== undefined && trade.entryPrice !== null) ? trade.entryPrice : '';
    document.getElementById('modal-exit-price').value = (trade.exitPrice !== undefined && trade.exitPrice !== null) ? trade.exitPrice : '';
    document.getElementById('modal-lots').value = trade.lots;
    document.getElementById('modal-pnl').value = trade.pnl;
    document.getElementById('modal-rr').value = trade.rr;
    document.getElementById('modal-setup').value = trade.setup;
    document.getElementById('modal-chart-url').value = trade.chartUrl || '';
    document.getElementById('modal-trade-notes').value = trade.notes || '';
    document.getElementById('modal-trade-tags').value = trade.tags || '';

    // Restore missed / analysis fields
    const customReasonInput = document.getElementById('modal-missed-custom-reason');
    if (customReasonInput) customReasonInput.value = trade.customMissedReason || '';
    const outcomeSelect = document.getElementById('modal-theoretical-outcome');
    if (outcomeSelect) outcomeSelect.value = trade.theoreticalOutcome || 'TP';
    const rrTheoretical = document.getElementById('modal-theoretical-rr');
    if (rrTheoretical) rrTheoretical.value = trade.theoreticalRr || trade.rr || '2.5';
    const reasonHidden = document.getElementById('modal-missed-reason');
    if (reasonHidden) reasonHidden.value = trade.missedReason || 'El movimiento fue muy rápido / Sin retroceso';

    // Highlight matching reason chip
    const chips = document.querySelectorAll('#modal-missed-reasons-chips .chip');
    let matched = false;
    chips.forEach(chip => {
      chip.classList.remove('selected');
      if (trade.missedReason && chip.innerText.toLowerCase().includes(trade.missedReason.toLowerCase().slice(0, 15))) {
        chip.classList.add('selected');
        matched = true;
      }
    });
    if (!matched && trade.customMissedReason) {
      const otroChip = Array.from(chips).find(c => c.innerText.includes('Otro'));
      if (otroChip) otroChip.classList.add('selected');
    }

    calculatePointsDifference();
    calculateTradeDurationInModal();

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
    form.reset();
    setTradeTypeMode(defaultType || 'EXECUTED');
    setTradeModalCurrentTime();
    if (accSelect) {
      accSelect.value = 'REPLICATED';
    }
    document.getElementById('modal-entry-price').value = '';
    document.getElementById('modal-exit-price').value = '';
    document.getElementById('modal-trade-exit-time').value = '';
    calculatePointsDifference();
    calculateTradeDurationInModal();

    document.getElementById('modal-lots').value = '1.0';
    document.getElementById('modal-pnl').value = (defaultType === 'EXECUTED') ? '350.00' : '0.00';
    document.getElementById('modal-rr').value = '2.5';
    document.getElementById('modal-trade-tags').value = (defaultType === 'EXECUTED') ? 'Plan Ejecutado 100%' : 'Trade Omitido';

    // Reset missed trade section
    const customReasonInput = document.getElementById('modal-missed-custom-reason');
    if (customReasonInput) customReasonInput.value = '';
    const outcomeSelect = document.getElementById('modal-theoretical-outcome');
    if (outcomeSelect) outcomeSelect.value = 'TP';
    const rrTheoretical = document.getElementById('modal-theoretical-rr');
    if (rrTheoretical) rrTheoretical.value = '2.5';
    const reasonHidden = document.getElementById('modal-missed-reason');
    if (reasonHidden) reasonHidden.value = 'El movimiento fue muy rápido / Sin retroceso';
    document.querySelectorAll('#modal-missed-reasons-chips .chip').forEach((c, idx) => {
      c.classList.toggle('selected', idx === 0);
    });

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
  state.editingTradeIndex = -1;
  state.editingSavedTradeContext = null;
  const modal = document.getElementById('trade-modal');
  if (modal) modal.classList.remove('active');
}

// Edición de Operaciones ya Guardadas en el Historial/Calendario
function openEditSavedTradeModal(sessionId, tradeIndex) {
  const s = (state.sessions || []).find(x => x.id === sessionId);
  if (!s || !s.trades || !s.trades[tradeIndex]) {
    showToast('Operación no encontrada', 'error');
    return;
  }

  const trade = s.trades[tradeIndex];
  state.editingSavedTradeContext = { sessionId: sessionId, tradeIndex: tradeIndex };
  state.editingTradeIndex = -1;

  const modal = document.getElementById('trade-modal');
  const modalTitle = document.getElementById('trade-modal-title');
  const form = document.getElementById('trade-form');

  // Si estaba en modo sin trades, apagarlo temporalmente para la edición
  if (state.noTradesMode) {
    toggleNoTradesMode(false);
  }

  // Populate trade account selector with session accounts
  const accSelect = document.getElementById('modal-trade-account');
  if (accSelect) {
    const sessionAccounts = s.accountsList && s.accountsList.length > 0 ? s.accountsList : (s.account ? s.account.split(',').map(a => a.trim()) : []);
    let accOptions = `<option value="REPLICATED">⚡ Replicar en Todas las Cuentas de la Sesión</option>`;
    sessionAccounts.forEach(acc => {
      accOptions += `<option value="${acc}">🎯 Solo ${acc}</option>`;
    });
    accSelect.innerHTML = accOptions;
    accSelect.value = trade.account || 'REPLICATED';
  }

  // Reset image preview
  removeImagePreview();

  const tradeType = trade.tradeType || 'EXECUTED';
  setTradeTypeMode(tradeType);

  if (tradeType === 'EXECUTED') {
    modalTitle.innerHTML = `<i class="fa-solid fa-pen"></i> Editar Trade (#${tradeIndex + 1} • ${s.date})`;
  } else if (tradeType === 'MISSED') {
    modalTitle.innerHTML = `<i class="fa-solid fa-pen" style="color: #f59e0b;"></i> Editar Trade Omitido / Se Escapó (#${tradeIndex + 1} • ${s.date})`;
  } else {
    modalTitle.innerHTML = `<i class="fa-solid fa-pen" style="color: #38bdf8;"></i> Editar Análisis (#${tradeIndex + 1} • ${s.date})`;
  }

  document.getElementById('modal-asset').value = trade.asset || 'NQ';
  document.getElementById('modal-direction').value = trade.direction || 'LONG';
  document.getElementById('modal-trade-time').value = trade.time || '';
  document.getElementById('modal-trade-exit-time').value = trade.exitTime || '';
  document.getElementById('modal-entry-price').value = (trade.entryPrice !== undefined && trade.entryPrice !== null) ? trade.entryPrice : '';
  document.getElementById('modal-exit-price').value = (trade.exitPrice !== undefined && trade.exitPrice !== null) ? trade.exitPrice : '';
  document.getElementById('modal-lots').value = trade.lots !== undefined ? trade.lots : 1;
  document.getElementById('modal-pnl').value = trade.pnl !== undefined ? trade.pnl : 0;
  document.getElementById('modal-rr').value = trade.rr !== undefined ? trade.rr : 2.5;
  document.getElementById('modal-setup').value = trade.setup || 'Reversión en Soporte/Resistencia';
  document.getElementById('modal-chart-url').value = trade.chartUrl || '';
  document.getElementById('modal-trade-notes').value = trade.notes || '';
  document.getElementById('modal-trade-tags').value = trade.tags || '';

  // Restore missed / analysis fields
  const customReasonInput = document.getElementById('modal-missed-custom-reason');
  if (customReasonInput) customReasonInput.value = trade.customMissedReason || '';
  const outcomeSelect = document.getElementById('modal-theoretical-outcome');
  if (outcomeSelect) outcomeSelect.value = trade.theoreticalOutcome || 'TP';
  const rrTheoretical = document.getElementById('modal-theoretical-rr');
  if (rrTheoretical) rrTheoretical.value = trade.theoreticalRr || trade.rr || '2.5';
  const reasonHidden = document.getElementById('modal-missed-reason');
  if (reasonHidden) reasonHidden.value = trade.missedReason || 'El movimiento fue muy rápido / Sin retroceso';

  // Highlight matching reason chip
  const chips = document.querySelectorAll('#modal-missed-reasons-chips .chip');
  let matched = false;
  chips.forEach(chip => {
    chip.classList.remove('selected');
    if (trade.missedReason && chip.innerText.toLowerCase().includes(trade.missedReason.toLowerCase().slice(0, 15))) {
      chip.classList.add('selected');
      matched = true;
    }
  });
  if (!matched && trade.customMissedReason) {
    const otroChip = Array.from(chips).find(c => c.innerText.includes('Otro'));
    if (otroChip) otroChip.classList.add('selected');
  }

  calculatePointsDifference();
  calculateTradeDurationInModal();

  if (trade.chartImage) {
    setImagePreview(trade.chartImage);
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

  if (modal) modal.classList.add('active');
}


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

function saveTradeFromModal(event) {
  event.preventDefault();
  
  const tradeType = document.getElementById('modal-trade-type')?.value || 'EXECUTED';
  const customReason = document.getElementById('modal-missed-custom-reason')?.value.trim() || '';
  const selectedChipReason = document.getElementById('modal-missed-reason')?.value.trim() || 'El movimiento fue muy rápido / Sin retroceso';
  const finalMissedReason = customReason || selectedChipReason;
  const theoreticalOutcome = document.getElementById('modal-theoretical-outcome')?.value || 'TP';
  const theoreticalRr = parseFloat(document.getElementById('modal-theoretical-rr')?.value) || 0;
  const isMissedOrAnalysis = (tradeType === 'MISSED' || tradeType === 'ANALYSIS');

  const entryVal = parseFloat(document.getElementById('modal-entry-price')?.value);
  const exitVal = parseFloat(document.getElementById('modal-exit-price')?.value);
  const dir = document.getElementById('modal-direction').value;
  let pointsDiff = null;
  if (!isNaN(entryVal) && !isNaN(exitVal) && entryVal > 0 && exitVal > 0) {
    pointsDiff = dir === 'LONG' ? (exitVal - entryVal) : (entryVal - exitVal);
  }

  const timeVal = document.getElementById('modal-trade-time')?.value || '';
  const exitTimeVal = document.getElementById('modal-trade-exit-time')?.value || '';
  const durFormatted = formatTradeDuration(timeVal, exitTimeVal);
  const durMins = getTradeDurationMinutes(timeVal, exitTimeVal);
  const pnlVal = isMissedOrAnalysis ? 0 : (parseFloat(document.getElementById('modal-pnl')?.value) || 0);

  const tradeData = {
    id: (state.editingTradeIndex >= 0 && state.currentDraftTrades[state.editingTradeIndex]) ? state.currentDraftTrades[state.editingTradeIndex].id : Date.now(),
    tradeType: tradeType,
    missedReason: isMissedOrAnalysis ? finalMissedReason : null,
    customMissedReason: customReason,
    theoreticalOutcome: isMissedOrAnalysis ? theoreticalOutcome : null,
    theoreticalRr: isMissedOrAnalysis ? theoreticalRr : null,
    account: document.getElementById('modal-trade-account')?.value || 'REPLICATED',
    time: timeVal,
    exitTime: exitTimeVal,
    duration: durFormatted,
    durationMinutes: durMins,
    entryPrice: !isNaN(entryVal) ? entryVal : null,
    exitPrice: !isNaN(exitVal) ? exitVal : null,
    points: pointsDiff,
    asset: document.getElementById('modal-asset').value.trim(),
    direction: dir,
    lots: parseFloat(document.getElementById('modal-lots').value) || 1,
    pnl: pnlVal,
    rr: isMissedOrAnalysis ? theoreticalRr : (parseFloat(document.getElementById('modal-rr').value) || 0),
    setup: document.getElementById('modal-setup').value,
    tags: document.getElementById('modal-trade-tags').value,
    chartUrl: document.getElementById('modal-chart-url').value.trim(),
    chartImage: document.getElementById('modal-chart-base64').value,
    notes: document.getElementById('modal-trade-notes').value.trim()
  };

  if (state.editingSavedTradeContext) {
    const { sessionId, tradeIndex } = state.editingSavedTradeContext;
    const session = (state.sessions || []).find(s => s.id === sessionId);
    if (session && session.trades && session.trades[tradeIndex]) {
      tradeData.id = session.trades[tradeIndex].id || tradeData.id;
      session.trades[tradeIndex] = tradeData;

      // Recalcular netPnl de la sesión
      session.netPnl = (session.trades || []).reduce((acc, t) => {
        if (t.tradeType === 'MISSED' || t.tradeType === 'ANALYSIS') return acc;
        return acc + (parseFloat(t.pnl) || 0);
      }, 0);

      // Guardar en localStorage
      if (typeof saveToLocalStorage === 'function') saveToLocalStorage();

      // Sincronizar en la nube (Supabase)
      if (typeof saveSessionToCloud === 'function') {
        saveSessionToCloud(session);
      }

      // Re-renderizar dashboards e historiales
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof renderHistory === 'function') renderHistory();
      if (typeof renderCalendar === 'function') renderCalendar();

      // Si el modal de detalles del día en calendario está abierto, actualizarlo
      const calModal = document.getElementById('calendar-day-modal');
      if (calModal && calModal.classList.contains('active') && typeof openCalendarDayDetails === 'function') {
        openCalendarDayDetails(session.date);
      }

      // Si el modal de reporte personal/notebooklm está abierto para esta sesión, re-renderizarlo
      const reportModal = document.getElementById('daily-personal-report-modal');
      if (reportModal && reportModal.classList.contains('active') && typeof openDailyPersonalReport === 'function') {
        openDailyPersonalReport(session.id);
      }

      // Si el modal de edición de sesión está abierto, actualizar su resumen
      const editSessionModal = document.getElementById('edit-session-modal');
      if (editSessionModal && editSessionModal.classList.contains('active') && typeof openEditSessionModal === 'function') {
        openEditSessionModal(session.id);
      }

      showToast('¡Operación actualizada y sincronizada con éxito!', 'success');
      state.editingSavedTradeContext = null;
      closeTradeModal();
      return;
    }
  }

  if (state.editingTradeIndex >= 0) {
    state.currentDraftTrades[state.editingTradeIndex] = tradeData;
    showToast('Trade actualizado correctamente', 'success');
  } else {
    state.currentDraftTrades.push(tradeData);
    const toastMsg = tradeType === 'MISSED' ? 'Trade omitido registrado para tu estudio y psicología' : 
                     (tradeType === 'ANALYSIS' ? 'Análisis técnico registrado en la sesión' : 'Trade agregado a la sesión');
    showToast(toastMsg, 'success');
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
            ¿Abriste posiciones hoy, se te escapó una entrada o el mercado no cumplió tus reglas? Elige una opción:
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary" onclick="openTradeModal(-1, 'EXECUTED')">
              <i class="fa-solid fa-plus"></i> + Agregar Trade en Vivo
            </button>
            <button type="button" class="btn btn-warning-soft" onclick="openTradeModal(-1, 'MISSED')">
              <i class="fa-solid fa-clock-rotate-left"></i> + Trade Omitido / Análisis
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
  let executedCount = 0;
  let missedCount = 0;

  tbody.innerHTML = state.currentDraftTrades.map((t, idx) => {
    const isMissed = t.tradeType === 'MISSED';
    const isAnalysis = t.tradeType === 'ANALYSIS';
    const isExecuted = !isMissed && !isAnalysis;

    if (isExecuted) {
      totalPnl += (t.pnl || 0);
      executedCount++;
    } else {
      missedCount++;
    }

    const isWin = (t.pnl || 0) >= 0;
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

    const timeDisplay = t.exitTime ? `${t.time || '--:--'} ➔ ${t.exitTime}` : (t.time || '--:--');
    const durVal = t.duration || formatTradeDuration(t.time, t.exitTime);
    const durationPill = durVal ? `
      <div style="margin-top: 3px;">
        <span class="badge" style="font-size: 0.68rem; padding: 1px 6px; background: rgba(56, 189, 248, 0.12); color: var(--accent-primary); border: 1px solid rgba(56, 189, 248, 0.25);">
          <i class="fa-solid fa-hourglass-half"></i> ${durVal}
        </span>
      </div>
    ` : '';

    // Badge de tipo de trade
    let typeBadgeHtml = '';
    if (isMissed) {
      typeBadgeHtml = `<div style="margin-top: 2px;"><span class="badge badge-missed" style="font-size: 0.65rem;"><i class="fa-solid fa-clock-rotate-left"></i> OMITIDO</span></div>`;
    } else if (isAnalysis) {
      typeBadgeHtml = `<div style="margin-top: 2px;"><span class="badge badge-analysis" style="font-size: 0.65rem;"><i class="fa-solid fa-microscope"></i> ANÁLISIS</span></div>`;
    }

    // Columna P&L
    let pnlColumnHtml = '';
    if (isMissed) {
      const outcomeColor = t.theoreticalOutcome === 'TP' ? 'var(--profit)' : (t.theoreticalOutcome === 'SL' ? 'var(--loss)' : '#f59e0b');
      const outcomeText = t.theoreticalOutcome === 'TP' ? '✅ Habría sido TP' : (t.theoreticalOutcome === 'SL' ? '❌ Habría sido SL' : (t.theoreticalOutcome === 'BE' ? '⚪ Breakeven' : '⏳ Sin definir'));
      pnlColumnHtml = `
        <span class="badge badge-missed" style="font-size: 0.72rem;">$0.00 (Teórico)</span>
        <div style="font-size: 0.68rem; margin-top: 3px; font-weight: 700; color: ${outcomeColor};">${outcomeText}</div>
      `;
    } else if (isAnalysis) {
      pnlColumnHtml = `
        <span class="badge badge-analysis" style="font-size: 0.72rem;">$0.00 (Estudio)</span>
        <div style="font-size: 0.68rem; margin-top: 3px; font-weight: 700; color: #38bdf8;">${t.theoreticalOutcome || 'Proyección'}</div>
      `;
    } else {
      pnlColumnHtml = `<span class="badge ${pnlClass}">$${t.pnl.toFixed(2)}</span>`;
    }

    // Columna Setup y Motivo
    let setupColumnHtml = `<strong>${t.setup}</strong>`;
    if (isMissed) {
      setupColumnHtml += `<div style="font-size: 0.72rem; color: #f59e0b; margin-top: 3px; font-weight: 600;"><i class="fa-solid fa-brain"></i> ${t.missedReason || 'Omitido'}</div>`;
    } else if (isAnalysis) {
      setupColumnHtml += `<div style="font-size: 0.72rem; color: #38bdf8; margin-top: 3px; font-weight: 600;"><i class="fa-solid fa-microscope"></i> ${t.missedReason || 'Análisis técnico'}</div>`;
    }

    // Columna R:R
    const rrDisplay = (isMissed || isAnalysis) 
      ? `<strong>1:${t.theoreticalRr || t.rr || 0}</strong> <small style="color: var(--text-muted); font-size: 0.7rem;">(Teo)</small>` 
      : `<strong>1:${t.rr}</strong>`;

    return `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td>
          <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; white-space: nowrap;">
            <i class="fa-regular fa-clock"></i> ${timeDisplay}
          </div>
          ${durationPill}
        </td>
        <td>
          <strong>${t.asset}</strong>
          ${typeBadgeHtml}
          ${(t.account && t.account !== 'REPLICATED')
            ? `<div style="margin-top: 2px;"><span class="badge" style="font-size: 0.65rem; background: #e0e7ff; color: #4338ca;"><i class="fa-solid fa-wallet"></i> ${t.account}</span></div>`
            : `<div style="margin-top: 2px;"><span class="badge" style="font-size: 0.65rem; background: #f1f5f9; color: var(--text-muted);"><i class="fa-solid fa-bolt"></i> Replicado</span></div>`}
        </td>
        <td><span class="badge ${dirClass}">${t.direction}</span></td>
        <td>${priceHtml}</td>
        <td>${t.lots} Lotes</td>
        <td>${setupColumnHtml}</td>
        <td>${imageHtml}</td>
        <td><span style="font-size: 0.8rem; color: var(--text-muted);">${t.tags || (isMissed ? 'Trade Omitido' : 'Plan estándar')}</span></td>
        <td>${pnlColumnHtml}</td>
        <td>${rrDisplay}</td>
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
  
  const countLabel = missedCount > 0 
    ? `${executedCount} Ejecutados (+${missedCount} Omitidos/Estudio)` 
    : `${executedCount}`;
  document.getElementById('current-session-count').innerText = countLabel;
}

// Complete Session Save Handler