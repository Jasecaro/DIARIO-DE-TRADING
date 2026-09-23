/* ==========================================================================
   TheRaiseTrader - NOTEBOOKLM REPORTS & CONSOLIDATED REVIEWS
   ========================================================================== */
function getMondayAndSunday(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return { monday: '', sunday: '', friday: '' };
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(y, m - 1, d + diffToMon);
  const sun = new Date(y, m - 1, d + diffToMon + 6);
  const fri = new Date(y, m - 1, d + diffToMon + 4);

  const fmt = (dt) => {
    const yr = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  return { monday: fmt(mon), sunday: fmt(sun), friday: fmt(fri) };
}

function populateSessionSelect() {
  const select = document.getElementById('report-session-id');
  if (!select) return;

  if (!state.sessions || state.sessions.length === 0) {
    select.innerHTML = '<option value="">No hay sesiones registradas</option>';
    return;
  }

  select.innerHTML = state.sessions.map(s => `
    <option value="${s.id}">${s.date} - ${s.account} ($${s.netPnl.toFixed(2)})</option>
  `).join('');
}

function populateWeekSelect() {
  const select = document.getElementById('report-week-id');
  if (!select) return;

  const prevValue = select.value;

  if (!state.sessions || state.sessions.length === 0) {
    select.innerHTML = '<option value="">No hay sesiones registradas</option>';
    return;
  }

  const weeksMap = new Map();
  state.sessions.forEach(s => {
    if (!s.date) return;
    const { monday, sunday, friday } = getMondayAndSunday(s.date.trim());
    if (!monday || !sunday) return;
    const key = `${monday}_${sunday}`;
    if (!weeksMap.has(key)) {
      weeksMap.set(key, { monday, sunday, friday, sessions: [] });
    }
    weeksMap.get(key).sessions.push(s);
  });

  const sortedWeeks = Array.from(weeksMap.values()).sort((a, b) => b.monday.localeCompare(a.monday));

  if (sortedWeeks.length === 0) {
    select.innerHTML = '<option value="">No hay semanas registradas</option>';
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const currentWeek = getMondayAndSunday(todayStr);
  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeek = getMondayAndSunday(lastWeekDate.toISOString().split('T')[0]);

  let html = '';
  sortedWeeks.forEach((w) => {
    const pnl = w.sessions.reduce((acc, s) => acc + (s.netPnl || 0), 0);
    const pnlSign = pnl >= 0 ? '+' : '-';
    const pnlFormatted = `${pnlSign}$${Math.abs(pnl).toFixed(2)}`;

    let tag = '';
    if (w.monday === currentWeek.monday) {
      tag = ' [Esta Semana]';
    } else if (w.monday === lastWeek.monday) {
      tag = ' [Semana Pasada]';
    }

    const monParts = w.monday.split('-');
    const friParts = w.friday.split('-');
    const labelDate = `${monParts[2]}/${monParts[1]} al ${friParts[2]}/${friParts[1]}/${monParts[0]}`;

    html += `<option value="${w.monday}_${w.sunday}">Semana ${labelDate}${tag} &mdash; ${w.sessions.length} sesión(es) (${pnlFormatted})</option>`;
  });

  html += `<option value="last_7_days">🔄 Últimos 7 días móviles (Dinámico)</option>`;
  select.innerHTML = html;

  // Restaurar selección previa si existe, o usar la semana más reciente
  if (prevValue && Array.from(select.options).some(opt => opt.value === prevValue)) {
    select.value = prevValue;
  } else if (sortedWeeks.length > 0) {
    select.value = `${sortedWeeks[0].monday}_${sortedWeeks[0].sunday}`;
  }
}

function populateMonthSelect() {
  const select = document.getElementById('report-month-id');
  if (!select) return;

  const prevValue = select.value;

  if (!state.sessions || state.sessions.length === 0) {
    select.innerHTML = '<option value="">No hay sesiones registradas</option>';
    return;
  }

  const monthsMap = new Map();
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  state.sessions.forEach(s => {
    if (!s.date || !s.date.includes('-')) return;
    const parts = s.date.trim().split('-');
    const y = parts[0];
    const m = parts[1];
    const key = `${y}-${m}`;
    if (!monthsMap.has(key)) {
      monthsMap.set(key, { year: y, month: m, sessions: [] });
    }
    monthsMap.get(key).sessions.push(s);
  });

  const sortedMonths = Array.from(monthsMap.values()).sort((a, b) => b.year.localeCompare(a.year) || b.month.localeCompare(a.month));

  if (sortedMonths.length === 0) {
    select.innerHTML = '<option value="">No hay meses registrados</option>';
    return;
  }

  const now = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let html = '';
  sortedMonths.forEach(m => {
    const pnl = m.sessions.reduce((acc, s) => acc + (s.netPnl || 0), 0);
    const pnlSign = pnl >= 0 ? '+' : '-';
    const pnlFormatted = `${pnlSign}$${Math.abs(pnl).toFixed(2)}`;

    const monthName = monthNames[parseInt(m.month, 10) - 1] || m.month;
    const tag = (`${m.year}-${m.month}` === curKey) ? ' [Mes Actual]' : '';

    html += `<option value="${m.year}-${m.month}">${monthName} ${m.year}${tag} &mdash; ${m.sessions.length} sesión(es) (${pnlFormatted})</option>`;
  });

  html += `<option value="last_30_days">🔄 Últimos 30 días móviles (Dinámico)</option>`;
  select.innerHTML = html;

  if (prevValue && Array.from(select.options).some(opt => opt.value === prevValue)) {
    select.value = prevValue;
  } else if (sortedMonths.length > 0) {
    select.value = `${sortedMonths[0].year}-${sortedMonths[0].month}`;
  }
}

function populateReportSelectors() {
  populateSessionSelect();
  populateWeekSelect();
  populateMonthSelect();
}

function handleReportTypeChange() {
  populateReportSelectors();
  generateNotebookLMReport();
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
  const reportType = document.getElementById('report-type')?.value || 'weekly';
  const sessionSelectContainer = document.getElementById('session-select-container');
  const weekSelectContainer = document.getElementById('week-select-container');
  const monthSelectContainer = document.getElementById('month-select-container');
  const markdownOutput = document.getElementById('markdown-output');
  const personalOutput = document.getElementById('personal-output');
  if (!markdownOutput || !personalOutput) return;

  // Alternar visibilidad de contenedores según tipo de reporte
  if (sessionSelectContainer) sessionSelectContainer.style.display = (reportType === 'daily') ? 'flex' : 'none';
  if (weekSelectContainer) weekSelectContainer.style.display = (reportType === 'weekly') ? 'flex' : 'none';
  if (monthSelectContainer) monthSelectContainer.style.display = (reportType === 'monthly') ? 'flex' : 'none';

  // Si los selectores de semana no tienen opciones, poblarlos automáticamente
  const weekSelect = document.getElementById('report-week-id');
  if (weekSelect && weekSelect.children.length === 0) {
    populateReportSelectors();
  }

  if (reportType === 'daily') {
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
        <h2 class="personal-report-title" style="color: #0f172a !important; font-size: 1.8rem; margin-bottom: 0.25rem;">TheRaiseTrader • Informe Diario</h2>
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
              const isMissed = t.tradeType === 'MISSED';
              const isAnalysis = t.tradeType === 'ANALYSIS';

              let priceStr = '-';
              if (t.entryPrice !== null && t.entryPrice !== undefined && t.exitPrice !== null && t.exitPrice !== undefined) {
                const pts = t.points !== null && t.points !== undefined ? `<br><small class="badge ${t.points >= 0 ? 'badge-profit' : 'badge-loss'}" style="font-size: 0.68rem; padding: 1px 4px;">${t.points >= 0 ? '+' : ''}${t.points.toFixed(2)} pts</small>` : '';
                priceStr = `<strong>${t.entryPrice}</strong> ➔ <strong>${t.exitPrice}</strong>${pts}`;
              } else if (t.entryPrice !== null && t.entryPrice !== undefined) {
                priceStr = `${t.entryPrice}`;
              }

              const timeDisplay = t.exitTime ? `${t.time || '--:--'} - ${t.exitTime}` : (t.time || '--:--');
              const durVal = t.duration || formatTradeDuration(t.time, t.exitTime);
              const durStr = durVal ? `<br><small style="color: #0284c7; font-weight: 700;">(${durVal})</small>` : '';

              let typeBadgeHtml = '';
              let pnlCellHtml = '';
              let rrCellHtml = `1:${t.rr}`;
              let setupCellHtml = t.setup;

              if (isMissed) {
                typeBadgeHtml = `<br><span class="badge badge-missed" style="font-size: 0.65rem;"><i class="fa-solid fa-clock-rotate-left"></i> OMITIDO</span>`;
                setupCellHtml = `<strong>${t.setup}</strong><br><small style="color: #d97706; font-weight: 600;">[Motivo: ${t.missedReason || 'Omitido'}]</small>`;
                const outColor = t.theoreticalOutcome === 'TP' ? '#059669' : (t.theoreticalOutcome === 'SL' ? '#e11d48' : '#d97706');
                const outText = t.theoreticalOutcome === 'TP' ? 'TP Teórico' : (t.theoreticalOutcome === 'SL' ? 'SL Teórico' : (t.theoreticalOutcome === 'BE' ? 'BE Teórico' : 'Teórico'));
                pnlCellHtml = `<span class="badge badge-missed" style="font-size: 0.72rem; color: ${outColor};">$0.00 (${outText})</span>`;
                rrCellHtml = `1:${t.theoreticalRr || t.rr || 0} <small>(Teo)</small>`;
              } else if (isAnalysis) {
                typeBadgeHtml = `<br><span class="badge badge-analysis" style="font-size: 0.65rem;"><i class="fa-solid fa-microscope"></i> ANÁLISIS</span>`;
                setupCellHtml = `<strong>${t.setup}</strong><br><small style="color: #0284c7; font-weight: 600;">[Estudio: ${t.missedReason || 'Análisis'}]</small>`;
                pnlCellHtml = `<span class="badge badge-analysis" style="font-size: 0.72rem;">$0.00 (${t.theoreticalOutcome || 'Proy'})</span>`;
                rrCellHtml = `1:${t.theoreticalRr || t.rr || 0} <small>(Teo)</small>`;
              } else {
                pnlCellHtml = `<span class="badge ${t.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">$${t.pnl.toFixed(2)}</span>`;
              }

              return `
                <tr style="border-bottom: 1px solid #e2e8f0 !important; background: #ffffff !important;">
                  <td class="col-center" style="color: #0f172a !important;"><strong>${idx + 1}</strong></td>
                  <td class="col-center" style="color: #64748b !important; font-size: 0.82rem; font-weight: 600; white-space: nowrap;">${timeDisplay}${durStr}</td>
                  <td class="col-left" style="color: #0f172a !important;"><strong>${t.asset}</strong>${typeBadgeHtml}</td>
                  <td class="col-center"><span class="badge ${t.direction === 'LONG' ? 'badge-long' : 'badge-short'}">${t.direction}</span></td>
                  <td class="col-center" style="font-size: 0.8rem;">${priceStr}</td>
                  <td class="col-center" style="color: #0f172a !important;">${t.lots}</td>
                  <td class="col-left" style="color: #0f172a !important;">${setupCellHtml}</td>
                  <td class="col-right">${pnlCellHtml}</td>
                  <td class="col-center" style="color: #0f172a !important;">${rrCellHtml}</td>
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

  // Captura General de la Sesión Completa (si no es sesión sin operaciones, donde ya se muestra arriba)
  const generalSessionChart = s.sessionChartImage || s.checklist?.noTradeSession?.chartImage || s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl;
  if (!s.noTrades && !s.checklist?.noTradeSession?.noTrades && generalSessionChart) {
    html += `
      <div style="margin-top: 1.5rem; margin-bottom: 1.5rem;">
        <div class="annex-card" style="background: #ffffff; border: 1.5px solid #cbd5e1; padding: 1.25rem; border-radius: 8px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <span style="font-family: var(--font-heading); font-weight: 700; color: #0f172a !important; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fa-solid fa-camera-retro" style="color: #4f46e5;"></i> Captura General de la Sesión Completa (Visión Macro del Día)
            </span>
            <span class="badge" style="background: rgba(79, 70, 229, 0.1); color: #4f46e5; border: 1px solid rgba(79, 70, 229, 0.25); font-size: 0.75rem;">
              Retrospectiva & Panorama Diario
            </span>
          </div>
          <div style="text-align: center;">
            <img src="${generalSessionChart}" class="annex-img" onclick="openLightbox(this.src)" title="Haz clic para ver en pantalla completa" style="max-height: 480px; width: auto; max-width: 100%; border-radius: 6px; cursor: pointer;">
          </div>
        </div>
      </div>
    `;
  }

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
                  📷 Anexo #${s.trades.indexOf(t) + 1}: ${t.asset} (${t.direction}) &mdash; Setup: ${t.setup} ${t.tradeType === 'MISSED' ? '[OMITIDO]' : (t.tradeType === 'ANALYSIS' ? '[ANÁLISIS]' : '')}
                </span>
                <span class="badge ${t.tradeType === 'MISSED' ? 'badge-missed' : (t.tradeType === 'ANALYSIS' ? 'badge-analysis' : (t.pnl >= 0 ? 'badge-profit' : 'badge-loss'))}">
                  ${(t.tradeType === 'MISSED' || t.tradeType === 'ANALYSIS') ? `Teórico: ${t.theoreticalOutcome || 'TP'} (1:${t.theoreticalRr || t.rr || 0}R)` : `${t.pnl >= 0 ? '+$' : '-$'}${Math.abs(t.pnl).toFixed(2)} USD (R:R 1:${t.rr})`}
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

// Helper para restar días a una fecha ISO (YYYY-MM-DD) sin desfase de zona horaria UTC
function getDateNDaysAgo(dateStr, n) {
  if (!dateStr || !dateStr.includes('-')) return '';
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() - n);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to retrieve and sort sessions for consolidated reports in strict chronological order (oldest to newest)
function getConsolidatedSessions(rangeType) {
  if (!state.sessions || state.sessions.length === 0) return [];

  // Ordenar primero de más reciente a más antiguo para identificar con precisión la última sesión
  const sortedDesc = [...state.sessions].sort((a, b) => {
    const cmp = (b.date || '').trim().localeCompare((a.date || '').trim());
    if (cmp !== 0) return cmp;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  let relevant = [];

  if (rangeType === 'all') {
    relevant = [...sortedDesc];
  } else if (rangeType === 'weekly') {
    const selectedWeek = document.getElementById('report-week-id')?.value;
    if (selectedWeek && selectedWeek !== 'last_7_days' && selectedWeek.includes('_')) {
      const [monday, sunday] = selectedWeek.split('_');
      relevant = sortedDesc.filter(s => {
        const d = (s.date || '').trim();
        return d >= monday && d <= sunday;
      });
    } else {
      // Dinámico: Últimos 7 días móviles desde la sesión más reciente
      const latestSessionDateStr = (sortedDesc[0].date || '').trim();
      const cutoffStr = getDateNDaysAgo(latestSessionDateStr, 6);
      relevant = sortedDesc.filter(s => {
        const d = (s.date || '').trim();
        return d >= cutoffStr && d <= latestSessionDateStr;
      });
      if (relevant.length === 0) {
        relevant = sortedDesc.slice(0, 7);
      }
    }
  } else if (rangeType === 'monthly') {
    const selectedMonth = document.getElementById('report-month-id')?.value;
    if (selectedMonth && selectedMonth !== 'last_30_days' && selectedMonth.includes('-')) {
      relevant = sortedDesc.filter(s => {
        const d = (s.date || '').trim();
        return d.startsWith(selectedMonth);
      });
    } else {
      // Dinámico: Últimos 30 días móviles desde la sesión más reciente
      const latestSessionDateStr = (sortedDesc[0].date || '').trim();
      const cutoffStr = getDateNDaysAgo(latestSessionDateStr, 29);
      relevant = sortedDesc.filter(s => {
        const d = (s.date || '').trim();
        return d >= cutoffStr && d <= latestSessionDateStr;
      });
      if (relevant.length === 0) {
        relevant = sortedDesc.slice(0, 30);
      }
    }
  } else if (rangeType === 'yearly') {
    const latestSessionDateStr = (sortedDesc[0].date || '').trim();
    const cutoffStr = getDateNDaysAgo(latestSessionDateStr, 364);
    relevant = sortedDesc.filter(s => {
      const d = (s.date || '').trim();
      return d >= cutoffStr && d <= latestSessionDateStr;
    });
    if (relevant.length === 0) {
      relevant = sortedDesc.slice(0, 365);
    }
  }

  // Orden cronológico ascendente estricto: la sesión más antigua es el Día 1, la más reciente el último día
  return relevant.sort((a, b) => {
    const cmp = (a.date || '').trim().localeCompare((b.date || '').trim());
    if (cmp !== 0) return cmp;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
}

function buildConsolidatedPersonalHTML(rangeType) {
  let title = 'Semanal';
  let periodSubtitle = '';
  if (rangeType === 'weekly') {
    const weekSelect = document.getElementById('report-week-id');
    const selectedWeekVal = weekSelect?.value;
    if (selectedWeekVal && selectedWeekVal !== 'last_7_days') {
      const optText = weekSelect.options[weekSelect.selectedIndex]?.text || '';
      periodSubtitle = optText.split('—')[0].trim();
    }
  } else if (rangeType === 'monthly') {
    title = 'Mensual';
    const monthSelect = document.getElementById('report-month-id');
    const selectedMonthVal = monthSelect?.value;
    if (selectedMonthVal && selectedMonthVal !== 'last_30_days') {
      const optText = monthSelect.options[monthSelect.selectedIndex]?.text || '';
      periodSubtitle = optText.split('—')[0].trim();
    }
  } else if (rangeType === 'yearly') {
    title = 'Anual';
  } else if (rangeType === 'all') {
    title = 'Histórico Completo';
  }

  const relevant = getConsolidatedSessions(rangeType);
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

  const dateRangeSubtitle = relevant.length > 0
    ? (relevant[0].date === relevant[relevant.length - 1].date ? relevant[0].date : `${relevant[0].date} &rarr; ${relevant[relevant.length - 1].date}`)
    : '';

  const headerTitle = periodSubtitle ? `Informe Ejecutivo ${title} (${periodSubtitle})` : `Informe Ejecutivo ${title}`;

  let html = `
    <div class="personal-report-header" style="border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.5rem;">
      <div>
        <h2 class="personal-report-title" style="color: #0f172a !important; font-size: 1.8rem; margin-bottom: 0.25rem;">${headerTitle}</h2>
        <p style="color: #64748b !important; font-size: 0.9rem;">Consolidado cronológico de ${relevant.length} sesiones de trading (${dateRangeSubtitle})</p>
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

    <h3 style="font-family: var(--font-heading); color: #0f172a !important; margin-bottom: 1rem;">Sesiones del Período (Orden Cronológico)</h3>
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
          Galería completa de capturas de pantalla registradas en las sesiones del período (${allAnnexTrades.length} imágenes en orden cronológico):
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
  let md = `# TheRaiseTrader - REPORTE DIARIO\n`;
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

  md += `## 2. OPERACIONES Y REGISTRO DE MERCADO\n`;
  if (s.noTrades || s.checklist?.noTradeSession?.noTrades) {
    const sessionReason = s.noTradeReason || s.checklist?.noTradeSession?.reason || 'Mercado en Consolidación / Rango sucio';
    const sessionNotes = s.noTradeNotes || s.checklist?.noTradeSession?.notes || s.takeaway || 'Sin trades ejecutados según el plan.';
    const imgRef = (s.sessionChartImage || s.checklist?.noTradeSession?.chartImage) ? '[Pantallazo de la Sesión Adjunto]' : ((s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl) ? `[Link Gráfico](${s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl})` : '-');

    md += `### 🛡️ SESIÓN SIN OPERACIONES (DÍA DE PACIENCIA Y PRESERVACIÓN DE CAPITAL)\n`;
    md += `- **Estado:** Capital 100% Protegido (0 Trades ejecutados)\n`;
    md += `- **Motivo de No Operar:** ${sessionReason}\n`;
    md += `- **Análisis Técnico / Observaciones:** ${sessionNotes}\n`;
    md += `- **Captura del Gráfico:** ${imgRef}\n\n`;
  }

  const executedTrades = (s.trades || []).filter(t => t.tradeType !== 'MISSED' && t.tradeType !== 'ANALYSIS');
  const missedTrades = (s.trades || []).filter(t => t.tradeType === 'MISSED' || t.tradeType === 'ANALYSIS');

  if (executedTrades.length > 0) {
    md += `### ⚡ Operaciones Ejecutadas en Vivo (${executedTrades.length}):\n`;
    md += `| # | Hora | Activo | Tipo | Entrada | Salida | Pts/Pips | Lotes | Setup | P&L ($) | R:R | Captura Gráfico | Psicología / Notas |\n`;
    md += `|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
    executedTrades.forEach((t, i) => {
      const imgRef = t.chartImage ? `[Pantallazo Adjunto]` : (t.chartUrl ? `[Link Gráfico](${t.chartUrl})` : '-');
      const entryStr = (t.entryPrice !== null && t.entryPrice !== undefined) ? t.entryPrice : '-';
      const exitStr = (t.exitPrice !== null && t.exitPrice !== undefined) ? t.exitPrice : '-';
      const ptsStr = (t.points !== null && t.points !== undefined) ? `${t.points >= 0 ? '+' : ''}${t.points.toFixed(2)} pts` : '-';
      const timeStr = t.exitTime ? `${t.time || '--:--'} a ${t.exitTime}` : (t.time || '--:--');
      const durVal = t.duration || formatTradeDuration(t.time, t.exitTime);
      const durStr = durVal ? ` (${durVal})` : '';
      md += `| ${i + 1} | ${timeStr}${durStr} | ${t.asset} | ${t.direction} | ${entryStr} | ${exitStr} | ${ptsStr} | ${t.lots} | ${t.setup} | $${t.pnl.toFixed(2)} | 1:${t.rr} | ${imgRef} | ${t.tags || '-'} ${t.notes ? '(' + t.notes + ')' : ''} |\n`;
    });
    md += `\n`;
  }

  if (missedTrades.length > 0) {
    md += `### 🧠 Trades Omitidos (Missed Trades) & Análisis Técnico (${missedTrades.length}):\n`;
    md += `*Operaciones que se dejaron pasar, dudaron en gatillar o proyecciones técnicas de estudio:*\n`;
    md += `| # | Activo | Dirección | Setup | Motivo de Omisión | Desenlace Teórico | R:R Teórico | Captura | Notas / Bitácora |\n`;
    md += `|---|---|---|---|---|---|---|---|---|\n`;
    missedTrades.forEach((t, i) => {
      const imgRef = t.chartImage ? `[Pantallazo Adjunto]` : (t.chartUrl ? `[Link Gráfico](${t.chartUrl})` : '-');
      const outcomeText = t.theoreticalOutcome === 'TP' ? '✅ TP Teórico' : (t.theoreticalOutcome === 'SL' ? '❌ SL Teórico' : (t.theoreticalOutcome === 'BE' ? 'BE' : 'Sin Definir'));
      md += `| ${i + 1} | ${t.asset} | ${t.direction} | ${t.setup} | **${t.missedReason || 'Omitido'}** | ${outcomeText} | 1:${t.theoreticalRr || t.rr || 0}R | ${imgRef} | ${t.notes || '-'} |\n`;
    });
    md += `\n`;
  }

  if (executedTrades.length === 0 && missedTrades.length === 0 && !(s.noTrades || s.checklist?.noTradeSession?.noTrades)) {
    md += `*No se registraron operaciones individuales en esta sesión.*\n\n`;
  }

  md += `## 3. RETROSPECTIVA & PSICOLOGÍA POST-MERCADO\n`;
  md += `- **Errores Cometidos:** ${s.mistakes || 'Ninguno - Seguí mi plan a la perfección.'}\n`;
  md += `- **Lección Clave del Día:** ${s.takeaway || 'Sin comentarios.'}\n`;
  const postSessionChartRef = (s.sessionChartImage || s.checklist?.noTradeSession?.chartImage) 
    ? '[Pantallazo General de la Sesión Adjunto]' 
    : ((s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl) ? `[Link Gráfico](${s.sessionChartUrl || s.checklist?.noTradeSession?.chartUrl})` : null);
  if (postSessionChartRef && !s.noTrades && !s.checklist?.noTradeSession?.noTrades) {
    md += `- **Pantallazo General de la Sesión:** ${postSessionChartRef}\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `## PROMPT DE ANÁLISIS PARA NOTEBOOKLM\n`;
  if (missedTrades.length > 0) {
    md += `> *"Actúa como mi Head Trader y Coach de Psicología de Prop Firm. Presta especial atención tanto a mis operaciones ejecutadas como a los ${missedTrades.length} trade(s) omitidos por vacilación o velocidad. Audita si mis setups eran estadísticamente válidos y dame 3 consejos concretos para eliminar la duda y tener un gatillo disciplinado en la próxima sesión."*\n`;
  } else if (s.noTrades || s.checklist?.noTradeSession?.noTrades) {
    const reasonText = s.noTradeReason || s.checklist?.noTradeSession?.reason || 'Mercado en Consolidación';
    md += `> *"Actúa como mi Head Trader y Mentor de Psicología en Trading de Cuentas de Fondeo. En esta sesión de hoy NO abrí operaciones para preservar mi capital y apegarme a mi plan. Lee este reporte y evalúa mi decisión de no operar por '${reasonText}'. Analiza la disciplina demostrada al no forzar entradas y dame recomendaciones para mantener esta paciencia en las próximas sesiones."*\n`;
  } else {
    md += `> *"Actúa como mi Head Trader y Mentor de Psicología en Trading de Cuentas de Fondeo. Lee este reporte diario junto con mi Plan de Trading pre-cargado en esta libreta. Analiza si mi ejecución hoy estuvo alineada a mis reglas, evalúa si caí en el ciclo de auge/crisis (tilteo o sobreconfianza), y dame 3 recomendaciones concretas y específicas para mi próxima sesión."*\n`;
  }

  return md;
}

function buildConsolidatedMarkdown(rangeType) {
  let title = 'SEMANAL';
  let periodSubtitle = '';
  if (rangeType === 'weekly') {
    const weekSelect = document.getElementById('report-week-id');
    const selectedWeekVal = weekSelect?.value;
    if (selectedWeekVal && selectedWeekVal !== 'last_7_days') {
      const optText = weekSelect.options[weekSelect.selectedIndex]?.text || '';
      periodSubtitle = optText.split('—')[0].trim();
    }
  } else if (rangeType === 'monthly') {
    title = 'MENSUAL';
    const monthSelect = document.getElementById('report-month-id');
    const selectedMonthVal = monthSelect?.value;
    if (selectedMonthVal && selectedMonthVal !== 'last_30_days') {
      const optText = monthSelect.options[monthSelect.selectedIndex]?.text || '';
      periodSubtitle = optText.split('—')[0].trim();
    }
  } else if (rangeType === 'yearly') {
    title = 'ANUAL';
  } else if (rangeType === 'all') {
    title = 'HISTÓRICO COMPLETO';
  }

  const relevant = getConsolidatedSessions(rangeType);
  if (relevant.length === 0) {
    return '# Sin datos suficientes para consolidar.\nPor favor registra sesiones de trading o carga datos demo para generar el reporte.';
  }

  let totalPnl = 0;
  let wins = 0;
  let losses = 0;
  let totalTrades = 0;
  let totalMissedTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let disciplineSum = 0;

  relevant.forEach(s => {
    totalPnl += (s.netPnl || 0);
    disciplineSum += s.disciplineScore || 10;
    (s.trades || []).forEach(t => {
      if (t.tradeType === 'MISSED' || t.tradeType === 'ANALYSIS') {
        totalMissedTrades++;
        return;
      }
      totalTrades++;
      if ((t.pnl || 0) >= 0) {
        wins++;
        grossProfit += (t.pnl || 0);
      } else {
        losses++;
        grossLoss += Math.abs(t.pnl || 0);
      }
    });
  });

  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? 'INF' : '0.00');
  const avgDiscipline = (disciplineSum / relevant.length).toFixed(1);

  const dateRangeStr = relevant.length > 0
    ? (relevant[0].date === relevant[relevant.length - 1].date ? relevant[0].date : `${relevant[0].date} al ${relevant[relevant.length - 1].date}`)
    : '';

  const fullHeader = periodSubtitle ? `${title} (${periodSubtitle})` : title;

  let md = `# TheRaiseTrader - REPORTE CONSOLIDADO DETALLADO (${fullHeader})\n`;
  md += `**Período:** ${dateRangeStr} (${relevant.length} sesiones en estricto orden cronológico)\n`;
  md += `**Nota para NotebookLM:** Este archivo consolida los reportes completos de **${relevant.length} sesiones** organizadas en estricto orden cronológico (del ${dateRangeStr}) en un solo documento para optimizar el límite de 50 archivos de tu libreta y permitir un análisis evolutivo de inicio a fin.\n\n`;
  
  md += `## 📊 RESUMEN EJECUTIVO DEL PERÍODO\n`;
  md += `- **Sesiones Incluidas:** ${relevant.length}\n`;
  md += `- **P&L Total Acumulado:** $${totalPnl.toFixed(2)} (${totalPnl >= 0 ? 'PROFIT' : 'DRAWDOWN'})\n`;
  md += `- **Win Rate (Operaciones Reales):** ${winRate}% (${wins} Ganadas / ${losses} Perdidas en ${totalTrades} trades ejecutados)\n`;
  if (totalMissedTrades > 0) {
    md += `- **Trades Omitidos / Análisis Registrados:** ${totalMissedTrades} oportunidades auditadas\n`;
  }
  md += `- **Profit Factor:** ${profitFactor}\n`;
  md += `- **Promedio de Disciplina:** ${avgDiscipline}/10\n\n`;

  md += `### TABLA RESUMEN RÁPIDA (ORDEN CRONOLÓGICO)\n`;
  md += `| Sesión | Fecha | Cuenta | Estado Pre | Trades | P&L ($) | Disciplina | Lección Clave |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;
  relevant.forEach((s, idx) => {
    md += `| Día ${idx + 1} | ${s.date} | ${s.account} | ${s.preEmotion} | ${s.trades ? s.trades.length : 0} | $${s.netPnl.toFixed(2)} | ${s.disciplineScore}/10 | ${s.takeaway ? s.takeaway.replace(/\|/g, '') : '-'} |\n`;
  });

  md += `\n---\n\n`;
  md += `## 📁 DETALLE COMPLETO DE CADA SESIÓN DEL PERÍODO (CRONOLÓGICO)\n\n`;

  relevant.forEach((s, idx) => {
    md += `### [Sesión ${idx + 1}/${relevant.length}] &mdash; Día ${idx + 1}: ${s.date} (${s.account})\n`;
    md += `- **P&L de la Sesión:** $${s.netPnl.toFixed(2)}\n`;
    md += `- **Turno:** ${s.timeSlot} | **Sesgo:** ${s.bias}\n`;
    md += `- **Estado Emocional Pre-Sesión:** ${s.preEmotion} (Energía: ${s.energyScore}/10)\n`;
    md += `- **Checklist:** Noticias (${s.checklist?.news ? 'Sí' : 'No'}), Niveles (${s.checklist?.levels ? 'Sí' : 'No'}), Riesgo Aceptado (${s.checklist?.acceptLoss ? 'Sí' : 'No'})\n`;
    md += `- **Adherencia al Plan:** ${s.adherence} (Disciplina: ${s.disciplineScore}/10)\n`;
    md += `- **Errores Identificados:** ${s.mistakes || 'Ninguno - Seguí mi plan a la perfección.'}\n`;
    md += `- **Lección Principal / Reflexión:** ${s.takeaway || 'Sin notas adicionales.'}\n\n`;

    const sessExecuted = (s.trades || []).filter(t => t.tradeType !== 'MISSED' && t.tradeType !== 'ANALYSIS');
    const sessMissed = (s.trades || []).filter(t => t.tradeType === 'MISSED' || t.tradeType === 'ANALYSIS');

    if (sessExecuted.length > 0) {
      md += `#### Operaciones Ejecutadas en esta Sesión:\n`;
      md += `| # | Activo | Tipo | Lotes | Setup | P&L ($) | R:R | Captura | Notas / Psicología |\n`;
      md += `|---|---|---|---|---|---|---|---|---|\n`;
      sessExecuted.forEach((t, i) => {
        const imgRef = t.chartImage ? `[Pantallazo Adjunto]` : (t.chartUrl ? `[Link Gráfico](${t.chartUrl})` : '-');
        md += `| ${i + 1} | ${t.asset} | ${t.direction} | ${t.lots} | ${t.setup} | $${t.pnl.toFixed(2)} | 1:${t.rr} | ${imgRef} | ${t.tags || '-'} ${t.notes ? '(' + t.notes + ')' : ''} |\n`;
      });
      md += `\n`;
    }

    if (sessMissed.length > 0) {
      md += `#### 🧠 Trades Omitidos / Análisis de Mercado:\n`;
      md += `| # | Activo | Setup | Motivo de Omisión | Desenlace Teórico | R:R Teórico | Captura | Notas |\n`;
      md += `|---|---|---|---|---|---|---|---|\n`;
      sessMissed.forEach((t, i) => {
        const imgRef = t.chartImage ? `[Pantallazo Adjunto]` : (t.chartUrl ? `[Link Gráfico](${t.chartUrl})` : '-');
        const outcomeText = t.theoreticalOutcome === 'TP' ? '✅ TP' : (t.theoreticalOutcome === 'SL' ? '❌ SL' : (t.theoreticalOutcome === 'BE' ? 'BE' : 'Teórico'));
        md += `| ${i + 1} | ${t.asset} (${t.direction}) | ${t.setup} | **${t.missedReason || 'Omitido'}** | ${outcomeText} | 1:${t.theoreticalRr || t.rr || 0}R | ${imgRef} | ${t.notes || '-'} |\n`;
      });
      md += `\n`;
    }

    if (sessExecuted.length === 0 && sessMissed.length === 0) {
      md += `*No se registraron trades individuales en esta sesión.*\n\n`;
    }

    md += `---\n\n`;
  });

  md += `## 🤖 PROMPT AUDITOR DE PERÍODO PARA NOTEBOOKLM\n`;
  md += `> *"Actúa como mi Head Risk Manager y Coach de Trading de Prop Firm. Analiza este reporte consolidado ${title.toLowerCase()} que contiene el detalle cronológico de mis ${relevant.length} sesiones (desde el ${dateRangeStr}) junto con mi Plan de Trading pre-cargado en esta libreta. Evalúa mi evolución sesión tras sesión, identifica si caí en el ciclo de auge/crisis (sobreconfianza tras rachas positivas o tilteo tras pérdidas), audita tanto mis ejecuciones como los trades omitidos por duda o prisa, y redacta una auditoría con 4 áreas clave de mejora prioritarias para mi próxima semana operativa."*\n`;

  return md;
}


function exportSingleSessionReport(sessionId) {
  switchTab('notebooklm');
  document.getElementById('report-type').value = 'daily';
  populateReportSelectors();
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
  const reportType = document.getElementById('report-type')?.value || 'report';
  let periodTag = reportType.toUpperCase();
  if (reportType === 'weekly') {
    const selectedWeek = document.getElementById('report-week-id')?.value;
    if (selectedWeek && selectedWeek !== 'last_7_days' && selectedWeek.includes('_')) {
      periodTag = `SEMANA_${selectedWeek.replace(/_/g, '_al_')}`;
    }
  } else if (reportType === 'monthly') {
    const selectedMonth = document.getElementById('report-month-id')?.value;
    if (selectedMonth && selectedMonth !== 'last_30_days') {
      periodTag = `MES_${selectedMonth}`;
    }
  }

  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TheRaiseTrader_${periodTag}_${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Archivo Markdown descargado', 'success');
}

// Backup & Demo Data Loaders

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

// ==========================================================================
// GESTIÓN Y EDICIÓN DE SESIONES / CAMBIO DE FECHA
// ==========================================================================