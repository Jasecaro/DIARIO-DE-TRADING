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
      if (t.tradeType === 'MISSED' || t.tradeType === 'ANALYSIS') return;
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
