/* ==========================================================================
   TheRaiseTrader - UI CORE, NAVIGATION, SIDEBAR & UTILITIES
   ========================================================================== */
function switchTab(tabId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  // Highlight all matching buttons (in sidebar nav or quick actions)
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('onclick')?.includes(`'${tabId}'`)) {
      btn.classList.add('active');
    }
  });

  const targetContent = document.getElementById(`tab-${tabId}`);
  if (targetContent) targetContent.classList.add('active');

  // Dynamically update Topbar title and breadcrumb
  updateTopbarTitle(tabId);

  // Auto-close mobile drawer if opened
  closeSidebarMobile();

  if (tabId === 'home') {
    renderHomeMetrics();
  } else if (tabId === 'new-session') {
    const dateInput = document.getElementById('session-date');
    if (dateInput && (!state.currentDraftTrades || state.currentDraftTrades.length === 0)) {
      dateInput.value = getLocalDateString();
    }
  } else if (tabId === 'dashboard') {
    renderDashboard();
  } else if (tabId === 'history') {
    renderHistory();
  } else if (tabId === 'strategy') {
    initStrategyTab();
  } else if (tabId === 'notebooklm') {
    populateReportSelectors();
    generateNotebookLMReport();
  }
}

// Update Topbar Title & Subtitle dynamically
function updateTopbarTitle(tabId) {
  const titleEl = document.getElementById('topbar-title');
  const subEl = document.getElementById('topbar-subtitle');
  if (!titleEl) return;

  const meta = {
    'home': { title: 'Inicio Hub', subtitle: 'Centro de Mando & Reloj de Mercado' },
    'dashboard': { title: 'Dashboard', subtitle: 'Métricas Globales, Calendario P&L y Cuentas' },
    'new-session': { title: 'Nueva Sesión', subtitle: 'Registro Paso a Paso de Operativa' },
    'history': { title: 'Historial', subtitle: 'Auditoría, Búsqueda y Filtro de Sesiones' },
    'strategy': { title: 'Estrategia IA', subtitle: 'Playbook de Reglas y Criterios de Entrada' },
    'notebooklm': { title: 'Reportes NotebookLM', subtitle: 'Generador de Informes Analíticos' }
  };

  const current = meta[tabId] || { title: 'TheRaiseTrader', subtitle: 'Diario Profesional' };
  titleEl.textContent = current.title;
  if (subEl) subEl.textContent = current.subtitle;
}

// Sidebar Drawer Controls (Mobile)
function toggleSidebarMobile() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains('mobile-open');
  if (isOpen) {
    closeSidebarMobile();
  } else {
    sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeSidebarMobile() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

// Sidebar Desktop Collapse Toggle
function toggleSidebarCollapse() {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');
  localStorage.setItem('journal_sidebar_collapsed', isCollapsed ? 'true' : 'false');
}

function initSidebarState() {
  const isCollapsed = localStorage.getItem('journal_sidebar_collapsed') === 'true';
  const sidebar = document.getElementById('app-sidebar');
  if (sidebar && isCollapsed) {
    sidebar.classList.add('collapsed');
  }

  // Live topbar clock
  updateTopbarClock();
  setInterval(updateTopbarClock, 1000);
}

function updateTopbarClock() {
  const clockEl = document.getElementById('topbar-live-clock');
  if (!clockEl) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-CL', { hour12: false });
  clockEl.textContent = timeStr;
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

function exportBackupJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.sessions, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `TheRaiseTrader_backup_${new Date().toISOString().split('T')[0]}.json`);
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
    if (confirm('No se encontraron datos demo. ¿Deseas eliminar TODAS las sesiones de TheRaiseTrader?')) {
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
