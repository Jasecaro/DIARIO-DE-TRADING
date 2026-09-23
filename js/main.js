/* ==========================================================================
   TheRaiseTrader - MAIN INITIALIZATION & DOMContentLoaded
   ========================================================================== */
function initializeDefaults() {
  // Set today's local date in form
  const today = getLocalDateString();
  const dateInput = document.getElementById('session-date');
  if (dateInput) dateInput.value = today;

  renderAccountsChips();
  renderRiskInputs();
  toggleRiskPerAccountBox();
  renderAvailableAccountsChips();
  renderDashboardAccountPills();
}


// Navigation Tabs

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadFromLocalStorage();
  initializeDefaults();
  renderDashboard();
  renderHistory();
  renderHomeMetrics();
  generateNotebookLMReport();
  initSupabase();
  initMarketSessionsClock();
  initMindsetQuotes();
  initSidebarState();
  initImageDropZones();
});