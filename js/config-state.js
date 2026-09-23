/* ==========================================================================
   TheRaiseTrader - CONFIGURATION & GLOBAL STATE
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
  userAccounts: [],
  currentSessionAccounts: [],
  currentSessionAccountRisks: {},
  noTradesMode: false,
  selectedDashboardAccount: 'ALL',
  calendarDate: new Date()
};

const LOCAL_STORAGE_KEY = 'TRADING_JOURNAL_PRO_DATA_V1';
const THEME_STORAGE_KEY = 'TRADING_JOURNAL_THEME_V1';
const ACCOUNTS_STORAGE_KEY = 'TRADING_JOURNAL_ACCOUNTS_V1';

// Exponer explicitamente en window para compatibilidad universal entre modulos
if (typeof window !== 'undefined') {
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_KEY = SUPABASE_KEY;
  window.state = state;
  window.LOCAL_STORAGE_KEY = LOCAL_STORAGE_KEY;
  window.THEME_STORAGE_KEY = THEME_STORAGE_KEY;
  window.ACCOUNTS_STORAGE_KEY = ACCOUNTS_STORAGE_KEY;
}

// Ejecutar lo antes posible para evitar parpadeo de pantalla blanca
initTheme();



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
  loadUserAccounts();
}

function saveToLocalStorage() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.sessions));
  renderHomeMetrics();
}


function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setSessionDateToday() {
  const dateInput = document.getElementById('session-date');
  if (dateInput) {
    dateInput.value = getLocalDateString();
    showToast(`Fecha fijada a hoy (${dateInput.value})`, 'info');
  }
}


function openLightbox(imgSrc) {
  const modal = document.getElementById('lightbox-modal');
  document.getElementById('lightbox-img').src = imgSrc;
  modal.classList.add('active');
}

function closeLightbox() {
  document.getElementById('lightbox-modal').classList.remove('active');
}


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