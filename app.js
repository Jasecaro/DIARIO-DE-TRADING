/* ==========================================================================
   TheRaiseTrader - MODULAR ARCHITECTURE BUNDLE / ENTRY POINT
   ==========================================================================
   The monolithic app.js has been successfully partitioned into 12 clean,
   high-performance, specialized modules inside the js/ directory:
   
   1. js/config-state.js       - Configuration, constants, global state & theme
   2. js/storage-accounts.js   - LocalStorage & multi-account management
   3. js/ui-core.js            - Navigation, stepper, chips & utilities
   4. js/trades-manager.js     - Live trades, missed trades & analysis
   5. js/session-workflow.js   - Session saving & post-session screenshot
   6. js/dashboard-metrics.js  - Metrics & Chart.js equity curves
   7. js/calendar-view.js      - TradeZella style calendar & day modal
   8. js/history-manager.js    - Session history & session editor
   9. js/reports-notebooklm.js - NotebookLM reports & executive reviews
  10. js/playbook-generator.js - Strategy & AI playbook generator
  11. js/supabase-sync.js      - Supabase auth & cloud sync
  12. js/main.js               - App startup & event coordination
   ========================================================================== */

if (typeof window !== 'undefined') {
  window.APP_MODULAR_LOADED = true;
  console.log('%c TheRaiseTrader Pro %c Modular architecture active (12 modules) ', 
    'background: #4f46e5; color: #fff; border-radius: 3px 0 0 3px; font-weight: bold; padding: 2px 5px;', 
    'background: #10b981; color: #fff; border-radius: 0 3px 3px 0; font-weight: bold; padding: 2px 5px;');
}
