/* ==========================================================================
   TheRaiseTrader - HISTORY LIST, AUDIT DETAILS & SESSION EDIT
   ========================================================================== */
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
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span class="badge ${pnlClass}" style="font-size: 1rem; padding: 0.4rem 0.8rem;">$${s.netPnl.toFixed(2)}</span>
            <button class="btn btn-secondary btn-sm" onclick="openEditSessionModal('${s.id}')" title="Editar sesión o cambiar fecha">
              <i class="fa-solid fa-pen-to-square"></i> Editar
            </button>
            <button class="btn btn-secondary btn-sm" onclick="exportSingleSessionReport('${s.id}')" title="Exportar informe Markdown">
              <i class="fa-solid fa-brain"></i> Export MD
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteSession('${s.id}')" title="Eliminar sesión">
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

        ${(s.noTrades || s.checklist?.noTradeSession?.noTrades || !s.trades || s.trades.length === 0) ? `
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
                  const isMissed = t.tradeType === 'MISSED';
                  const isAnalysis = t.tradeType === 'ANALYSIS';

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

                  const timeDisplay = t.exitTime ? `${t.time || '--:--'} ➔ ${t.exitTime}` : (t.time || '--:--');
                  const durVal = t.duration || formatTradeDuration(t.time, t.exitTime);
                  const durHtml = durVal ? `<div style="margin-top: 2px;"><span class="badge" style="font-size: 0.68rem; padding: 1px 5px; background: rgba(56, 189, 248, 0.12); color: var(--accent-primary);"><i class="fa-solid fa-hourglass-half"></i> ${durVal}</span></div>` : '';

                  let typeBadgeHtml = '';
                  let pnlCellHtml = '';
                  let rrCellHtml = `1:${t.rr}`;
                  let setupCellHtml = t.setup;

                  if (isMissed) {
                    typeBadgeHtml = `<div style="margin-top: 2px;"><span class="badge badge-missed" style="font-size: 0.65rem;"><i class="fa-solid fa-clock-rotate-left"></i> OMITIDO</span></div>`;
                    setupCellHtml = `<div>${t.setup}</div><div style="font-size: 0.7rem; color: #f59e0b; margin-top: 2px;"><i class="fa-solid fa-brain"></i> ${t.missedReason || 'Omitido'}</div>`;
                    const outColor = t.theoreticalOutcome === 'TP' ? 'var(--profit)' : (t.theoreticalOutcome === 'SL' ? 'var(--loss)' : '#f59e0b');
                    const outText = t.theoreticalOutcome === 'TP' ? '✅ TP Teo' : (t.theoreticalOutcome === 'SL' ? '❌ SL Teo' : (t.theoreticalOutcome === 'BE' ? 'BE' : 'Teórico'));
                    pnlCellHtml = `<span class="badge badge-missed" style="font-size: 0.72rem; color: ${outColor};">$0.00 (${outText})</span>`;
                    rrCellHtml = `1:${t.theoreticalRr || t.rr || 0} <small>(Teo)</small>`;
                  } else if (isAnalysis) {
                    typeBadgeHtml = `<div style="margin-top: 2px;"><span class="badge badge-analysis" style="font-size: 0.65rem;"><i class="fa-solid fa-microscope"></i> ANÁLISIS</span></div>`;
                    setupCellHtml = `<div>${t.setup}</div><div style="font-size: 0.7rem; color: #38bdf8; margin-top: 2px;"><i class="fa-solid fa-microscope"></i> ${t.missedReason || 'Estudio'}</div>`;
                    pnlCellHtml = `<span class="badge badge-analysis" style="font-size: 0.72rem;">$0.00 (${t.theoreticalOutcome || 'Proy'})</span>`;
                    rrCellHtml = `1:${t.theoreticalRr || t.rr || 0} <small>(Teo)</small>`;
                  } else {
                    pnlCellHtml = `<span class="badge ${t.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">$${t.pnl.toFixed(2)}</span>`;
                  }

                  return `
                    <tr>
                      <td>
                        <span style="color: var(--text-muted); font-weight: 600; white-space: nowrap;"><i class="fa-regular fa-clock"></i> ${timeDisplay}</span>
                        ${durHtml}
                      </td>
                      <td>
                        <strong>${t.asset}</strong>
                        ${typeBadgeHtml}
                      </td>
                      <td><span class="badge ${t.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${t.direction}</span></td>
                      <td style="font-size: 0.78rem;">${priceStr}</td>
                      <td>${setupCellHtml}</td>
                      <td>${imgBtn}</td>
                      <td>${pnlCellHtml}</td>
                      <td>${rrCellHtml}</td>
                      <td>${t.notes || t.tags || '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          ${(s.sessionChartImage || s.checklist?.noTradeSession?.chartImage || s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl) ? `
            <div style="margin-top: 0.85rem; padding: 0.65rem 0.9rem; background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                ${(s.sessionChartImage || s.checklist?.noTradeSession?.chartImage) ? `
                  <img src="${s.sessionChartImage || s.checklist?.noTradeSession?.chartImage}" class="chart-thumbnail" style="width: 50px; height: 50px; border-radius: 6px; cursor: pointer; object-fit: cover;" onclick="openLightbox(this.src)" title="Ver pantallazo general de la sesión">
                ` : ''}
                <div>
                  <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 5px;">
                    <i class="fa-solid fa-camera-retro" style="color: var(--accent-primary);"></i> Pantallazo General de la Sesión Completa
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Captura macro de la jornada registrada en la retrospectiva</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${(s.sessionChartImage || s.checklist?.noTradeSession?.chartImage) ? `
                  <button type="button" class="btn btn-secondary btn-sm" onclick="openLightbox('${s.sessionChartImage || s.checklist?.noTradeSession?.chartImage}')" style="font-size: 0.76rem; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-expand"></i> Ver Pantallazo
                  </button>
                ` : ''}
                ${(s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl) ? `
                  <a href="${s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.76rem; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver Gráfico
                  </a>
                ` : ''}
              </div>
            </div>
          ` : ''}
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

// Helper para calcular lunes, viernes y domingo de una fecha ISO sin desfase de zona horaria

function openEditSessionModal(sessionId) {
  const s = (state.sessions || []).find(x => x.id === sessionId);
  if (!s) {
    showToast('Sesión no encontrada', 'danger');
    return;
  }

  const idInput = document.getElementById('edit-session-id');
  const dateInput = document.getElementById('edit-session-date');
  const timeslotInput = document.getElementById('edit-session-timeslot');
  const biasInput = document.getElementById('edit-session-bias');
  const disciplineInput = document.getElementById('edit-session-discipline');
  const adherenceInput = document.getElementById('edit-session-adherence');
  const takeawayInput = document.getElementById('edit-session-takeaway');

  if (idInput) idInput.value = s.id;
  if (dateInput) dateInput.value = s.date || getLocalDateString();
  if (timeslotInput) timeslotInput.value = s.timeSlot || 'New York Open (8:00 AM - 11:30 AM)';
  if (biasInput) biasInput.value = s.bias || 'Alcista (Bullish)';
  if (disciplineInput) disciplineInput.value = s.disciplineScore || 10;
  if (adherenceInput) adherenceInput.value = s.adherence || '100% - Ejecución Perfecta según el plan';
  if (takeawayInput) takeawayInput.value = s.takeaway || '';

  const summaryEl = document.getElementById('edit-session-trades-summary');
  if (summaryEl) {
    const tradesCount = (s.trades || []).length;
    const isWin = (s.netPnl || 0) >= 0;
    const pnlColor = isWin ? 'var(--profit)' : 'var(--loss)';
    summaryEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <strong>${s.account || 'Cuenta'}</strong> &bull; ${tradesCount} operación(es)
          ${s.noTrades ? '<span class="badge badge-no-trades" style="margin-left: 6px; font-size: 0.7rem;">Día de Paciencia</span>' : ''}
        </div>
        <div style="font-weight: 800; color: ${pnlColor}; font-size: 1.05rem; font-family: var(--font-mono);">
          ${isWin ? '+' : ''}$${(s.netPnl || 0).toFixed(2)} USD
        </div>
      </div>
    `;
  }

  const modal = document.getElementById('edit-session-modal');
  if (modal) modal.classList.add('active');
}

function closeEditSessionModal() {
  const modal = document.getElementById('edit-session-modal');
  if (modal) modal.classList.remove('active');
}

function setEditSessionDateToday() {
  const input = document.getElementById('edit-session-date');
  if (input) {
    input.value = getLocalDateString();
    showToast(`Fecha cambiada a hoy (${input.value})`, 'info');
  }
}

function handleSaveEditedSession(e) {
  if (e) e.preventDefault();
  const id = document.getElementById('edit-session-id')?.value;
  const s = (state.sessions || []).find(x => x.id === id);
  if (!s) {
    showToast('Sesión no encontrada', 'danger');
    return;
  }

  const oldDate = s.date;
  const newDate = document.getElementById('edit-session-date')?.value || s.date;
  s.date = newDate;
  s.timeSlot = document.getElementById('edit-session-timeslot')?.value || s.timeSlot;
  s.bias = document.getElementById('edit-session-bias')?.value || s.bias;
  s.disciplineScore = parseInt(document.getElementById('edit-session-discipline')?.value) || s.disciplineScore;
  s.adherence = document.getElementById('edit-session-adherence')?.value || s.adherence;
  s.takeaway = document.getElementById('edit-session-takeaway')?.value || s.takeaway;

  // Actualizar también la fecha en los trades registrados
  if (Array.isArray(s.trades)) {
    s.trades.forEach(t => {
      t.date = newDate;
    });
  }

  saveToLocalStorage();

  if (state.currentUser && supabaseClient) {
    saveSessionToCloud(s);
  }

  renderDashboard();
  renderHistory();
  if (typeof generateNotebookLMReport === 'function') generateNotebookLMReport();

  closeEditSessionModal();
  closeCalendarDayModal();

  showToast(`¡Sesión actualizada! Movida de ${oldDate} al ${newDate}`, 'success');
}

// Mover sesión rápidamente al día de hoy en un clic
function quickMoveSessionToToday(sessionId) {
  const s = (state.sessions || []).find(x => x.id === sessionId);
  if (!s) return;

  const todayStr = getLocalDateString();
  const oldDate = s.date;
  s.date = todayStr;
  if (Array.isArray(s.trades)) {
    s.trades.forEach(t => { t.date = todayStr; });
  }

  saveToLocalStorage();
  if (state.currentUser && supabaseClient) {
    saveSessionToCloud(s);
  }

  renderDashboard();
  renderHistory();
  if (typeof generateNotebookLMReport === 'function') generateNotebookLMReport();
  closeCalendarDayModal();

  showToast(`¡Sesión movida con éxito al día de hoy (${todayStr})!`, 'success');
}



