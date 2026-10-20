/* ==========================================================================
   TheRaiseTrader - DASHBOARD METRICS & CHARTS (EQUITY & ERRORS)
   ========================================================================== */
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

    const net = s.noTrades ? 0 : matchingTrades.filter(t => t.tradeType !== 'MISSED' && t.tradeType !== 'ANALYSIS').reduce((acc, t) => acc + (t.pnl || 0), 0);
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
  let totalLots = 0;

  const mistakesMap = {};
  const executedTrades = [];

  filteredSessions.forEach(s => {
    totalDiscipline += s.disciplineScore || 10;
    
    // Process session-level mistakes
    if (s.mistakes) {
      s.mistakes.split(',').forEach(m => {
        const clean = m.trim();
        if (clean && clean !== 'Ninguno - Seguí mi plan' && clean !== 'Ninguno (Plan Seguido)') {
          mistakesMap[clean] = (mistakesMap[clean] || 0) + 1;
        }
      });
    }

    (s.trades || []).forEach(t => {
      if (t.tradeType === 'MISSED' || t.tradeType === 'ANALYSIS') return;
      totalTrades++;
      const pnl = parseFloat(t.pnl) || 0;
      totalPnl += pnl;
      runningCapital += pnl;
      totalLots += (parseFloat(t.lots) || 1);

      if (runningCapital > peakCapital) {
        peakCapital = runningCapital;
      }
      const dd = peakCapital - runningCapital;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }

      if (pnl >= 0) {
        wins++;
        grossProfit += pnl;
      } else {
        losses++;
        grossLoss += Math.abs(pnl);
      }

      executedTrades.push({
        ...t,
        pnl: pnl,
        sessionDate: s.date,
        sessionTimeSlot: s.timeSlot,
        sessionEmotion: s.preEmotion,
        sessionEnergyScore: s.energyScore,
        sessionMistakes: s.mistakes
      });
    });
  });

  // Calculate Key Metrics
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? 'INF' : '0.00');
  const expectancy = totalTrades > 0 ? (totalPnl / totalTrades).toFixed(2) : '0.00';
  const avgDiscipline = filteredSessions.length > 0 ? (totalDiscipline / filteredSessions.length).toFixed(1) : '10.0';
  
  // Green Days vs Red Days
  let greenDays = 0;
  let redDays = 0;
  filteredSessions.forEach(s => {
    const net = parseFloat(s.netPnl) || 0;
    if (net > 0) greenDays++;
    else if (net < 0) redDays++;
  });
  const totalDays = filteredSessions.length;
  const greenDaysPct = totalDays > 0 ? ((greenDays / totalDays) * 100).toFixed(1) : '0.0';

  // Win / Loss Averages
  const avgWin = wins > 0 ? (grossProfit / wins).toFixed(2) : '0.00';
  const avgLoss = losses > 0 ? (grossLoss / losses).toFixed(2) : '0.00';
  const winLossRatio = parseFloat(avgLoss) > 0 ? (parseFloat(avgWin) / parseFloat(avgLoss)).toFixed(2) : (parseFloat(avgWin) > 0 ? 'INF' : '1.00');

  // Average R
  const tradesWithRr = executedTrades.filter(t => typeof t.rr === 'number' && !isNaN(t.rr) && t.rr > 0);
  const avgR = tradesWithRr.length > 0 ? (tradesWithRr.reduce((acc, t) => acc + t.rr, 0) / tradesWithRr.length).toFixed(2) : '0.00';

  // Streaks Calculation
  const sortedTrades = [...executedTrades].sort((a, b) => {
    const da = (a.sessionDate || '') + ' ' + (a.time || '00:00');
    const db = (b.sessionDate || '') + ' ' + (b.time || '00:00');
    return da.localeCompare(db);
  });
  let curW = 0, maxW = 0, curL = 0, maxL = 0;
  sortedTrades.forEach(t => {
    if (t.pnl > 0) {
      curW++; curL = 0;
      if (curW > maxW) maxW = curW;
    } else if (t.pnl < 0) {
      curL++; curW = 0;
      if (curL > maxL) maxL = curL;
    }
  });

  const uniqueDaysCount = new Set(filteredSessions.map(s => s.date)).size;

  // 1. UPDATE TOP 8-KPIS BAR
  const pnlEl = document.getElementById('dash-net-pnl');
  if (pnlEl) {
    pnlEl.innerText = `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    pnlEl.className = `kpi-value ${totalPnl >= 0 ? 'profit' : 'loss'}`;
  }
  const pnlSub = document.getElementById('dash-pnl-sub');
  if (pnlSub) {
    pnlSub.innerText = isFiltered ? `Cuenta: ${targetAccount}` : `Comisiones: $0.00 · Neto`;
  }

  const wrEl = document.getElementById('dash-winrate');
  if (wrEl) wrEl.innerText = `${winRate}%`;
  const wrSub = document.getElementById('dash-winrate-sub');
  if (wrSub) wrSub.innerText = `${wins} ganadores · ${losses} perdedores`;

  const pfEl = document.getElementById('dash-profit-factor');
  if (pfEl) pfEl.innerText = profitFactor;
  const pfSub = document.getElementById('dash-expectancy-sub');
  if (pfSub) pfSub.innerText = `Esperanza: $${expectancy}/trade`;

  const gdEl = document.getElementById('dash-green-days');
  if (gdEl) gdEl.innerText = `${greenDaysPct}%`;
  const gdSub = document.getElementById('dash-green-days-sub');
  if (gdSub) gdSub.innerText = `${greenDays} en verde · ${redDays} en rojo`;

  const avgWinEl = document.getElementById('dash-avg-win');
  if (avgWinEl) avgWinEl.innerText = `+$${parseFloat(avgWin).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const avgLossSub = document.getElementById('dash-avg-loss-sub');
  if (avgLossSub) avgLossSub.innerText = `Pérdida media: -$${parseFloat(avgLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const wlRatioEl = document.getElementById('dash-win-loss-ratio');
  if (wlRatioEl) wlRatioEl.innerText = winLossRatio;
  const avgRSub = document.getElementById('dash-avg-r-sub');
  if (avgRSub) avgRSub.innerText = `R medio: ${avgR}R`;

  const ddEl = document.getElementById('dash-drawdown');
  if (ddEl) ddEl.innerText = `-$${maxDrawdown.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const streaksSub = document.getElementById('dash-streaks-sub');
  if (streaksSub) streaksSub.innerText = `Rachas máx.: ${maxW} / ${maxL}`;

  const tradesEl = document.getElementById('dash-total-trades');
  if (tradesEl) tradesEl.innerText = `${totalTrades}`;
  const contractsSub = document.getElementById('dash-contracts-sub');
  if (contractsSub) contractsSub.innerText = `Contratos: ${totalLots} · ${uniqueDaysCount} días`;

  // 2. RENDER PATTERNS IN YOUR DATA (Smart Insights)
  renderDataPatterns(executedTrades, filteredSessions);

  // 3. RENDER ACCOUNT PILLS & CALENDAR
  renderDashboardAccountPills();
  renderDashboardCalendar(filteredSessions);

  // 4. RENDER SCATTER PLOT & 7 BREAKDOWN CARDS
  renderScatterChart(executedTrades, winRate, avgR);
  renderAnalyticsBreakdowns(executedTrades, filteredSessions);

  // 5. RENDER LEGACY / CORE CHARTS
  renderEquityChart(filteredSessions);
  renderErrorsChart(mistakesMap);

  // 6. RENDER TABLES
  renderAccountsComparisonTable();
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
    const executedTrades = (s.trades || []).filter(t => t.tradeType !== 'MISSED' && t.tradeType !== 'ANALYSIS');
    const missedTrades = (s.trades || []).filter(t => t.tradeType === 'MISSED' || t.tradeType === 'ANALYSIS');
    const tradesText = s.noTrades
      ? '<span class="badge badge-no-trades" style="font-size: 0.72rem;">0 Trades (Paciencia)</span>'
      : `${executedTrades.length} Trade${executedTrades.length === 1 ? '' : 's'}${missedTrades.length > 0 ? ` <span style="color: #d97706; font-size: 0.72rem; font-weight: 700;" title="${missedTrades.length} que se escapó">(+${missedTrades.length} escapó)</span>` : ''}`;
    
    return `
      <tr>
        <td><strong>${s.date}</strong> <br><span style="font-size: 0.75rem; color: var(--text-subtle);">${s.timeSlot}</span></td>
        <td>${s.account}</td>
        <td><span class="chip" style="font-size: 0.75rem;">${s.preEmotion}</span></td>
        <td>${tradesText}</td>
        <td><span class="badge ${pnlClass}">${parseFloat(s.netPnl || 0).toFixed(2)}</span></td>
        <td><strong>${s.disciplineScore || 10}/10</strong></td>
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

// =============================================================================
// PATRONES EN TUS DATOS (SMART INSIGHTS ENGINE - TRADEZELLA STYLE)
// =============================================================================
function renderDataPatterns(trades, sessions) {
  const leaksContainer = document.getElementById('dash-patterns-leaks');
  const edgeContainer = document.getElementById('dash-patterns-edge');
  const footerEl = document.getElementById('dash-patterns-footer');

  if (footerEl) {
    footerEl.innerText = `Basado en ${trades.length} trades de ${sessions.length} sesiones del periodo seleccionado.`;
  }

  if (trades.length === 0) {
    if (leaksContainer) {
      leaksContainer.innerHTML = `
        <div class="pattern-item leak">
          <i class="fa-solid fa-arrow-trend-down"></i>
          <span>Registra trades para que el sistema audite automáticamente tus fugas de capital y errores repetitivos.</span>
        </div>`;
    }
    if (edgeContainer) {
      edgeContainer.innerHTML = `
        <div class="pattern-item edge">
          <i class="fa-solid fa-arrow-trend-up"></i>
          <span>Agrega operaciones para descubrir tus mejores horarios, activos y estados psicológicos ganadores.</span>
        </div>`;
    }
    return;
  }

  const leaks = [];
  const edges = [];

  // 1. Análisis de Estado de Ánimo / Energía
  const badEnergySessions = sessions.filter(s => s.energyScore && s.energyScore < 7);
  const goodEnergySessions = sessions.filter(s => !s.energyScore || s.energyScore >= 7);
  if (badEnergySessions.length > 0 && goodEnergySessions.length > 0) {
    const avgBad = badEnergySessions.reduce((acc, s) => acc + (parseFloat(s.netPnl) || 0), 0) / badEnergySessions.length;
    const avgGood = goodEnergySessions.reduce((acc, s) => acc + (parseFloat(s.netPnl) || 0), 0) / goodEnergySessions.length;
    if (avgBad < avgGood) {
      leaks.push(`Los días que te sientes con baja energía acabas de media en <strong>${avgBad >= 0 ? '+' : ''}$${avgBad.toFixed(0)}</strong>, frente a <strong>+$${avgGood.toFixed(0)}</strong> los días que estás bien (${badEnergySessions.length} días de mal ánimo/cansancio).`);
    }
  }

  // 2. Errores más costosos
  const mistakeStats = {};
  trades.forEach(t => {
    const tags = ((t.tags || '') + ',' + (t.sessionMistakes || '')).split(',').map(x => x.trim()).filter(Boolean);
    tags.forEach(tag => {
      if (tag.includes('Ninguno') || tag.includes('Seguí mi plan')) return;
      if (!mistakeStats[tag]) mistakeStats[tag] = { count: 0, pnl: 0, losses: 0 };
      mistakeStats[tag].count++;
      mistakeStats[tag].pnl += t.pnl;
      if (t.pnl < 0) mistakeStats[tag].losses += Math.abs(t.pnl);
    });
  });
  const sortedMistakes = Object.entries(mistakeStats).sort((a, b) => b[1].losses - a[1].losses);
  if (sortedMistakes.length > 0 && sortedMistakes[0][1].losses > 0) {
    const [name, stats] = sortedMistakes[0];
    leaks.push(`El error «<strong>${name}</strong>» te ha costado <strong>$${stats.losses.toLocaleString('en-US', {maximumFractionDigits: 0})}</strong> en ${stats.count} trade${stats.count === 1 ? '' : 's'}.`);
  }

  // 3. Emociones al entrar (Leaks vs Edge)
  const emotionStats = {};
  trades.forEach(t => {
    const emo = t.sessionEmotion || 'Sin definir';
    if (!emotionStats[emo]) emotionStats[emo] = { count: 0, pnl: 0, wins: 0, losses: 0 };
    emotionStats[emo].count++;
    emotionStats[emo].pnl += t.pnl;
    if (t.pnl > 0) emotionStats[emo].wins++;
    else if (t.pnl < 0) emotionStats[emo].losses++;
  });
  const emotionsArr = Object.entries(emotionStats).map(([name, s]) => ({ name, ...s }));
  const worstEmotion = [...emotionsArr].sort((a, b) => a.pnl - b.pnl)[0];
  const bestEmotion = [...emotionsArr].sort((a, b) => b.pnl - a.pnl)[0];

  if (worstEmotion && worstEmotion.pnl < 0 && worstEmotion.count >= 1) {
    const avgLoss = worstEmotion.pnl / worstEmotion.count;
    leaks.push(`Entrando con «<strong>${worstEmotion.name}</strong>» pierdes <strong>$${Math.abs(worstEmotion.pnl).toLocaleString('en-US', {maximumFractionDigits: 0})}</strong> en ${worstEmotion.count} trade${worstEmotion.count === 1 ? '' : 's'} (${avgLoss < 0 ? '-' : ''}$${Math.abs(avgLoss).toFixed(0)}/trade).`);
  }
  if (bestEmotion && bestEmotion.pnl > 0) {
    edges.push(`Entrando con «<strong>${bestEmotion.name}</strong>» ganas <strong>+$${bestEmotion.pnl.toLocaleString('en-US', {maximumFractionDigits: 0})}</strong> en ${bestEmotion.count} trade${bestEmotion.count === 1 ? '' : 's'}.`);
  }

  // 4. Análisis por Horas
  const hourStats = {};
  trades.forEach(t => {
    let hr = '09:00';
    if (t.time && t.time.includes(':')) {
      const h = parseInt(t.time.split(':')[0]);
      if (!isNaN(h)) hr = String(h).padStart(2, '0') + ':00';
    }
    if (!hourStats[hr]) hourStats[hr] = { count: 0, pnl: 0, wins: 0 };
    hourStats[hr].count++;
    hourStats[hr].pnl += t.pnl;
    if (t.pnl > 0) hourStats[hr].wins++;
  });
  const hoursArr = Object.entries(hourStats).map(([hour, s]) => ({
    hour,
    ...s,
    wr: Math.round((s.wins / s.count) * 100)
  }));
  const worstHour = [...hoursArr].sort((a, b) => a.pnl - b.pnl)[0];
  const bestHour = [...hoursArr].sort((a, b) => b.pnl - a.pnl)[0];

  if (worstHour && worstHour.pnl < 0) {
    const nextH = parseInt(worstHour.hour) + 1;
    const endHr = String(nextH).padStart(2, '0') + ':00';
    leaks.push(`De <strong>${worstHour.hour} a ${endHr}</strong> pierdes <strong>$${Math.abs(worstHour.pnl).toLocaleString('en-US', {maximumFractionDigits: 0})}</strong> en ${worstHour.count} trades (win rate ${worstHour.wr}%).`);
  }
  if (bestHour && bestHour.pnl > 0) {
    edges.push(`De <strong>${bestHour.hour}</strong> ganas <strong>+$${bestHour.pnl.toLocaleString('en-US', {maximumFractionDigits: 0})}</strong> en ${bestHour.count} trades (win rate ${bestHour.wr}%).`);
  }

  // 5. Playbook / Setup estrella
  const setupStats = {};
  trades.forEach(t => {
    const setup = (t.setup && t.setup.trim()) ? t.setup.trim() : 'Sin playbook';
    if (!setupStats[setup]) setupStats[setup] = { count: 0, pnl: 0, wins: 0 };
    setupStats[setup].count++;
    setupStats[setup].pnl += t.pnl;
    if (t.pnl > 0) setupStats[setup].wins++;
  });
  const setupsArr = Object.entries(setupStats).map(([name, s]) => ({
    name, ...s, wr: Math.round((s.wins / s.count) * 100)
  }));
  const bestSetup = [...setupsArr].sort((a, b) => b.pnl - a.pnl)[0];
  if (bestSetup && bestSetup.pnl > 0) {
    edges.push(`El playbook «<strong>${bestSetup.name}</strong>» te ha dado <strong>+$${bestSetup.pnl.toLocaleString('en-US', {maximumFractionDigits: 0})}</strong> en ${bestSetup.count} trades (win rate ${bestSetup.wr}%).`);
  }
  const noSetup = setupsArr.find(s => s.name.toLowerCase().includes('sin playbook') || s.name.toLowerCase().includes('impulso'));
  if (noSetup && noSetup.pnl < 0) {
    leaks.push(`Operar «<strong>Sin playbook</strong>» te ha costado <strong>$${Math.abs(noSetup.pnl).toLocaleString('en-US', {maximumFractionDigits: 0})}</strong> en ${noSetup.count} trades.`);
  }

  // 6. Mejor Día de la Semana
  const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayStats = {};
  trades.forEach(t => {
    if (!t.sessionDate) return;
    const d = new Date(t.sessionDate + 'T12:00:00');
    const dayName = weekdayNames[d.getDay()] || 'Otro';
    if (!dayStats[dayName]) dayStats[dayName] = { count: 0, pnl: 0 };
    dayStats[dayName].count++;
    dayStats[dayName].pnl += t.pnl;
  });
  const bestDay = Object.entries(dayStats)
    .map(([name, s]) => ({ name, ...s }))
    .filter(d => d.name !== 'Sábado' && d.name !== 'Domingo')
    .sort((a, b) => b.pnl - a.pnl)[0];
  if (bestDay && bestDay.pnl > 0) {
    edges.push(`<strong>${bestDay.name}</strong> es tu mejor día: <strong>+$${bestDay.pnl.toLocaleString('en-US', {maximumFractionDigits: 0})}</strong> en ${bestDay.count} trades.`);
  }

  // Renderizar leaks
  if (leaksContainer) {
    if (leaks.length === 0) {
      leaksContainer.innerHTML = `
        <div class="pattern-item leak" style="color: var(--text-subtle);">
          <i class="fa-solid fa-check" style="color: #10b981;"></i>
          <span>No se han detectado patrones de pérdidas críticas o fugas en este periodo.</span>
        </div>`;
    } else {
      leaksContainer.innerHTML = leaks.map(msg => `
        <div class="pattern-item leak">
          <i class="fa-solid fa-arrow-trend-down"></i>
          <span>${msg}</span>
        </div>
      `).join('');
    }
  }

  // Renderizar edges
  if (edgeContainer) {
    if (edges.length === 0) {
      edgeContainer.innerHTML = `
        <div class="pattern-item edge" style="color: var(--text-subtle);">
          <i class="fa-solid fa-info-circle" style="color: var(--text-subtle);"></i>
          <span>Registra más sesiones positivas para proyectar tu ventaja operativa.</span>
        </div>`;
    } else {
      edgeContainer.innerHTML = edges.map(msg => `
        <div class="pattern-item edge">
          <i class="fa-solid fa-arrow-trend-up"></i>
          <span>${msg}</span>
        </div>
      `).join('');
    }
  }
}

// =============================================================================
// SALIDAS & DISPERSIÓN DE TRADES (SCATTER PLOT - MAE/MFE EQUIVALENT)
// =============================================================================
function renderScatterChart(trades, winRate, avgR) {
  const ctx = document.getElementById('chartScatter')?.getContext('2d');
  if (!ctx) return;

  if (state.scatterChart) {
    state.scatterChart.destroy();
  }

  let maxWin = 0;
  let maxLoss = 0;
  trades.forEach(t => {
    if (t.pnl > maxWin) maxWin = t.pnl;
    if (t.pnl < 0 && Math.abs(t.pnl) > maxLoss) maxLoss = Math.abs(t.pnl);
  });

  const wrEl = document.getElementById('dash-scatter-wr');
  if (wrEl) wrEl.innerText = `${winRate}%`;
  const rEl = document.getElementById('dash-scatter-avg-r');
  if (rEl) rEl.innerText = `${avgR}R`;
  const maxWinEl = document.getElementById('dash-scatter-max-win');
  if (maxWinEl) maxWinEl.innerText = `+$${maxWin.toFixed(2)}`;
  const maxLossEl = document.getElementById('dash-scatter-max-loss');
  if (maxLossEl) maxLossEl.innerText = `-$${maxLoss.toFixed(2)}`;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipTitle = isDark ? '#f8fafc' : '#0f172a';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  // Sort trades chronologically
  const chronos = [...trades].sort((a, b) => {
    const da = (a.sessionDate || '') + ' ' + (a.time || '00:00');
    const db = (b.sessionDate || '') + ' ' + (b.time || '00:00');
    return da.localeCompare(db);
  });

  const scatterData = chronos.map((t, idx) => ({
    x: idx + 1,
    y: t.pnl,
    trade: t
  }));

  const pointColors = scatterData.map(d => d.y >= 0 ? '#10b981' : '#f43f5e');

  state.scatterChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Trades ($)',
        data: scatterData,
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointRadius: 5,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipTitle,
          bodyColor: isDark ? '#cbd5e1' : '#334155',
          borderColor: tooltipBorder,
          borderWidth: 1,
          callbacks: {
            title: function(items) {
              const item = items[0];
              const t = item.raw.trade;
              return `Trade #${item.raw.x} · ${t.sessionDate || ''} ${t.time || ''}`;
            },
            label: function(item) {
              const t = item.raw.trade;
              const sign = t.pnl >= 0 ? '+' : '';
              return [
                `P&L: ${sign}$${t.pnl.toFixed(2)}`,
                `Activo: ${t.asset || 'N/A'} (${t.direction || 'LONG'})`,
                `Setup: ${t.setup || 'Sin setup'}`,
                `Emoción: ${t.sessionEmotion || 'N/A'}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { family: 'Inter', size: 10 } },
          title: { display: true, text: 'Orden cronológico de operaciones', color: tickColor, font: { size: 10 } }
        },
        y: {
          grid: {
            color: (c) => c.tick.value === 0 ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') : gridColor,
            lineWidth: (c) => c.tick.value === 0 ? 2 : 1
          },
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

// =============================================================================
// DESGLOSES ANALÍTICOS (7 CARDS CON BARRAS HORIZONTALES PROPORCIONALES)
// =============================================================================
function renderAnalyticsBreakdowns(trades, sessions) {
  function renderList(containerId, items) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!items || items.length === 0) {
      el.innerHTML = '<div class="breakdown-empty">Sin trades en este periodo</div>';
      return;
    }
    const maxVal = Math.max(...items.map(i => Math.abs(i.pnl)), 1);

    el.innerHTML = items.map(item => {
      const isProfit = item.pnl >= 0;
      const barPct = Math.max(5, Math.min(100, Math.round((Math.abs(item.pnl) / maxVal) * 100)));
      const formattedPnl = (item.pnl >= 0 ? '+' : '') + `$${Math.round(item.pnl).toLocaleString('en-US')}`;
      return `
        <div class="breakdown-row" title="${item.label}: ${formattedPnl} (${item.count} trades)">
          <div class="breakdown-label">${item.label}</div>
          <div class="breakdown-bar-track">
            <div class="breakdown-bar-fill ${isProfit ? 'profit' : 'loss'}" style="width: ${barPct}%;"></div>
          </div>
          <div class="breakdown-value ${isProfit ? 'profit' : 'loss'}">
            ${formattedPnl} <span class="breakdown-count">(${item.count})</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 1. Por Hora de Entrada (08:00, 09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, etc.)
  const hoursMap = {};
  trades.forEach(t => {
    let hr = '09:00';
    if (t.time && t.time.includes(':')) {
      const h = parseInt(t.time.split(':')[0]);
      if (!isNaN(h)) hr = String(h).padStart(2, '0') + ':00';
    }
    if (!hoursMap[hr]) hoursMap[hr] = { label: hr, pnl: 0, count: 0 };
    hoursMap[hr].pnl += t.pnl;
    hoursMap[hr].count++;
  });
  const hoursList = Object.values(hoursMap).sort((a, b) => a.label.localeCompare(b.label));
  renderList('dash-breakdown-hours', hoursList);

  // 2. Por Día de la Semana
  const weekdayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const dayMap = {};
  weekdayOrder.forEach(w => { dayMap[w] = { label: w, pnl: 0, count: 0 }; });
  trades.forEach(t => {
    if (!t.sessionDate) return;
    const d = new Date(t.sessionDate + 'T12:00:00');
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const name = dayNames[d.getDay()];
    if (dayMap[name]) {
      dayMap[name].pnl += t.pnl;
      dayMap[name].count++;
    }
  });
  renderList('dash-breakdown-weekdays', Object.values(dayMap));

  // 3. Por Instrumento (MNQ, NQ, ES, MES, CL, GC, etc.)
  const assetMap = {};
  trades.forEach(t => {
    const asset = (t.asset && t.asset.trim()) ? t.asset.trim().toUpperCase() : 'OTROS';
    if (!assetMap[asset]) assetMap[asset] = { label: asset, pnl: 0, count: 0 };
    assetMap[asset].pnl += t.pnl;
    assetMap[asset].count++;
  });
  const assetList = Object.values(assetMap).sort((a, b) => b.count - a.count);
  renderList('dash-breakdown-assets', assetList);

  // 4. Largos vs Cortos
  const dirMap = {
    'LONG': { label: 'Largos', pnl: 0, count: 0 },
    'SHORT': { label: 'Cortos', pnl: 0, count: 0 }
  };
  trades.forEach(t => {
    const dir = (t.direction === 'SHORT') ? 'SHORT' : 'LONG';
    dirMap[dir].pnl += t.pnl;
    dirMap[dir].count++;
  });
  renderList('dash-breakdown-direction', Object.values(dirMap));

  // 5. Por Playbook / Setup
  const setupMap = {};
  trades.forEach(t => {
    const setup = (t.setup && t.setup.trim()) ? t.setup.trim() : 'Sin playbook';
    if (!setupMap[setup]) setupMap[setup] = { label: setup, pnl: 0, count: 0 };
    setupMap[setup].pnl += t.pnl;
    setupMap[setup].count++;
  });
  const setupList = Object.values(setupMap).sort((a, b) => b.pnl - a.pnl);
  renderList('dash-breakdown-setups', setupList);

  // 6. Lo que te Cuestan tus Errores
  const mistakesBreakdown = {};
  trades.forEach(t => {
    const tags = ((t.tags || '') + ',' + (t.sessionMistakes || '')).split(',').map(x => x.trim()).filter(Boolean);
    tags.forEach(tag => {
      if (tag.includes('Ninguno') || tag.includes('Seguí mi plan')) return;
      if (!mistakesBreakdown[tag]) mistakesBreakdown[tag] = { label: tag, pnl: 0, count: 0 };
      mistakesBreakdown[tag].count++;
      mistakesBreakdown[tag].pnl += t.pnl;
    });
  });
  const mistakesList = Object.values(mistakesBreakdown).sort((a, b) => a.pnl - b.pnl);
  renderList('dash-breakdown-mistakes', mistakesList);

  // 7. Por Estado al Entrar (Emoción)
  const emotionEmojis = {
    'Calma': '🤗',
    'Confianza': '😎',
    'FOMO': '⚡',
    'Revancha': '🔥',
    'Aburrimiento': '🥱',
    'Miedo': '😨',
    'Ansiedad': '😰',
    'Fatiga': '🔋',
    'Cansancio': '🔋',
    'Paciencia': '🛡️'
  };
  const emotionMap = {};
  trades.forEach(t => {
    const emo = t.sessionEmotion || 'Calma';
    const cleanEmo = emo.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '').trim() || 'Calma';
    const emoji = emotionEmojis[cleanEmo] || '🎯';
    const label = `${emoji} ${cleanEmo}`;
    if (!emotionMap[label]) emotionMap[label] = { label: label, pnl: 0, count: 0 };
    emotionMap[label].pnl += t.pnl;
    emotionMap[label].count++;
  });
  const emotionList = Object.values(emotionMap).sort((a, b) => b.pnl - a.pnl);
  renderList('dash-breakdown-emotions', emotionList);
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
