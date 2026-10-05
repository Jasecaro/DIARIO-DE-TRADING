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

// ==========================================================================
// HIGH-CAPACITY STORAGE ENGINE (INDEXEDDB + LOCALSTORAGE HYBRID)
// ==========================================================================
const IDB_CONFIG = {
  name: 'TheRaiseTraderDB',
  version: 1,
  store: 'sessions'
};

let dbInstance = null;

function initIDB() {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_CONFIG.name, IDB_CONFIG.version);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_CONFIG.store)) {
          db.createObjectStore(IDB_CONFIG.store, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      request.onerror = (e) => {
        console.warn('IndexedDB unavailable or blocked:', e);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB initialization error:', err);
      resolve(null);
    }
  });
}

async function persistToIndexedDB(sessions) {
  try {
    const db = await initIDB();
    if (!db) return;
    const tx = db.transaction(IDB_CONFIG.store, 'readwrite');
    const store = tx.objectStore(IDB_CONFIG.store);
    
    // Store full objects with screenshots
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      sessions.forEach(session => {
        try {
          if (session && session.id) {
            store.put(session);
          }
        } catch (e) {
          console.warn('Error storing session in IDB:', e);
        }
      });
    };
  } catch (err) {
    console.warn('Failed to persist to IndexedDB:', err);
  }
}

async function hydrateFromIndexedDB() {
  try {
    const db = await initIDB();
    if (!db) return;
    const tx = db.transaction(IDB_CONFIG.store, 'readonly');
    const store = tx.objectStore(IDB_CONFIG.store);
    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const idbSessions = getAllReq.result;
      if (idbSessions && idbSessions.length > 0) {
        if (!state.sessions || state.sessions.length === 0) {
          state.sessions = idbSessions;
          saveToLocalStorage();
          if (typeof renderDashboard === 'function') renderDashboard();
          if (typeof renderHistory === 'function') renderHistory();
          if (typeof renderHomeMetrics === 'function') renderHomeMetrics();
          return;
        }

        // Si IndexedDB tiene sesiones que no están en memoria local, agregarlas
        const localIds = new Set((state.sessions || []).map(s => s.id));
        let hasNewFromIdb = false;
        idbSessions.forEach(idbS => {
          if (idbS && idbS.id && !localIds.has(idbS.id)) {
            state.sessions.push(idbS);
            hasNewFromIdb = true;
          }
        });
        if (hasNewFromIdb) {
          state.sessions.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        }

        // Hydrate any cached placeholders back into memory
        const idbMap = new Map(idbSessions.map(s => [s.id, s]));
        let hasRestored = false;

        state.sessions.forEach((s, idx) => {
          const idbSession = idbMap.get(s.id);
          if (idbSession) {
            if (s.sessionChartImage === '[IDB_STORED]' && idbSession.sessionChartImage) {
              state.sessions[idx].sessionChartImage = idbSession.sessionChartImage;
              hasRestored = true;
            }
            if (s.checklist?.sessionChartImage === '[IDB_STORED]' && (idbSession.checklist?.sessionChartImage || idbSession.sessionChartImage)) {
              state.sessions[idx].checklist.sessionChartImage = idbSession.checklist?.sessionChartImage || idbSession.sessionChartImage;
              hasRestored = true;
            }
            if (s.checklist?.noTradeSession?.chartImage === '[IDB_STORED]' && idbSession.checklist?.noTradeSession?.chartImage) {
              state.sessions[idx].checklist.noTradeSession.chartImage = idbSession.checklist.noTradeSession.chartImage;
              hasRestored = true;
            }
            (s.trades || []).forEach((t, tIdx) => {
              if (t.chartImage === '[IDB_STORED]' && idbSession.trades?.[tIdx]?.chartImage) {
                state.sessions[idx].trades[tIdx].chartImage = idbSession.trades[tIdx].chartImage;
                hasRestored = true;
              }
            });
          }
        });

        if (hasRestored) {
          if (typeof renderDashboard === 'function') renderDashboard();
          if (typeof renderHistory === 'function') renderHistory();
        }
      } else if (state.sessions && state.sessions.length > 0) {
        // Seed IndexedDB with initial localStorage data
        persistToIndexedDB(state.sessions);
      }
    };
  } catch (err) {
    console.warn('Error hydrating from IndexedDB:', err);
  }
}

// Load / Save LocalStorage & IndexedDB Hybrid
function loadFromLocalStorage() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (data) {
    try {
      state.sessions = JSON.parse(data);
      // Clean up duplicates if any
      const seen = new Set();
      state.sessions = state.sessions.filter(s => {
        if (!s || !s.id) return false;
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
    } catch (e) {
      console.error('Error loading data from localStorage', e);
      state.sessions = [];
    }
  }
  
  // Hydrate full images from IndexedDB asynchronously
  hydrateFromIndexedDB();
  loadUserAccounts();
}


function stripHeavyBase64(val) {
  if (!val) return val;
  if (typeof val === 'string') {
    if (val.startsWith('data:image/') || (val.length > 500 && !val.startsWith('http') && !val.startsWith('['))) {
      return '[IDB_STORED]';
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(item => stripHeavyBase64(item));
  }
  if (typeof val === 'object') {
    const copy = {};
    for (const k in val) {
      if (Object.prototype.hasOwnProperty.call(val, k)) {
        copy[k] = stripHeavyBase64(val[k]);
      }
    }
    return copy;
  }
  return val;
}

function saveToLocalStorage() {
  // 1. Persistir siempre sesiones completas (con capturas en alta fidelidad) en IndexedDB (sin límite de 5MB)
  if (Array.isArray(state.sessions)) {
    persistToIndexedDB(state.sessions);
  }

  // 2. Persistencia en LocalStorage con compresión recursiva blindada
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.sessions));
  } catch (quotaErr) {
    console.warn('LocalStorage saturado (límite 5MB). Aplicando stripping escalonado a caché local...', quotaErr);
    try {
      // Tier 1: Mantener imágenes completas únicamente en la sesión más reciente
      const tieredSessions = state.sessions.map((session, index) => {
        if (index === 0) return session;
        return stripHeavyBase64(session);
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tieredSessions));
    } catch (tier2Err) {
      console.warn('LocalStorage aún saturado. Guardando metadatos completos y delegando imágenes a IndexedDB...', tier2Err);
      try {
        // Tier 2: Strip recursivo ultra-liviano de todas las imágenes base64 para garantizar persistencia de metadatos
        const metadataSessions = state.sessions.map(session => stripHeavyBase64(session));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(metadataSessions));
      } catch (tier3Err) {
        console.error('LocalStorage completamente bloqueado por el navegador. Todos los datos están seguros en IndexedDB.', tier3Err);
      }
    }
  }

  if (typeof renderHomeMetrics === 'function') {
    try {
      renderHomeMetrics();
    } catch (err) {
      console.warn('Error rendering home metrics after save:', err);
    }
  }
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

function getValidImageSrc(src) {
  if (!src || typeof src !== 'string' || src.startsWith('[IDB_')) return null;
  return src;
}

function openLightbox(imgSrc) {
  if (!imgSrc || imgSrc.startsWith('[IDB_')) return;
  const modal = document.getElementById('lightbox-modal');
  if (!modal) return;
  const img = document.getElementById('lightbox-img');
  if (img) img.src = imgSrc;
  modal.classList.add('active');
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  if (modal) modal.classList.remove('active');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : (type === 'danger' || type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info')}"></i> <span>${message}</span>`;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function initTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark') {
      applyTheme('dark');
    } else if (savedTheme === 'light') {
      applyTheme('light');
    } else {
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

  if (state.sessions && state.sessions.length > 0) {
    if (typeof renderEquityChart === 'function') renderEquityChart(state.sessions);
  }
}