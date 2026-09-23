/* ==========================================================================
   TheRaiseTrader - SUPABASE AUTHENTICATION & CLOUD SYNC
   ========================================================================== */
function initSupabase() {
  if (window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      setupAuthStateListener();
    } catch (e) {
      console.error('Error al inicializar Supabase:', e);
    }
  } else {
    console.warn('Supabase SDK no está disponible en window.supabase');
  }
}

function setupAuthStateListener() {
  if (!supabaseClient) return;

  // Escuchar cambios de estado de autenticación (Login, Logout, Token Refresh)
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      state.currentUser = session.user;
      state.isCloudSynced = true;
      updateAuthUI(true, session.user.email);
      await loadUserSessionsFromCloud(session.user.id);
    } else {
      state.currentUser = null;
      state.isCloudSynced = false;
      updateAuthUI(false);
      loadFromLocalStorage();
      renderDashboard();
      renderHistory();
      if (typeof generateNotebookLMReport === 'function') generateNotebookLMReport();
    }
  });

  // Verificar sesión existente al cargar la página
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session && session.user) {
      state.currentUser = session.user;
      state.isCloudSynced = true;
      updateAuthUI(true, session.user.email);
      loadUserSessionsFromCloud(session.user.id);
    } else {
      updateAuthUI(false);
    }
  }).catch(err => {
    console.warn('No active Supabase session found:', err);
    updateAuthUI(false);
  });
}

function updateAuthUI(isLoggedIn, userEmail = '') {
  const btnLogin = document.getElementById('btn-open-login');
  const userLoggedBox = document.getElementById('user-logged-box');
  const userEmailText = document.getElementById('user-email-text');

  if (isLoggedIn) {
    if (btnLogin) btnLogin.style.display = 'none';
    if (userLoggedBox) userLoggedBox.style.display = 'flex';
    if (userEmailText) userEmailText.innerText = userEmail;
  } else {
    if (btnLogin) btnLogin.style.display = 'inline-flex';
    if (userLoggedBox) userLoggedBox.style.display = 'none';
  }

  // Sincronizar estado de la tarjeta de la nube en la portada
  if (typeof updateHomeCloudCard === 'function') {
    updateHomeCloudCard();
  }
}

// Control del Modal de Autenticación
function openAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('active');
    switchAuthTab(mode);
    clearAuthAlert();
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('active');
    clearAuthAlert();
  }
}

function switchAuthTab(mode) {
  const tabLogin = document.getElementById('tab-btn-login');
  const tabRegister = document.getElementById('tab-btn-register');
  const formLogin = document.getElementById('auth-form-login');
  const formRegister = document.getElementById('auth-form-register');

  clearAuthAlert();

  if (mode === 'register') {
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabRegister) tabRegister.classList.add('active');
    if (formLogin) formLogin.style.display = 'none';
    if (formRegister) formRegister.style.display = 'block';
  } else {
    if (tabRegister) tabRegister.classList.remove('active');
    if (tabLogin) tabLogin.classList.add('active');
    if (formRegister) formRegister.style.display = 'none';
    if (formLogin) formLogin.style.display = 'block';
  }
}

function showAuthAlert(message, type = 'danger') {
  const alertBox = document.getElementById('auth-alert');
  if (!alertBox) return;
  alertBox.className = `auth-alert ${type}`;
  alertBox.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : (type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-info')}"></i> <span>${message}</span>`;
  alertBox.style.display = 'flex';
}

function clearAuthAlert() {
  const alertBox = document.getElementById('auth-alert');
  if (alertBox) {
    alertBox.innerHTML = '';
    alertBox.style.display = 'none';
  }
}

// Handlers de Envío de Formularios
async function handleLoginSubmit(event) {
  event.preventDefault();
  if (!supabaseClient) {
    showAuthAlert('Supabase no está conectado correctamente.');
    return;
  }

  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const submitBtn = document.getElementById('login-submit-btn');

  if (!email || !password) {
    showAuthAlert('Por favor ingresa tu correo y contraseña.');
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    closeAuthModal();
    showToast(`¡Bienvenido de nuevo, ${email}!`, 'success');
  } catch (err) {
    console.error('Login error:', err);
    let msg = err.message || 'Error al iniciar sesión.';
    if (msg.includes('Invalid login credentials')) {
      msg = 'Correo o contraseña incorrectos. Verifica tus datos o crea una cuenta si eres nuevo.';
    }
    showAuthAlert(msg, 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Entrar a mi Diario';
    }
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  if (!supabaseClient) {
    showAuthAlert('Supabase no está conectado.');
    return;
  }

  const email = document.getElementById('reg-email')?.value.trim();
  const password = document.getElementById('reg-password')?.value;
  const confirmPassword = document.getElementById('reg-password-confirm')?.value;
  const submitBtn = document.getElementById('reg-submit-btn');

  if (password !== confirmPassword) {
    showAuthAlert('Las contraseñas no coinciden.', 'danger');
    return;
  }

  if (password.length < 6) {
    showAuthAlert('La contraseña debe tener al menos 6 caracteres.', 'danger');
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando cuenta...';
    }

    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;

    if (data?.session) {
      closeAuthModal();
      showToast('¡Cuenta creada e inicio de sesión exitoso!', 'success');
    } else {
      showAuthAlert('¡Cuenta creada exitosamente! Revisa tu correo si tienes confirmación activada, o inicia sesión.', 'success');
    }
  } catch (err) {
    console.error('Registration error:', err);
    showAuthAlert(err.message || 'Error al registrar la cuenta.', 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Crear mi Cuenta Gratis';
    }
  }
}

async function handleLogout() {
  if (!supabaseClient) return;
  try {
    await supabaseClient.auth.signOut();
    showToast('Sesión cerrada. Modo local activo.', 'info');
  } catch (err) {
    console.error('Logout error:', err);
  }
}

// Persistencia en PostgreSQL de Supabase
async function loadUserSessionsFromCloud(userId) {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('trading_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    const cloudSessions = (data || []).map(row => ({
      id: row.id,
      date: row.date,
      timeSlot: row.time_slot,
      account: row.account,
      accountsList: row.accounts_list || [],
      accountRisks: row.account_risks || {},
      totalReplicatorRisk: parseFloat(row.total_replicator_risk || 0),
      bias: row.bias,
      preEmotion: row.pre_emotion,
      energyScore: row.energy_score,
      checklist: row.checklist || {},
      folioMaestro: row.folio_maestro || {},
      trades: row.trades || [],
      adherence: row.adherence,
      disciplineScore: row.discipline_score,
      mistakes: row.mistakes,
      takeaway: row.takeaway,
      netPnl: parseFloat(row.net_pnl || 0)
    }));

    // Verificar si hay sesiones locales previas para ofrecer migración
    const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    let localSessions = [];
    if (localRaw) {
      try { localSessions = JSON.parse(localRaw); } catch (e) {}
    }
    const nonDemoLocal = localSessions.filter(s => s.id && !String(s.id).startsWith('demo_'));

    state.sessions = cloudSessions;
    saveToLocalStorage(); // Mantener caché local para offline
    renderDashboard();
    renderHistory();
    if (typeof generateNotebookLMReport === 'function') generateNotebookLMReport();

    // Si la nube está vacía pero hay sesiones locales reales, ofrecer migración automática
    if (cloudSessions.length === 0 && nonDemoLocal.length > 0) {
      showMigrationModal(nonDemoLocal.length);
    }
  } catch (err) {
    console.error('Error fetching sessions from Supabase:', err);
    showToast('Error al conectar con la base de datos en la nube.', 'danger');
  }
}

async function saveSessionToCloud(session) {
  if (!supabaseClient || !state.currentUser) return;
  try {
    const row = {
      id: session.id,
      user_id: state.currentUser.id,
      date: session.date,
      time_slot: session.timeSlot,
      account: session.account,
      accounts_list: session.accountsList || [],
      account_risks: session.accountRisks || {},
      total_replicator_risk: session.totalReplicatorRisk || 0,
      bias: session.bias,
      pre_emotion: session.preEmotion,
      energy_score: session.energyScore || 8,
      checklist: session.checklist || {},
      folio_maestro: session.folioMaestro || {},
      trades: session.trades || [],
      adherence: session.adherence,
      discipline_score: session.disciplineScore || 10,
      mistakes: session.mistakes || '',
      takeaway: session.takeaway || '',
      net_pnl: session.netPnl || 0,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient.from('trading_sessions').upsert([row]);
    if (error) {
      console.error('Error saving session to Supabase:', error);
      showToast('Sesión guardada en caché local, pero falló en la nube.', 'warning');
    } else {
      showToast('¡Sesión sincronizada en tu nube de Supabase!', 'success');
    }
  } catch (err) {
    console.error('Exception in saveSessionToCloud:', err);
  }
}

async function deleteSessionFromCloud(sessionId) {
  if (!supabaseClient || !state.currentUser) return;
  try {
    const { error } = await supabaseClient
      .from('trading_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', state.currentUser.id);
    if (error) {
      console.error('Error deleting session in Supabase:', error);
    }
  } catch (err) {
    console.error('Exception in deleteSessionFromCloud:', err);
  }
}

// Handlers del Modal de Migración
function showMigrationModal(count) {
  const modal = document.getElementById('migrate-modal');
  const countEl = document.getElementById('local-sessions-count');
  if (countEl) countEl.innerText = count;
  if (modal) modal.classList.add('active');
}

function dismissMigrationModal() {
  const modal = document.getElementById('migrate-modal');
  if (modal) modal.classList.remove('active');
}

async function syncSessionsArrayToCloud(sessionsArray) {
  if (!supabaseClient || !state.currentUser || !Array.isArray(sessionsArray)) return;
  const nonDemo = sessionsArray.filter(s => s.id && !String(s.id).startsWith('demo_'));
  if (nonDemo.length === 0) return;

  const rows = nonDemo.map(session => ({
    id: session.id,
    user_id: state.currentUser.id,
    date: session.date,
    time_slot: session.timeSlot,
    account: session.account,
    accounts_list: session.accountsList || [],
    account_risks: session.accountRisks || {},
    total_replicator_risk: session.totalReplicatorRisk || 0,
    bias: session.bias,
    pre_emotion: session.preEmotion,
    energy_score: session.energyScore || 8,
    checklist: session.checklist || {},
    folio_maestro: session.folioMaestro || {},
    trades: session.trades || [],
    adherence: session.adherence,
    discipline_score: session.disciplineScore || 10,
    mistakes: session.mistakes || '',
    takeaway: session.takeaway || '',
    net_pnl: session.netPnl || 0,
    updated_at: new Date().toISOString()
  }));

  try {
    const { error } = await supabaseClient.from('trading_sessions').upsert(rows);
    if (!error) {
      showToast(`¡${rows.length} sesiones sincronizadas en la nube!`, 'success');
    }
  } catch (err) {
    console.error('Error in syncSessionsArrayToCloud:', err);
  }
}

async function confirmCloudMigration() {
  dismissMigrationModal();
  if (!supabaseClient || !state.currentUser) return;

  const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!localRaw) return;
  
  let localSessions = [];
  try { localSessions = JSON.parse(localRaw); } catch (e) { return; }
  const nonDemo = localSessions.filter(s => s.id && !String(s.id).startsWith('demo_'));

  if (nonDemo.length === 0) return;

  showToast(`Sincronizando ${nonDemo.length} sesiones a la nube...`, 'info');

  const rows = nonDemo.map(session => ({
    id: session.id,
    user_id: state.currentUser.id,
    date: session.date,
    time_slot: session.timeSlot,
    account: session.account,
    accounts_list: session.accountsList || [],
    account_risks: session.accountRisks || {},
    total_replicator_risk: session.totalReplicatorRisk || 0,
    bias: session.bias,
    pre_emotion: session.preEmotion,
    energy_score: session.energyScore || 8,
    checklist: session.checklist || {},
    folio_maestro: session.folioMaestro || {},
    trades: session.trades || [],
    adherence: session.adherence,
    discipline_score: session.disciplineScore || 10,
    mistakes: session.mistakes || '',
    takeaway: session.takeaway || '',
    net_pnl: session.netPnl || 0,
    updated_at: new Date().toISOString()
  }));

  try {
    const { error } = await supabaseClient.from('trading_sessions').upsert(rows);
    if (error) throw error;

    showToast(`¡${rows.length} sesiones migradas a la nube con éxito!`, 'success');
    await loadUserSessionsFromCloud(state.currentUser.id);
  } catch (err) {
    console.error('Error during cloud migration:', err);
    showToast('Error al migrar sesiones a la nube.', 'danger');
  }
}

// Cerrar modales y menú desplegable al hacer clic fuera
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'auth-modal') closeAuthModal();
  if (e.target && e.target.id === 'migrate-modal') dismissMigrationModal();
  
  // Cerrar menú de herramientas del header si se hace clic fuera
  const dropdownWrap = document.querySelector('.header-dropdown-wrap');
  if (dropdownWrap && !dropdownWrap.contains(e.target)) {
    closeHeaderToolsMenu();
  }
});

/* ==========================================================================
   TAB 0: PORTADA & HOME HUB INTERACTIVITY
   ========================================================================== */

// 1. Mini Métricas en Tiempo Real para la Portada