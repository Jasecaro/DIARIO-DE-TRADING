/* ==========================================================================
   TheRaiseTrader - STORAGE & MULTI-ACCOUNT MANAGEMENT
   ========================================================================== */
function loadUserAccounts() {
  const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
  if (saved) {
    try {
      state.userAccounts = JSON.parse(saved);
    } catch (e) {
      console.error('Error loading accounts from localStorage', e);
      state.userAccounts = [];
    }
  }

  // Si no hay cuentas configuradas previamente, extraerlas de las sesiones reales del usuario
  if (!state.userAccounts || state.userAccounts.length === 0) {
    const sessionAccounts = new Set();
    (state.sessions || []).forEach(s => {
      if (Array.isArray(s.accountsList)) {
        s.accountsList.forEach(a => a && a.trim() && a.trim() !== 'Sin Cuenta' && sessionAccounts.add(a.trim()));
      } else if (s.account) {
        s.account.split(',').forEach(a => a && a.trim() && a.trim() !== 'Sin Cuenta' && sessionAccounts.add(a.trim()));
      }
    });

    if (sessionAccounts.size > 0) {
      state.userAccounts = Array.from(sessionAccounts).map(name => ({
        name: name,
        risk: name.toLowerCase().includes('100') ? 1000 : (name.toLowerCase().includes('200') ? 2000 : 500)
      }));
    } else {
      state.userAccounts = [
        { name: 'LucidTrading 25k', risk: 500 }
      ];
    }
    saveUserAccounts();
  }

  // Sincronizar cuentas activas de la sesión
  state.currentSessionAccounts = state.userAccounts.map(a => a.name);
  state.currentSessionAccountRisks = {};
  state.userAccounts.forEach(a => {
    state.currentSessionAccountRisks[a.name] = a.risk || 500;
  });
}

function saveUserAccounts() {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(state.userAccounts));
}

// Helper para obtener fecha local en formato YYYY-MM-DD (evita desfases de UTC)

function addAccountToSession() {
  const input = document.getElementById('new-account-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;

  if (!state.currentSessionAccounts.includes(name)) {
    state.currentSessionAccounts.push(name);
    const defaultRisk = name.toLowerCase().includes('100') ? 1000 : (name.toLowerCase().includes('200') ? 2000 : 500);
    state.currentSessionAccountRisks[name] = defaultRisk;

    if (!state.userAccounts) state.userAccounts = [];
    if (!state.userAccounts.some(a => a.name === name)) {
      state.userAccounts.push({ name: name, risk: defaultRisk });
      saveUserAccounts();
    }

    input.value = '';
    renderAccountsChips();
    renderRiskInputs();
    renderAvailableAccountsChips();
    renderDashboardAccountPills();
    showToast(`Cuenta "${name}" agregada a la sesión`, 'success');
  } else {
    showToast('Esta cuenta ya existe en la lista', 'warning');
  }
}

function quickAddAccount(name) {
  let counter = 1;
  let uniqueName = name;
  while (state.currentSessionAccounts.includes(uniqueName)) {
    counter++;
    uniqueName = `${name} #${counter}`;
  }
  state.currentSessionAccounts.push(uniqueName);
  const defaultRisk = name.toLowerCase().includes('100') ? 1000 : 500;
  state.currentSessionAccountRisks[uniqueName] = defaultRisk;

  if (!state.userAccounts) state.userAccounts = [];
  if (!state.userAccounts.some(a => a.name === uniqueName)) {
    state.userAccounts.push({ name: uniqueName, risk: defaultRisk });
    saveUserAccounts();
  }

  renderAccountsChips();
  renderRiskInputs();
  renderAvailableAccountsChips();
  renderDashboardAccountPills();
  showToast(`Cuenta "${uniqueName}" agregada`, 'success');
}

function removeAccountFromSession(accountName) {
  state.currentSessionAccounts = state.currentSessionAccounts.filter(a => a !== accountName);
  delete state.currentSessionAccountRisks[accountName];
  renderAccountsChips();
  renderRiskInputs();
  renderAvailableAccountsChips();
  showToast(`Cuenta "${accountName}" desactivada de esta sesión`, 'info');
}

function toggleAccountInSession(accountName) {
  if (state.currentSessionAccounts.includes(accountName)) {
    removeAccountFromSession(accountName);
  } else {
    state.currentSessionAccounts.push(accountName);
    const userAcc = state.userAccounts?.find(a => a.name === accountName);
    state.currentSessionAccountRisks[accountName] = userAcc ? userAcc.risk : 500;
    renderAccountsChips();
    renderRiskInputs();
    renderAvailableAccountsChips();
    showToast(`Cuenta "${accountName}" activada en la sesión`, 'success');
  }
}

function renderAvailableAccountsChips() {
  const container = document.getElementById('session-available-accounts-chips');
  if (!container) return;

  const accounts = getAllKnownAccounts();
  if (accounts.length === 0) {
    container.innerHTML = '<span style="font-size: 0.78rem; color: var(--text-muted);">Sin cuentas registradas aún.</span>';
    return;
  }

  let html = '<span style="font-size: 0.78rem; color: var(--text-muted); align-self: center;">Tus Cuentas:</span>';
  accounts.forEach(acc => {
    const isSelected = state.currentSessionAccounts.includes(acc);
    const safeName = acc.replace(/'/g, "\\'");
    html += `
      <span class="chip ${isSelected ? 'selected' : ''}" onclick="toggleAccountInSession('${safeName}')" title="${isSelected ? 'Activa en la sesión (clic para desactivar)' : 'Inactiva (clic para activar)'}">
        <i class="fa-solid fa-wallet"></i> ${acc} ${isSelected ? '✓' : '+'}
      </span>
    `;
  });

  container.innerHTML = html;
}

function renderAccountsChips() {
  const container = document.getElementById('session-accounts-chips');
  if (!container) return;

  if (state.currentSessionAccounts.length === 0) {
    container.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted);">Sin cuentas agregadas aún. Agrega una cuenta arriba.</span>';
    document.getElementById('session-account').value = 'Sin Cuenta';
    return;
  }

  container.innerHTML = state.currentSessionAccounts.map(acc => `
    <span class="chip selected" style="display: inline-flex; align-items: center; gap: 0.5rem; background: #eef2ff; color: var(--accent-primary); font-weight: 700; border-color: #c7d2fe;">
      <i class="fa-solid fa-wallet"></i> ${acc}
      <i class="fa-solid fa-xmark" style="cursor: pointer; opacity: 0.7; margin-left: 4px;" onclick="removeAccountFromSession('${acc}')" title="Eliminar cuenta"></i>
    </span>
  `).join('');

  document.getElementById('session-account').value = state.currentSessionAccounts.join(', ');
}

function renderRiskInputs() {
  const container = document.getElementById('risk-inputs-container');
  if (!container) return;

  if (state.currentSessionAccounts.length === 0) {
    container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-subtle);">Agrega cuentas arriba para definir el límite de pérdida de cada una.</p>';
    document.getElementById('total-replicator-risk').innerText = '$0.00 USD';
    return;
  }

  let totalRisk = 0;
  container.innerHTML = state.currentSessionAccounts.map(acc => {
    const risk = state.currentSessionAccountRisks[acc] !== undefined ? state.currentSessionAccountRisks[acc] : 500;
    totalRisk += parseFloat(risk) || 0;

    return `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.75rem 1rem; border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);">
        <label style="font-size: 0.85rem; color: var(--text-main); font-weight: 700; display: block; margin-bottom: 0.3rem;">
          <i class="fa-solid fa-wallet" style="color: var(--accent-primary);"></i> ${acc}
        </label>
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="font-weight: 800; color: var(--loss);">$</span>
          <input type="number" step="50" value="${risk}" oninput="updateAccountRisk('${acc}', this.value)" style="padding: 0.4rem 0.6rem; font-size: 0.9rem; font-weight: 700; border-color: #cbd5e1;" placeholder="Pérdida máx $">
          <span style="font-size: 0.75rem; color: var(--text-subtle);">USD máx</span>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('total-replicator-risk').innerText = `$${totalRisk.toFixed(2)} USD`;
}

function updateAccountRisk(acc, val) {
  state.currentSessionAccountRisks[acc] = parseFloat(val) || 0;
  
  let totalRisk = 0;
  state.currentSessionAccounts.forEach(a => {
    totalRisk += parseFloat(state.currentSessionAccountRisks[a] || 0);
  });
  document.getElementById('total-replicator-risk').innerText = `$${totalRisk.toFixed(2)} USD`;
}

function toggleRiskPerAccountBox() {
  const box = document.getElementById('risk-per-account-box');
  const checked = document.getElementById('check-accept-loss')?.checked;
  if (box) box.style.display = checked ? 'block' : 'none';
}

// Helpers para Hora y Cálculo de Puntos Técnicos en Trade Modal

function getAllKnownAccounts() {
  const accountsSet = new Set();
  
  // 1. Cuentas explícitamente configuradas por el usuario
  if (Array.isArray(state.userAccounts)) {
    state.userAccounts.forEach(a => {
      const n = typeof a === 'string' ? a : a?.name;
      if (n && n.trim() && n.trim() !== 'Sin Cuenta') accountsSet.add(n.trim());
    });
  }

  // 2. Cuentas activas en la sesión actual
  if (Array.isArray(state.currentSessionAccounts)) {
    state.currentSessionAccounts.forEach(a => {
      if (a && a.trim() && a.trim() !== 'Sin Cuenta') accountsSet.add(a.trim());
    });
  }

  // 3. Cuentas presentes en sesiones históricas
  if (Array.isArray(state.sessions)) {
    state.sessions.forEach(s => {
      if (Array.isArray(s.accountsList)) {
        s.accountsList.forEach(a => {
          if (a && a.trim() && a.trim() !== 'Sin Cuenta') accountsSet.add(a.trim());
        });
      } else if (s.account) {
        s.account.split(',').forEach(a => {
          const clean = a.trim();
          if (clean && clean !== 'Sin Cuenta') accountsSet.add(clean);
        });
      }

      if (Array.isArray(s.trades)) {
        s.trades.forEach(t => {
          if (t.account && t.account !== 'REPLICATED' && t.account.trim() && t.account.trim() !== 'Sin Cuenta') {
            accountsSet.add(t.account.trim());
          }
        });
      }
    });
  }

  return Array.from(accountsSet);
}

function renderDashboardAccountPills() {
  const container = document.getElementById('dashboard-account-pills');
  if (!container) return;

  const accounts = getAllKnownAccounts();
  const current = state.selectedDashboardAccount || 'ALL';

  let html = `
    <div class="dash-account-pill ${current === 'ALL' ? 'active' : ''}" onclick="setDashboardAccountFilter('ALL')">
      <i class="fa-solid fa-globe"></i> Consolidado (Todas)
    </div>
  `;

  accounts.forEach(acc => {
    const isActive = current === acc;
    const safeAcc = acc.replace(/'/g, "\\'");
    html += `
      <div class="dash-account-pill ${isActive ? 'active' : ''}" onclick="setDashboardAccountFilter('${safeAcc}')">
        <i class="fa-solid fa-wallet"></i> ${acc}
      </div>
    `;
  });

  container.innerHTML = html;
}

function setDashboardAccountFilter(accountName) {
  state.selectedDashboardAccount = accountName;
  renderDashboardAccountPills();
  renderDashboard();
}

function promptAddQuickAccount() {
  const name = prompt('Nombre de la nueva cuenta de fondeo (ej: Topstep 50K, Apex 100K, Lucid 25K):');
  if (!name || !name.trim()) return;
  const cleanName = name.trim();
  const defaultRisk = cleanName.toLowerCase().includes('100') ? 1000 : (cleanName.toLowerCase().includes('200') ? 2000 : 500);

  if (!state.userAccounts) state.userAccounts = [];
  if (!state.userAccounts.some(a => a.name === cleanName)) {
    state.userAccounts.push({ name: cleanName, risk: defaultRisk });
    saveUserAccounts();
  }

  if (!state.currentSessionAccounts.includes(cleanName)) {
    state.currentSessionAccounts.push(cleanName);
    state.currentSessionAccountRisks[cleanName] = defaultRisk;
  }

  setDashboardAccountFilter(cleanName);
  renderAccountsChips();
  renderRiskInputs();
  renderAvailableAccountsChips();
  renderDashboardAccountPills();
  renderDashboard();
  showToast(`Cuenta "${cleanName}" agregada y seleccionada`, 'success');
}

// ==========================================================================
// ADMINISTRACIÓN Y UNIFICACIÓN DE CUENTAS DE FONDEO
// ==========================================================================
function openAccountsManagerModal() {
  const modal = document.getElementById('accounts-manager-modal');
  if (!modal) return;
  renderAccountsManagerModal();
  modal.classList.add('active');
}

function closeAccountsManagerModal() {
  const modal = document.getElementById('accounts-manager-modal');
  if (modal) modal.classList.remove('active');
}

function renderAccountsManagerModal() {
  const body = document.getElementById('accounts-manager-body');
  if (!body) return;

  const allAccounts = getAllKnownAccounts();
  const sessions = state.sessions || [];

  // Options for merge dropdowns
  let optionsHtml = allAccounts.map(a => `<option value="${a}">${a}</option>`).join('');

  // Rows for accounts list
  let rowsHtml = '';
  allAccounts.forEach(acc => {
    const sessionCount = sessions.filter(s => {
      return (s.accountsList && s.accountsList.includes(acc)) ||
             (s.account && s.account.includes(acc));
    }).length;

    const userAcc = state.userAccounts?.find(a => a.name === acc);
    const currentRisk = userAcc ? userAcc.risk : (state.currentSessionAccountRisks?.[acc] || 500);
    const safeAcc = acc.replace(/'/g, "\\'");

    rowsHtml += `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.85rem 1rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; align-items: center; gap: 0.6rem; min-width: 200px;">
          <i class="fa-solid fa-wallet" style="color: var(--accent-primary); font-size: 1.1rem;"></i>
          <div>
            <strong style="font-size: 0.95rem; color: var(--text-main);">${acc}</strong>
            <div style="font-size: 0.75rem; color: var(--text-subtle);">
              ${sessionCount} ${sessionCount === 1 ? 'sesión registrada' : 'sesiones registradas'}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.3rem;">
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Riesgo:</span>
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--loss);">$</span>
            <input type="number" value="${currentRisk}" min="50" step="50" style="width: 85px; padding: 4px 6px; font-size: 0.85rem; font-family: var(--font-mono);" onchange="updateAccountRiskSetting('${safeAcc}', this.value)" title="Límite de pérdida por sesión">
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="renameAccount('${safeAcc}')" title="Renombrar o fusionar">
            <i class="fa-solid fa-pen"></i> Renombrar
          </button>
          <button type="button" class="btn btn-danger btn-sm" onclick="deleteAccount('${safeAcc}')" title="Eliminar cuenta">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  });

  body.innerHTML = `
    <!-- 1. Herramienta de Fusión Directa (Merge) -->
    <div style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.07), rgba(99, 102, 241, 0.03)); border: 1.5px solid rgba(79, 70, 229, 0.25); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
        <i class="fa-solid fa-code-merge" style="color: var(--accent-primary); font-size: 1.1rem;"></i>
        <h4 style="margin: 0; font-size: 1rem; color: var(--text-main);">Unificar Cuentas Duplicadas (Fusión)</h4>
      </div>
      <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.4;">
        ¿Escribiste una cuenta con nombres distintos (ej: <code>LUCID 25K</code>, <code>Lucid 25k</code> y <code>LucidTrading 25k</code>)? Únelas aquí en una sola. Se actualizarán automáticamente todas tus sesiones y operaciones pasadas.
      </p>

      ${allAccounts.length >= 2 ? `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) auto; gap: 0.75rem; align-items: flex-end;">
          <div>
            <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">
              Cuenta a unificar / duplicada:
            </label>
            <select id="modal-merge-from" style="width: 100%; font-size: 0.85rem; padding: 7px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main);">
              ${optionsHtml}
            </select>
          </div>
          <div>
            <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">
              Cuenta definitiva de destino:
            </label>
            <select id="modal-merge-to" style="width: 100%; font-size: 0.85rem; padding: 7px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main);">
              ${optionsHtml}
            </select>
          </div>
          <div>
            <button type="button" class="btn btn-primary btn-sm" onclick="executeModalMerge()" style="height: 38px; white-space: nowrap; font-weight: 700;">
              <i class="fa-solid fa-code-merge"></i> Unificar Ahora
            </button>
          </div>
        </div>
      ` : `
        <p style="font-size: 0.85rem; color: var(--text-subtle); margin: 0;">Tienes menos de 2 cuentas registradas. No hay cuentas duplicadas para unificar.</p>
      `}
    </div>

    <!-- 2. Lista de Cuentas -->
    <div style="margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h4 style="margin: 0; font-size: 0.95rem; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-list-check" style="color: var(--accent-primary);"></i> Cuentas Registradas en el Sistema (${allAccounts.length})
        </h4>
      </div>
      <div>
        ${rowsHtml || '<p style="color: var(--text-muted); font-size: 0.85rem;">No hay cuentas registradas.</p>'}
      </div>
    </div>

    <!-- 3. Agregar Nueva Cuenta -->
    <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem;">
      <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
        <i class="fa-solid fa-plus-circle" style="color: var(--profit);"></i> Agregar Nueva Cuenta de Fondeo
      </h4>
      <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 0.75rem; align-items: flex-end;">
        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Nombre de la Cuenta:</label>
          <input type="text" id="manager-new-account-name" placeholder="Ej: Topstep 50K, Apex 100K, Lucid 25K" style="width: 100%; font-size: 0.85rem;">
        </div>
        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Límite de Pérdida ($):</label>
          <input type="number" id="manager-new-account-risk" value="500" min="50" step="50" style="width: 100%; font-size: 0.85rem;">
        </div>
        <div>
          <button type="button" class="btn btn-success btn-sm" onclick="addAccountFromManager()" style="height: 38px; white-space: nowrap; font-weight: 700;">
            <i class="fa-solid fa-plus"></i> Guardar Cuenta
          </button>
        </div>
      </div>
    </div>
  `;
}

function executeModalMerge() {
  const fromEl = document.getElementById('modal-merge-from');
  const toEl = document.getElementById('modal-merge-to');
  if (!fromEl || !toEl) return;

  const fromAcc = fromEl.value;
  const toAcc = toEl.value;

  if (fromAcc === toAcc) {
    showToast('Selecciona dos cuentas diferentes para unificar.', 'warning');
    return;
  }

  mergeAccounts(fromAcc, toAcc);
}

function mergeAccounts(fromAccount, toAccount) {
  if (!fromAccount || !toAccount || fromAccount === toAccount) {
    showToast('Selecciona dos cuentas diferentes para unificar.', 'warning');
    return;
  }

  if (!confirm(`¿Estás seguro de fusionar "${fromAccount}" dentro de "${toAccount}"?\n\nTodas las sesiones y operaciones pasadas de "${fromAccount}" pasarán a llamarse "${toAccount}".`)) {
    return;
  }

  let sessionsUpdated = 0;
  (state.sessions || []).forEach(s => {
    let modified = false;

    if (Array.isArray(s.accountsList)) {
      if (s.accountsList.includes(fromAccount)) {
        s.accountsList = [...new Set(s.accountsList.map(a => a === fromAccount ? toAccount : a))];
        modified = true;
      }
    }

    if (s.account && s.account.includes(fromAccount)) {
      const parts = s.account.split(',').map(a => a.trim());
      const updatedParts = [...new Set(parts.map(a => a === fromAccount ? toAccount : a))];
      s.account = updatedParts.join(', ');
      modified = true;
    }

    if (s.accountRisks) {
      if (s.accountRisks[fromAccount] !== undefined) {
        if (s.accountRisks[toAccount] === undefined) {
          s.accountRisks[toAccount] = s.accountRisks[fromAccount];
        }
        delete s.accountRisks[fromAccount];
        modified = true;
      }
    }

    if (Array.isArray(s.trades)) {
      s.trades.forEach(t => {
        if (t.account === fromAccount) {
          t.account = toAccount;
          modified = true;
        }
      });
    }

    if (modified) sessionsUpdated++;
  });

  // Actualizar userAccounts
  if (!state.userAccounts) state.userAccounts = [];
  state.userAccounts = state.userAccounts.filter(a => a.name !== fromAccount);
  if (!state.userAccounts.some(a => a.name === toAccount)) {
    state.userAccounts.push({ name: toAccount, risk: 500 });
  }
  saveUserAccounts();

  // Actualizar currentSessionAccounts
  if (Array.isArray(state.currentSessionAccounts)) {
    state.currentSessionAccounts = [...new Set(state.currentSessionAccounts.map(a => a === fromAccount ? toAccount : a))];
  }

  // Actualizar filtro si correspondía a la cuenta eliminada
  if (state.selectedDashboardAccount === fromAccount) {
    state.selectedDashboardAccount = toAccount;
  }

  saveToLocalStorage();
  if (state.currentUser && typeof saveSessionToCloud === 'function') {
    (state.sessions || []).forEach(s => saveSessionToCloud(s));
  }

  renderAccountsChips();
  renderRiskInputs();
  renderAvailableAccountsChips();
  renderDashboardAccountPills();
  renderDashboard();
  renderAccountsManagerModal();

  showToast(`¡Cuentas unificadas con éxito! (${sessionsUpdated} sesiones actualizadas)`, 'success');
}

function deleteAccount(accountName) {
  if (!accountName) return;

  const countSessions = (state.sessions || []).filter(s => {
    return (s.accountsList && s.accountsList.includes(accountName)) ||
           (s.account && s.account.includes(accountName));
  }).length;

  let msg = `¿Deseas eliminar la cuenta "${accountName}" del sistema?`;
  if (countSessions > 0) {
    msg += `\n\nAtención: Aparece en ${countSessions} sesión(es) registrada(s). Se desvinculará de esas sesiones.`;
  }

  if (!confirm(msg)) return;

  if (Array.isArray(state.userAccounts)) {
    state.userAccounts = state.userAccounts.filter(a => a.name !== accountName);
    saveUserAccounts();
  }

  if (Array.isArray(state.currentSessionAccounts)) {
    state.currentSessionAccounts = state.currentSessionAccounts.filter(a => a !== accountName);
  }
  if (state.currentSessionAccountRisks) {
    delete state.currentSessionAccountRisks[accountName];
  }

  // Limpiar de sesiones históricas
  (state.sessions || []).forEach(s => {
    if (Array.isArray(s.accountsList)) {
      s.accountsList = s.accountsList.filter(a => a !== accountName);
    }
    if (s.account) {
      const parts = s.account.split(',').map(a => a.trim()).filter(a => a !== accountName);
      s.account = parts.length > 0 ? parts.join(', ') : 'Sin Cuenta';
    }
    if (s.accountRisks && s.accountRisks[accountName]) {
      delete s.accountRisks[accountName];
    }
    if (Array.isArray(s.trades)) {
      s.trades.forEach(t => {
        if (t.account === accountName) {
          t.account = 'REPLICATED';
        }
      });
    }
  });

  if (state.selectedDashboardAccount === accountName) {
    state.selectedDashboardAccount = 'ALL';
  }

  saveToLocalStorage();
  if (state.currentUser && typeof saveSessionToCloud === 'function') {
    (state.sessions || []).forEach(s => saveSessionToCloud(s));
  }

  renderAccountsChips();
  renderRiskInputs();
  renderAvailableAccountsChips();
  renderDashboardAccountPills();
  renderDashboard();
  renderAccountsManagerModal();

  showToast(`Cuenta "${accountName}" eliminada correctamente`, 'info');
}

function renameAccount(oldName) {
  const newName = prompt(`Ingresa el nuevo nombre para la cuenta "${oldName}":`, oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;

  const cleanNewName = newName.trim();
  const known = getAllKnownAccounts();
  if (known.includes(cleanNewName)) {
    if (confirm(`La cuenta "${cleanNewName}" ya existe en tu sistema. ¿Deseas fusionar "${oldName}" dentro de "${cleanNewName}"?`)) {
      mergeAccounts(oldName, cleanNewName);
    }
    return;
  }

  mergeAccounts(oldName, cleanNewName);
}

function addAccountFromManager() {
  const nameEl = document.getElementById('manager-new-account-name');
  const riskEl = document.getElementById('manager-new-account-risk');
  if (!nameEl) return;

  const name = nameEl.value.trim();
  const risk = parseFloat(riskEl?.value) || 500;

  if (!name) {
    showToast('Ingresa un nombre para la cuenta.', 'warning');
    return;
  }

  const existing = getAllKnownAccounts();
  if (existing.includes(name)) {
    showToast('Esta cuenta ya existe en la lista.', 'warning');
    return;
  }

  if (!state.userAccounts) state.userAccounts = [];
  state.userAccounts.push({ name: name, risk: risk });
  saveUserAccounts();

  if (!state.currentSessionAccounts.includes(name)) {
    state.currentSessionAccounts.push(name);
    state.currentSessionAccountRisks[name] = risk;
  }

  renderAccountsChips();
  renderRiskInputs();
  renderAvailableAccountsChips();
  renderDashboardAccountPills();
  renderDashboard();
  renderAccountsManagerModal();

  nameEl.value = '';
  showToast(`Cuenta "${name}" guardada con éxito`, 'success');
}

function updateAccountRiskSetting(accountName, newRisk) {
  const val = parseFloat(newRisk) || 500;
  if (state.currentSessionAccountRisks) {
    state.currentSessionAccountRisks[accountName] = val;
  }
  if (Array.isArray(state.userAccounts)) {
    const acc = state.userAccounts.find(a => a.name === accountName);
    if (acc) acc.risk = val;
    saveUserAccounts();
  }
  renderRiskInputs();
  renderAccountsComparisonTable();
  showToast(`Riesgo de "${accountName}" actualizado a $${val}`, 'success');
}

function renderAccountsComparisonTable() {
  const tbody = document.getElementById('accounts-comparison-tbody');
  const badge = document.getElementById('accounts-count-badge');
  if (!tbody) return;

  const accounts = getAllKnownAccounts();
  if (badge) {
    badge.innerText = `${accounts.length} ${accounts.length === 1 ? 'Cuenta Registrada' : 'Cuentas Registradas'}`;
  }

  if (accounts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No hay cuentas registradas aún. Agrega una cuenta arriba para comenzar a comparar.
        </td>
      </tr>
    `;
    return;
  }

  const allSessions = state.sessions || [];

  let rowsHtml = '';
  accounts.forEach(acc => {
    let accPnl = 0;
    let accTrades = 0;
    let accWins = 0;
    let accLosses = 0;
    let accGrossProfit = 0;
    let accGrossLoss = 0;
    let accPeakCapital = 0;
    let accRunningCapital = 0;
    let accMaxDrawdown = 0;

    allSessions.forEach(s => {
      const hasAccount = (s.accountsList && s.accountsList.includes(acc)) ||
                         (s.account && s.account.includes(acc));
      if (!hasAccount) return;

      (s.trades || []).forEach(t => {
        if (!t.account || t.account === 'REPLICATED' || t.account === acc) {
          accTrades++;
          accPnl += (t.pnl || 0);
          accRunningCapital += (t.pnl || 0);
          if (accRunningCapital > accPeakCapital) accPeakCapital = accRunningCapital;
          const dd = accPeakCapital - accRunningCapital;
          if (dd > accMaxDrawdown) accMaxDrawdown = dd;

          if (t.pnl >= 0) {
            accWins++;
            accGrossProfit += t.pnl;
          } else {
            accLosses++;
            accGrossLoss += Math.abs(t.pnl);
          }
        }
      });
    });

    const wr = accTrades > 0 ? ((accWins / accTrades) * 100).toFixed(1) : '0.0';
    const pf = accGrossLoss > 0 ? (accGrossProfit / accGrossLoss).toFixed(2) : (accGrossProfit > 0 ? 'INF' : '0.00');
    const risk = state.currentSessionAccountRisks?.[acc] || (acc.toLowerCase().includes('100') ? 1000 : 500);
    const isWin = accPnl >= 0;
    const pnlClass = isWin ? 'badge-profit' : 'badge-loss';

    let statusBadge = '<span class="badge" style="background: #f1f5f9; color: var(--text-muted);">Breakeven</span>';
    if (accPnl > 0) {
      statusBadge = '<span class="badge badge-profit"><i class="fa-solid fa-arrow-trend-up"></i> En Ganancia</span>';
    } else if (accPnl < 0) {
      statusBadge = '<span class="badge badge-loss"><i class="fa-solid fa-arrow-trend-down"></i> Drawdown</span>';
    }

    const isCurrentActive = state.selectedDashboardAccount === acc;
    const safeAcc = acc.replace(/'/g, "\\'");

    rowsHtml += `
      <tr style="${isCurrentActive ? 'background: rgba(79, 70, 229, 0.06);' : ''}">
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-wallet" style="color: var(--accent-primary);"></i>
            <strong>${acc}</strong>
            ${isCurrentActive ? '<span class="badge" style="background: var(--accent-primary); color: #fff; font-size: 0.65rem; padding: 2px 6px;">Filtro Activo</span>' : ''}
          </div>
        </td>
        <td><span style="font-family: var(--font-mono); font-size: 0.85rem;">$${parseFloat(risk).toFixed(0)}</span></td>
        <td><span class="badge ${pnlClass}" style="font-family: var(--font-mono); font-size: 0.85rem;">$${accPnl.toFixed(2)}</span></td>
        <td>${accTrades} <span style="font-size: 0.75rem; color: var(--text-subtle);">(${accWins}W / ${accLosses}L)</span></td>
        <td>
          <span style="font-weight: 700;">${wr}%</span>
          <div class="account-wr-bar" title="Win Rate ${wr}%">
            <div class="account-wr-fill" style="width: ${Math.min(100, Math.max(0, parseFloat(wr)))}%;"></div>
          </div>
        </td>
        <td><strong>${pf}</strong></td>
        <td><span style="color: var(--loss); font-family: var(--font-mono); font-size: 0.85rem;">-$${accMaxDrawdown.toFixed(2)}</span></td>
        <td>${statusBadge}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="setDashboardAccountFilter('${safeAcc}')" title="Filtrar Dashboard por esta cuenta">
            <i class="fa-solid fa-filter"></i> ${isCurrentActive ? 'Viendo' : 'Ver'}
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;
}

// ==========================================================================
// CALENDARIO P&L ESTILO TRADEZELLA
// ==========================================================================