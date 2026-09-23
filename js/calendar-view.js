/* ==========================================================================
   TheRaiseTrader - CALENDAR VIEW (TRADEZELLA STYLE) & DAY MODAL
   ========================================================================== */
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
    const isSessPatience = Boolean(s.noTrades || s.checklist?.noTradeSession?.noTrades || !s.trades || s.trades.length === 0);
    if (isSessPatience) {
      daysMap[dStr].isPatienceDay = true;
    }
    if (s.chartImage || s.sessionChartImage || s.takeaway || s.noTradeNotes || (s.folioMaestro && (s.folioMaestro.noDo?.length || s.folioMaestro.improve))) {
      daysMap[dStr].hasNotesOrMedia = true;
    }
    (s.trades || []).forEach(t => {
      daysMap[dStr].trades.push(t);
      if (t.tradeType !== 'MISSED' && t.tradeType !== 'ANALYSIS') {
        daysMap[dStr].netPnl += (t.pnl || 0);
      }
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
      const executedTrades = dayData.trades.filter(t => t.tradeType !== 'MISSED' && t.tradeType !== 'ANALYSIS');
      const missedTrades = dayData.trades.filter(t => t.tradeType === 'MISSED' || t.tradeType === 'ANALYSIS');
      const hasExecuted = executedTrades.length > 0;
      const hasMissed = missedTrades.length > 0;
      let cellClass = '';
      let pnlFormatted = '';
      let subText = '';
      let dotClass = '';

      if (hasExecuted) {
        totalMonthTrades += executedTrades.length;
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

        const winTrades = executedTrades.filter(t => (t.pnl || 0) > 0).length;
        const winRate = ((winTrades / executedTrades.length) * 100).toFixed(0);
        pnlFormatted = formatCompactPnl(dayData.netPnl);

        const execLabel = `${executedTrades.length} ${executedTrades.length === 1 ? 'trade' : 'trades'} • ${winRate}%`;
        if (hasMissed) {
          const missedLabel = missedTrades.length === 1 ? '+1 escapó' : `+${missedTrades.length} escaparon`;
          subText = `<span>${execLabel}</span><span class="badge-cal-missed" title="${missedTrades.length} trade(s) que se escaparon / omitidos" style="color: #d97706; font-weight: 700; font-size: 0.62rem; background: rgba(245, 158, 11, 0.16); padding: 1px 4px; border-radius: 4px; white-space: nowrap;">${missedLabel}</span>`;
        } else {
          subText = `<span>${execLabel}</span>`;
        }
      } else if (hasMissed) {
        // Solo hubo trades que se escaparon / omitidos, sin operaciones ejecutadas
        patienceDays++;
        cellClass = 'day-patience';
        dotClass = 'dot-patience';
        pnlFormatted = '$0.00';
        const missedLabel = missedTrades.length === 1 ? '1 escapó' : `${missedTrades.length} escaparon`;
        subText = `<span>🛡️ Paciencia</span><span class="badge-cal-missed" title="${missedTrades.length} trade(s) que se escaparon / omitidos" style="color: #d97706; font-weight: 700; font-size: 0.62rem; background: rgba(245, 158, 11, 0.16); padding: 1px 4px; border-radius: 4px; white-space: nowrap;">${missedLabel}</span>`;
      } else if (dayData.isPatienceDay || dayData.sessions.length > 0) {
        patienceDays++;
        cellClass = 'day-patience';
        pnlFormatted = '$0.00';
        subText = '<span>🛡️ Paciencia</span>';
        dotClass = 'dot-patience';
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
          <div class="cal-day-pnl ${dayData.netPnl > 0 ? 'pnl-win' : (dayData.netPnl < 0 ? 'pnl-loss' : (dayData.isPatienceDay || dayData.sessions.length > 0 ? 'pnl-patience' : 'pnl-neutral'))}">
            ${pnlFormatted}
          </div>
          <div class="cal-day-sub">
            ${subText}
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
    const isPatience = Boolean(s.noTrades || s.checklist?.noTradeSession?.noTrades || !s.trades || s.trades.length === 0);
    if (isPatience) {
      patienceSessions.push(s);
    }
    (s.trades || []).forEach(t => {
      if (!isFiltered || !t.account || t.account === 'REPLICATED' || t.account === targetAccount) {
        allTrades.push({ ...t, sessionAccount: s.account });
        if (t.tradeType !== 'MISSED' && t.tradeType !== 'ANALYSIS') {
          totalDayPnl += (t.pnl || 0);
        }
      }
    });
  });

  const executedTrades = allTrades.filter(t => t.tradeType !== 'MISSED' && t.tradeType !== 'ANALYSIS');
  const missedTrades = allTrades.filter(t => t.tradeType === 'MISSED' || t.tradeType === 'ANALYSIS');
  const wins = executedTrades.filter(t => (t.pnl || 0) > 0).length;
  const losses = executedTrades.filter(t => (t.pnl || 0) < 0).length;
  const be = executedTrades.filter(t => (t.pnl || 0) === 0).length;
  const wr = executedTrades.length > 0 ? ((wins / executedTrades.length) * 100).toFixed(1) : '0.0';
  const missedDesc = missedTrades.length > 0 ? ` <small style="font-size: 0.72rem; color: #d97706; font-weight: 700;">(+${missedTrades.length} ${missedTrades.length === 1 ? 'escapó' : 'escaparon'})</small>` : '';

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
        <div class="val">${executedTrades.length}${missedDesc}</div>
      </div>
      <div class="cal-modal-stat-card">
        <div class="label">Win Rate</div>
        <div class="val">${wr}%</div>
      </div>
      <div class="cal-modal-stat-card">
        <div class="label">Ganadas / Perdidas</div>
        <div class="val" style="font-size: 1.05rem;">${wins}W / ${losses}L${be > 0 ? ` / ${be}BE` : ''}</div>
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
      const reason = ps.noTradeReason || ps.checklist?.noTradeSession?.reason || (ps.mistakes && ps.mistakes.includes('Paciencia') ? ps.mistakes : (ps.takeaway || 'Día de Paciencia • Sin operaciones ejecutadas según el plan'));
      const chartImg = ps.chartImage || ps.sessionChartImage || ps.checklist?.noTradeSession?.chartImage;
      const chartHtml = chartImg ? `
        <div style="margin-top: 0.75rem;">
          <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">Captura del Gráfico:</span><br>
          <img src="${chartImg}" class="chart-thumbnail" style="max-height: 140px; margin-top: 4px;" onclick="openLightbox('${chartImg}')" title="Ver pantallazo full size">
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
    const titleOps = executedTrades.length > 0
      ? `Operaciones de la Sesión (${executedTrades.length} Ejecutada${executedTrades.length === 1 ? '' : 's'}${missedTrades.length > 0 ? ` • ${missedTrades.length} que se escapó` : ''})`
      : `Trades Omitidos / En Estudio (${missedTrades.length} que se escapó)`;

    bodyHtml += `
      <h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
        <i class="fa-solid fa-list-check" style="color: var(--accent-primary);"></i> ${titleOps}
      </h4>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
    `;

    allTrades.forEach((t, idx) => {
      const isMissed = t.tradeType === 'MISSED';
      const isAnalysis = t.tradeType === 'ANALYSIS';
      const isWin = (t.pnl || 0) >= 0;
      const pnlClass = isWin ? 'badge-profit' : 'badge-loss';
      const dirClass = t.direction === 'LONG' ? 'badge-long' : 'badge-short';
      const accountBadge = (t.account && t.account !== 'REPLICATED')
        ? `<span class="badge" style="background: #e0e7ff; color: #4338ca; font-size: 0.72rem;"><i class="fa-solid fa-wallet"></i> ${t.account}</span>`
        : `<span class="badge" style="background: #f1f5f9; color: var(--text-muted); font-size: 0.72rem;"><i class="fa-solid fa-bolt"></i> Replicado</span>`;

      const typeBadge = isMissed 
        ? `<span class="badge badge-missed" style="font-size: 0.72rem;"><i class="fa-solid fa-clock-rotate-left"></i> OMITIDO</span>`
        : (isAnalysis ? `<span class="badge badge-analysis" style="font-size: 0.72rem;"><i class="fa-solid fa-microscope"></i> ANÁLISIS</span>` : '');

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

      let rightSideHtml = '';
      if (isMissed) {
        const outColor = t.theoreticalOutcome === 'TP' ? 'var(--profit)' : (t.theoreticalOutcome === 'SL' ? 'var(--loss)' : '#f59e0b');
        const outText = t.theoreticalOutcome === 'TP' ? '✅ Habría sido TP' : (t.theoreticalOutcome === 'SL' ? '❌ Habría sido SL' : (t.theoreticalOutcome === 'BE' ? '⚪ Breakeven' : '⏳ Teórico'));
        rightSideHtml = `
          <div style="text-align: right;">
            <span class="badge badge-missed" style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700; color: ${outColor};">
              ${outText} (1:${t.theoreticalRr || t.rr || '0'}R)
            </span>
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 2px;">$0.00 en balance</div>
          </div>
        `;
      } else if (isAnalysis) {
        rightSideHtml = `
          <div style="text-align: right;">
            <span class="badge badge-analysis" style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700;">
              Proyección (1:${t.theoreticalRr || t.rr || '0'}R)
            </span>
          </div>
        `;
      } else {
        rightSideHtml = `
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge ${pnlClass}" style="font-family: var(--font-mono); font-size: 0.95rem; font-weight: 800;">
              ${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}
            </span>
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-subtle);">1:${t.rr || '0'}</span>
          </div>
        `;
      }

      const reasonBanner = isMissed ? `
        <div style="font-size: 0.8rem; color: #f59e0b; margin: 0.4rem 0; background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 0.35rem 0.65rem; border-radius: 4px;">
          <strong><i class="fa-solid fa-brain"></i> Motivo de omisión:</strong> ${t.missedReason || 'No especificado'}
        </div>
      ` : (isAnalysis ? `
        <div style="font-size: 0.8rem; color: #38bdf8; margin: 0.4rem 0; background: rgba(56, 189, 248, 0.08); border-left: 3px solid #38bdf8; padding: 0.35rem 0.65rem; border-radius: 4px;">
          <strong><i class="fa-solid fa-microscope"></i> Análisis técnico:</strong> ${t.missedReason || 'Estudio'}
        </div>
      ` : '');

      bodyHtml += `
        <div class="cal-trade-item-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-weight: 800; font-size: 0.95rem;">#${idx + 1} ${t.asset}</span>
              <span class="badge ${dirClass}">${t.direction}</span>
              ${typeBadge}
              ${accountBadge}
              <span style="font-size: 0.8rem; color: var(--text-subtle); display: inline-flex; align-items: center; gap: 4px;">
                <i class="fa-regular fa-clock"></i> ${t.exitTime ? `${t.time || '--:--'} ➔ ${t.exitTime}` : (t.time || '--:--')}
                ${(t.duration || formatTradeDuration(t.time, t.exitTime)) ? ` &bull; <span style="color: var(--accent-primary); font-weight: 700;"><i class="fa-solid fa-hourglass-half"></i> ${t.duration || formatTradeDuration(t.time, t.exitTime)}</span>` : ''}
              </span>
            </div>
            ${rightSideHtml}
          </div>

          ${reasonBanner}

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

  // Lista de Sesiones Registradas este día con opciones de edición y reubicación
  if (sessions.length > 0) {
    const todayStr = getLocalDateString();
    bodyHtml += `
      <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px dashed var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h4 style="font-size: 0.9rem; color: var(--text-muted); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-layer-group" style="color: var(--accent-primary);"></i> Sesiones registradas en esta fecha (${sessions.length})
          </h4>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.6rem;">
    `;

    sessions.forEach((s, sIdx) => {
      const isWrongDay = (s.date !== todayStr);
      const isWin = (s.netPnl || 0) >= 0;
      const pnlColor = isWin ? 'var(--profit)' : 'var(--loss)';
      const tradesCount = (s.trades || []).length;
      
      bodyHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-hover); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); flex-wrap: wrap; gap: 0.6rem;">
          <div style="font-size: 0.83rem;">
            <span style="font-weight: 700; color: var(--text-main);">${s.account || 'Cuenta'}</span> &bull; 
            <span style="color: var(--text-muted);">${s.timeSlot || 'Turno'}</span>
            <span style="margin-left: 8px; font-weight: 800; color: ${pnlColor}; font-family: var(--font-mono);">
              ${isWin ? '+' : ''}$${(s.netPnl || 0).toFixed(2)}
            </span>
            ${s.noTrades ? '<span class="badge badge-no-trades" style="margin-left: 6px; font-size: 0.68rem; padding: 2px 6px;">Día de Paciencia</span>' : `<span class="badge" style="background: rgba(79, 70, 229, 0.1); color: var(--accent-primary); font-size: 0.68rem; padding: 2px 6px; margin-left: 6px;">${tradesCount} trade(s)</span>`}
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${isWrongDay ? `
              <button type="button" class="btn btn-warning btn-xs" onclick="quickMoveSessionToToday('${s.id}')" title="Mover esta sesión a hoy (${todayStr})" style="font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-arrow-right"></i> Mover a Hoy
              </button>
            ` : ''}
            <button type="button" class="btn btn-secondary btn-xs" onclick="openEditSessionModal('${s.id}')" title="Editar detalles o cambiar fecha de la sesión" style="display: inline-flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-pen-to-square"></i> Editar Fecha
            </button>
          </div>
        </div>
      `;
    });

    bodyHtml += `</div></div>`;
  }

  body.innerHTML = bodyHtml;
  modal.classList.add('active');
}

function closeCalendarDayModal() {
  const modal = document.getElementById('calendar-day-modal');
  if (modal) modal.classList.remove('active');
}

// Dashboard Calculations & Rendering