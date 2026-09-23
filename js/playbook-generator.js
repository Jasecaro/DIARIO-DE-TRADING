/* ==========================================================================
   TheRaiseTrader - STRATEGY & INSTITUTIONAL PLAYBOOK GENERATOR
   ========================================================================== */

/* ==========================================================================
   AI STRATEGY & PLAYBOOK GENERATOR (NOTEBOOKLM READY)
   ========================================================================== */

const STRATEGY_STORAGE_KEY = 'trading_playbook_data';
const GEMINI_KEY_STORAGE = 'gemini_api_key';

let strategyState = {
  rawInput: '',
  markdown: '',
  style: 'SMC / ICT & Order Flow',
  updatedAt: null
};

// Inicialización de la pestaña de Estrategia
function initStrategyTab() {
  // 1. Cargar API Key
  const savedApiKey = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  const apiKeyInput = document.getElementById('gemini-api-key');
  if (apiKeyInput) {
    apiKeyInput.value = savedApiKey;
  }
  updateApiKeyStatusUI(savedApiKey);

  // 2. Contador de caracteres en textarea
  const rawInputEl = document.getElementById('strategy-raw-input');
  if (rawInputEl && !rawInputEl.dataset.listenerAttached) {
    rawInputEl.dataset.listenerAttached = 'true';
    rawInputEl.addEventListener('input', () => {
      updateStrategyCharCount();
    });
  }

  // 3. Cargar Playbook guardado
  loadPlaybookFromStorage();
}

function updateStrategyCharCount() {
  const rawInputEl = document.getElementById('strategy-raw-input');
  const countEl = document.getElementById('strategy-char-count');
  if (rawInputEl && countEl) {
    countEl.textContent = `${rawInputEl.value.length} caracteres`;
  }
}

function updateApiKeyStatusUI(key) {
  const statusEl = document.getElementById('api-key-status');
  const statusText = document.getElementById('api-status-text');
  if (!statusEl || !statusText) return;

  const dot = statusEl.querySelector('.status-dot');
  if (key && key.trim().length > 15) {
    if (dot) dot.className = 'status-dot active';
    statusText.textContent = '🟢 Conectado con Google Gemini API (Modo IA)';
    statusText.style.color = 'var(--profit)';
  } else {
    if (dot) dot.className = 'status-dot';
    statusText.textContent = '⚡ Modo Local Activo (Genera sin clave en 1 clic)';
    statusText.style.color = 'var(--text-muted)';
  }
}

function toggleApiKeyVisibility() {
  const input = document.getElementById('gemini-api-key');
  const icon = document.getElementById('toggle-key-icon');
  if (!input || !icon) return;

  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-regular fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-regular fa-eye';
  }
}

function saveGeminiKeyAction() {
  const input = document.getElementById('gemini-api-key');
  if (!input) return;
  const key = input.value.trim();

  if (key) {
    localStorage.setItem(GEMINI_KEY_STORAGE, key);
    updateApiKeyStatusUI(key);
    showToast('Clave API de Gemini guardada de forma segura en tu navegador', 'success');
  } else {
    localStorage.removeItem(GEMINI_KEY_STORAGE);
    updateApiKeyStatusUI('');
    showToast('Clave API eliminada. Activado Modo Local sin clave.', 'info');
  }
}

function loadSampleStrategy() {
  const sample = `- Activo Principal: Nasdaq (NQ1! / MNQ) y EURUSD.
- Sesiones de Operativa: New York Open (09:30 a 11:30 EST) y London Open (03:00 a 05:00 EST).
- Filtro Macro & Noticias: Prohibido abrir posiciones 15 min antes y 15 min después de noticias de alto impacto (CPI, NFP, PPI, FOMC).
- Contexto de Mercado:
  * Identificar Sesgo (Bias) diario en 4H y 1H.
  * Trazar liquidez clave: Asian High/Low, Previous Day High/Low (PDH/PDL).
- Modelo de Entrada A+ (Toma de Liquidez + MSS + FVG):
  1. El precio debe barrer liquidez externa (Asian High o PDH/PDL) con mecha de rechazo.
  2. En 1m o 5m, esperar un Market Structure Shift (MSS / ChoCH) con vela de cuerpo decisivo.
  3. Identificar el FVG (Fair Value Gap) creado por el desplazamiento institucional.
  4. Entrada límite o de confirmación al 50% del FVG (Consequent Encroachment) o retroceso al nivel OTE (62%-79% Fibonacci).
- Gestión de Riesgo & Invalidación Técnica:
  * Stop Loss: Siempre e invariablemente detrás del swing estructural que causó el desplazamiento (máximo 20 puntos en NQ).
  * Criterio de Salida Temprana: Si una vela de 5m cierra con cuerpo pleno vulnerando el FVG de entrada, se cierra manualmente por invalidación técnica.
  * Ratio Riesgo:Beneficio Mínimo: 1:2.
  * Parciales & Breakeven: Al alcanzar 1:2 RR, tomar 50% de ganancia y mover Stop Loss inmediatamente a Breakeven.
  * Take Profit Final: Siguiente zona de liquidez contraria o 1:3 RR.
- Gestión Monetaria & Disciplina:
  * Riesgo máximo por operación: 1% del capital de la cuenta.
  * Máximo de operaciones por sesión: 2 trades.
  * Pérdida máxima diaria permitida: 2% (si tengo 2 Stop Loss seguidos, se apagan pantallas hasta mañana).
- Protocolos de Emergencia & Psicotrading:
  * Si pierdo una entrada válida: NO perseguir el precio con FOMO. Esperar el siguiente ciclo de liquidez.
  * Tras un Stop Loss: Pausa obligatoria de 15 minutos lejos de la pantalla para evitar entrar por revancha (Revenge Trading).`;

  const inputEl = document.getElementById('strategy-raw-input');
  if (inputEl) {
    inputEl.value = sample;
    updateStrategyCharCount();
  }
  const styleSelect = document.getElementById('strategy-style-select');
  if (styleSelect) {
    styleSelect.value = 'SMC / ICT & Order Flow';
  }
  showToast('Plantilla de ejemplo institucional cargada', 'info');
}

function clearStrategyInput() {
  const inputEl = document.getElementById('strategy-raw-input');
  if (inputEl) {
    inputEl.value = '';
    updateStrategyCharCount();
    inputEl.focus();
  }
}

// System prompt institucional para el Playbook
function buildPlaybookSystemPrompt(style) {
  return `Eres un Trader Institucional Cuantitativo y Gestor de Riesgos de un Fondo de Cobertura (Hedge Fund).
Tu objetivo es tomar notas de trading desordenadas, reglas empíricas o pensamientos de un trader, y estructurarlos en un PLAYBOOK DE TRADING MAESTRO riguroso, formal y de nivel profesional.

El documento resultante debe estar estrictamente optimizado como FUENTE DE CONOCIMIENTO PARA GOOGLE NOTEBOOKLM, permitiendo que la IA audite posteriormente las bitácoras y trades del usuario contrastándolos contra este playbook.

REGLAS DE FORMATO Y ESTRUCTURA OBLIGATORIAS:
- Utiliza Markdown limpio, encabezados bien jerarquizados (#, ##, ###) y listas con viñetas claras.
- Estilo Operativo Seleccionado: ${style}.
- Sé específico, directo y elimina cualquier ambigüedad.
- Si el usuario omitió detalles vitales (como reglas de breakeven, noticias o gestión psicológica), infiere la mejor práctica institucional acorde a su estilo y márcala claramente con la etiqueta [RECOMENDACIÓN INSTITUCIONAL].

Estructura obligatoria del documento:
# PLAYBOOK DE TRADING INSTITUCIONAL: [NOMBRE O ESTILO DE ESTRATEGIA]
> **Propósito:** Documento de gobernanza operativa para auditoría algorítmica y psicotrading en Google NotebookLM.

## 1. PARÁMETROS OPERATIVOS & CONTEXTO DE MERCADO
- **Activos Autorizados:** [Lista de activos]
- **Sesiones & Horarios de Alta Probabilidad:** [Horarios exactos]
- **Filtros Macro & Noticias de Alto Impacto:** [Reglas estrictas ante noticias]
- **Definición de Sesgo (Market Bias):** [Cómo se determina la dirección diaria]

## 2. MODELOS DE ENTRADA & SETUPS A+
- **Fase 1: Condición de Liquidez Previa:** [De dónde viene la liquidez]
- **Fase 2: Confirmación Estructural:** [Qué patrón o quiebre técnico se exige]
- **Fase 3: Gatillo & Zona de Ejecución:** [Punto exacto de entrada]

## 3. GESTIÓN DE RIESGO & CRITERIOS DE INVALIDACIÓN (NO NEGOCIABLES)
- **Ubicación Técnica del Stop Loss:** [Regla invariable de colocación]
- **Criterios de Invalidación Prematura:** [Cuándo cerrar antes de tocar SL]
- **Gestión de Ganancias (Parciales & Breakeven):** [Cuándo tomar beneficios y mover a 0]
- **Riesgo Máximo por Operación:** [% o $]
- **Límite de Pérdida Diaria (Daily Loss Limit):** [Límite máximo permitido antes de bloquear la sesión]
- **Máximo de Trades Permitidos por Sesión:** [Cantidad]

## 4. PROTOCOLOS DE EMERGENCIA & PSICOTRADING
- **Protocolo Anti-FOMO:** [Si pierdo una entrada, comando automático]
- **Protocolo Post-Pérdida (Anti-Revenge):** [Comando obligatorio tras un Stop Loss]
- **Límite de Racha Negativa:** [Qué hacer ante 2 pérdidas seguidas]

## 5. CHECKLIST PRE-TRADE (FILTRO DE 5 PUNTOS)
- [ ] 1. ¿El horario y las noticias permiten operar?
- [ ] 2. ¿El activo se encuentra en una zona de liquidez clave?
- [ ] 3. ¿Existe confirmación estructural clara en temporalidad operativa?
- [ ] 4. ¿El Stop Loss técnico respeta mi límite de riesgo máximo?
- [ ] 5. ¿Acepto la pérdida de este trade con total calma y sin apego emocional?

## 6. PREGUNTAS DE AUDITORÍA RECOMENDADAS PARA NOTEBOOKLM
- "¿En qué trades de mis bitácoras violé los criterios de invalidación técnica de este Playbook?"
- "¿Las pérdidas acumuladas se debieron al riesgo natural del setup o a indisciplina operativa?"
- "¿Cuál de mis sesiones tuvo la mayor desviación entre mi plan escrito y las operaciones ejecutadas?"`;
}

// Generador Heurístico Local Inteligente (100% Offline y Gratis sin API Key)
function generateLocalPlaybook(rawText, style) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const buckets = {
    assets: [],
    sessions: [],
    news: [],
    bias: [],
    setups: [],
    riskSl: [],
    exits: [],
    psychology: []
  };

  const uncategorized = [];

  lines.forEach(line => {
    const clean = line.replace(/^[-*•0-9.)\s]+/, '').trim();
    if (!clean) return;
    const lower = clean.toLowerCase();

    if (lower.includes('activo') || lower.includes('par') || lower.includes('nq') || lower.includes('es') || lower.includes('eurusd') || lower.includes('gbpusd') || lower.includes('oro') || lower.includes('gold') || lower.includes('crypto') || lower.includes('btc') || lower.includes('nasdaq')) {
      buckets.assets.push(clean);
    } else if (lower.includes('sesion') || lower.includes('sesión') || lower.includes('hora') || lower.includes('horario') || lower.includes('london') || lower.includes('ny') || lower.includes('new york') || lower.includes('asia') || lower.includes('apertura') || lower.includes('campana')) {
      buckets.sessions.push(clean);
    } else if (lower.includes('noticia') || lower.includes('cpi') || lower.includes('nfp') || lower.includes('fomc') || lower.includes('fed') || lower.includes('macro') || lower.includes('calendario') || lower.includes('impacto')) {
      buckets.news.push(clean);
    } else if (lower.includes('bias') || lower.includes('sesgo') || lower.includes('tendencia') || lower.includes('direcc') || lower.includes('4h') || lower.includes('1h') || lower.includes('diario') || lower.includes('daily')) {
      buckets.bias.push(clean);
    } else if (lower.includes('stop') || lower.includes('sl') || lower.includes('invalida') || lower.includes('riesgo') || lower.includes('pérdida') || lower.includes('perdida') || lower.includes('drawdown') || lower.includes('lot') || lower.includes('capital') || lower.includes('máximo') || lower.includes('maximo')) {
      buckets.riskSl.push(clean);
    } else if (lower.includes('tp') || lower.includes('target') || lower.includes('parcial') || lower.includes('breakeven') || lower.includes('be ') || lower.includes('r:r') || lower.includes('beneficio') || lower.includes('salida') || lower.includes('ratio')) {
      buckets.exits.push(clean);
    } else if (lower.includes('fomo') || lower.includes('revancha') || lower.includes('revenge') || lower.includes('emocion') || lower.includes('emoción') || lower.includes('calma') || lower.includes('psico') || lower.includes('tilt') || lower.includes('paciencia') || lower.includes('regla') || lower.includes('caminar') || lower.includes('apagar')) {
      buckets.psychology.push(clean);
    } else if (lower.includes('fvg') || lower.includes('liquidez') || lower.includes('mss') || lower.includes('choch') || lower.includes('setup') || lower.includes('entrada') || lower.includes('gatillo') || lower.includes('vela') || lower.includes('confirmac') || lower.includes('rompe') || lower.includes('soporte') || lower.includes('resistencia') || lower.includes('patron') || lower.includes('patrón') || lower.includes('ote') || lower.includes('fib')) {
      buckets.setups.push(clean);
    } else {
      uncategorized.push(clean);
    }
  });

  const formatList = (items, fallbackText) => {
    if (items.length === 0) return `- ${fallbackText} *(Recomendación Institucional)*`;
    return items.map(i => `- ${i}`).join('\n');
  };

  const md = `# PLAYBOOK DE TRADING INSTITUCIONAL: ${style.toUpperCase()}
> **Propósito:** Documento de gobernanza operativa para auditoría algorítmica y psicotrading en Google NotebookLM.
> **Modo de Generación:** Motor Local Inteligente ($0 Costo - Procesado en tu navegador).

---

## 1. PARÁMETROS OPERATIVOS & CONTEXTO DE MERCADO
### Activos Autorizados
${formatList(buckets.assets, 'Operar exclusivamente en activos de alta liquidez definidos en la sesión (ej: NQ1!, ES1!, EURUSD)')}

### Sesiones & Horarios de Alta Probabilidad
${formatList(buckets.sessions, 'Operar únicamente durante las ventanas de volumen institucional (New York Open 09:30-11:30 EST o London Open 03:00-05:00 EST)')}

### Filtros Macro & Noticias de Alto Impacto
${formatList(buckets.news, 'Prohibido abrir posiciones 15 minutos antes y 15 minutos después de eventos de alto impacto (CPI, NFP, FOMC)')}

### Definición de Sesgo (Market Bias)
${formatList(buckets.bias, 'Determinar el sesgo direccional en temporalidad de 4H y 1H mediante la estructura de máximos/mínimos y flujo de órdenes')}

---

## 2. MODELOS DE ENTRADA & SETUPS A+
### Condiciones Técnicas & Gatillo de Ejecución
${formatList(buckets.setups, 'Esperar toma de liquidez previa + desplazamiento institucional + confirmación en temporalidad menor (1m/5m)')}

${uncategorized.length > 0 ? `### Reglas y Consideraciones Adicionales\n${uncategorized.map(u => `- ${u}`).join('\n')}` : ''}

---

## 3. GESTIÓN DE RIESGO & CRITERIOS DE INVALIDACIÓN (NO NEGOCIABLES)
### Ubicación de Stop Loss & Criterios de Salida
${formatList(buckets.riskSl, 'El Stop Loss se coloca invariablemente detrás del swing estructural de validación. Nunca mover el Stop Loss en contra')}

### Gestión de Ganancias (Parciales & Breakeven)
${formatList(buckets.exits, 'Ratio mínimo 1:2 RR. Al alcanzar 1:2 RR, tomar parciales (50%) y mover Stop Loss inmediatamente a Breakeven')}

---

## 4. PROTOCOLOS DE EMERGENCIA & PSICOTRADING
### Reglas Psicológicas & Control de Tilt
${formatList(buckets.psychology, 'Prohibido operar por revancha (Revenge Trading). Si se pierden 2 operaciones consecutivas, cerrar la plataforma por el resto del día')}

---

## 5. CHECKLIST PRE-TRADE (FILTRO DE 5 PUNTOS)
- [ ] 1. ¿El horario y el calendario de noticias permiten operar hoy?
- [ ] 2. ¿El precio se encuentra en una zona de liquidez clave o nivel institucional?
- [ ] 3. ¿Existe confirmación y gatillo técnico según las reglas de mi setup?
- [ ] 4. ¿El Stop Loss técnico respeta mi límite de pérdida monetaria estricto?
- [ ] 5. ¿Acepto el riesgo del trade con total serenidad y sin apego emocional?

---

## 6. PREGUNTAS DE AUDITORÍA RECOMENDADAS PARA NOTEBOOKLM
- "¿En qué operaciones registradas en mis bitácoras violé las reglas de Stop Loss o entrada de este Playbook?"
- "¿Las pérdidas acumuladas de este periodo provinieron de fallos del setup o de errores de ejecución emocional (FOMO/venganza)?"
- "¿Qué sesión y horario específico registraron la mejor tasa de acierto y respeto al plan según mis datos?"`;

  return md;
}

// Generador Dual: con Gemini API si hay clave o Modo Local si no hay clave
async function generateAIPlaybook() {
  const rawInputEl = document.getElementById('strategy-raw-input');
  const styleSelect = document.getElementById('strategy-style-select');
  const rawText = rawInputEl ? rawInputEl.value.trim() : '';
  const style = styleSelect ? styleSelect.value : 'SMC / ICT & Order Flow';

  if (!rawText || rawText.length < 20) {
    showToast('Por favor escribe o pega tus notas de estrategia (mínimo 20 caracteres) o carga el ejemplo.', 'warning');
    if (rawInputEl) rawInputEl.focus();
    return;
  }

  const apiKey = (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
  const btn = document.getElementById('btn-generate-playbook');
  const btnText = document.getElementById('generate-btn-text');
  const originalHtml = btnText ? btnText.innerHTML : '';

  // CASO 1: SIN API KEY -> MODO LOCAL INTELIGENTE ($0 COSTO, SIN REGISTRO)
  if (!apiKey) {
    try {
      if (btn) btn.disabled = true;
      if (btnText) {
        btnText.innerHTML = '<i class="fa-solid fa-bolt"></i> Estructurando en Modo Local...';
      }

      await new Promise(resolve => setTimeout(resolve, 350)); // feedback visual suave

      const localMarkdown = generateLocalPlaybook(rawText, style);

      strategyState.rawInput = rawText;
      strategyState.style = style;
      strategyState.markdown = localMarkdown;
      strategyState.updatedAt = new Date().toISOString();

      const editorEl = document.getElementById('playbook-raw-markdown');
      if (editorEl) editorEl.value = localMarkdown;

      renderPlaybookMarkdown(localMarkdown);
      switchPlaybookView('preview');
      savePlaybookToStorage();

      showToast('⚡ ¡Playbook estructurado con éxito (Modo Local sin API)! Listo para NotebookLM.', 'success');
    } catch (err) {
      console.error('Error en modo local:', err);
      showToast('Error al estructurar el playbook local', 'danger');
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.innerHTML = originalHtml;
    }
    return;
  }

  // CASO 2: CON API KEY -> GOOGLE GEMINI CON FALLBACK AL MODO LOCAL
  try {
    if (btn) btn.disabled = true;
    if (btnText) {
      btnText.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Analizando con IA (Google Gemini)...';
    }

    const systemInstruction = buildPlaybookSystemPrompt(style);
    const userPromptText = `Aquí están mis notas y reglas brutas de trading para que las estructures en mi Playbook Institucional:\n\n${rawText}`;

    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    let generatedMarkdown = null;
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\n---\n\n${userPromptText}` }]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4096
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Error ${response.status}: ${response.statusText}`;
          throw new Error(errMsg);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          generatedMarkdown = data.candidates[0].content.parts[0].text;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Falló modelo ${model}:`, err.message);
      }
    }

    if (!generatedMarkdown) {
      throw lastError || new Error('No se pudo obtener respuesta de la API de Gemini');
    }

    strategyState.rawInput = rawText;
    strategyState.style = style;
    strategyState.markdown = generatedMarkdown;
    strategyState.updatedAt = new Date().toISOString();

    const editorEl = document.getElementById('playbook-raw-markdown');
    if (editorEl) editorEl.value = generatedMarkdown;

    renderPlaybookMarkdown(generatedMarkdown);
    switchPlaybookView('preview');
    savePlaybookToStorage();

    showToast('✨ ¡Playbook Institucional generado con IA (Gemini) con éxito!', 'success');

  } catch (error) {
    console.warn('Fallo llamada a Gemini API, activando fallback local:', error);
    showToast(`Gemini API: ${error.message}. Activando Modo Local Automático...`, 'warning');

    // Fallback inmediato a Modo Local para no dejar al usuario bloqueado
    const localMarkdown = generateLocalPlaybook(rawText, style);
    strategyState.rawInput = rawText;
    strategyState.style = style;
    strategyState.markdown = localMarkdown;
    strategyState.updatedAt = new Date().toISOString();

    const editorEl = document.getElementById('playbook-raw-markdown');
    if (editorEl) editorEl.value = localMarkdown;

    renderPlaybookMarkdown(localMarkdown);
    switchPlaybookView('preview');
    savePlaybookToStorage();
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.innerHTML = originalHtml;
  }
}

// Copiar Prompt Maestro para usar en ChatGPT / Claude / Gemini Web
function copyMasterStrategyPrompt() {
  const rawInputEl = document.getElementById('strategy-raw-input');
  const styleSelect = document.getElementById('strategy-style-select');
  const rawText = rawInputEl ? rawInputEl.value.trim() : '';
  const style = styleSelect ? styleSelect.value : 'SMC / ICT & Order Flow';

  const userNotes = rawText || '[PEGA AQUÍ TUS REGLAS, HORARIOS, SETUPS Y LÍMITES DE RIESGO]';
  const systemPrompt = buildPlaybookSystemPrompt(style);

  const fullPrompt = `${systemPrompt}

================================================================================
AQUÍ ESTÁN MIS NOTAS Y REGLAS OPERATIVAS PARA ESTRUCTURAR MI PLAYBOOK:
================================================================================
${userNotes}

Por favor genera el Playbook en Markdown completo siguiendo la estructura institucional requerida.`;

  navigator.clipboard.writeText(fullPrompt).then(() => {
    showToast('📋 ¡Prompt Maestro copiado! Pégalo en ChatGPT, Claude o Gemini Web y luego copia el resultado aquí.', 'success');
    switchPlaybookView('edit');
    const editorEl = document.getElementById('playbook-raw-markdown');
    if (editorEl) editorEl.focus();
  }).catch(() => {
    showToast('No se pudo copiar automáticamente al portapapeles', 'warning');
  });
}

// Switcher entre vista visual y editor markdown
function switchPlaybookView(viewMode) {
  const previewTabBtn = document.getElementById('btn-tab-preview');
  const editTabBtn = document.getElementById('btn-tab-edit');
  const previewContainer = document.getElementById('playbook-preview-container');
  const editorTextarea = document.getElementById('playbook-raw-markdown');

  if (viewMode === 'preview') {
    if (previewTabBtn) previewTabBtn.classList.add('active');
    if (editTabBtn) editTabBtn.classList.remove('active');
    if (previewContainer) previewContainer.style.display = 'block';
    if (editorTextarea) editorTextarea.style.display = 'none';

    // Sincronizar cambios si el usuario editó en modo textarea
    if (editorTextarea) {
      renderPlaybookMarkdown(editorTextarea.value);
    }
  } else {
    if (editTabBtn) editTabBtn.classList.add('active');
    if (previewTabBtn) previewTabBtn.classList.remove('active');
    if (editorTextarea) editorTextarea.style.display = 'block';
    if (previewContainer) previewContainer.style.display = 'none';
    if (editorTextarea) editorTextarea.focus();
  }
}

function syncPlaybookEdit() {
  const editorEl = document.getElementById('playbook-raw-markdown');
  if (editorEl) {
    strategyState.markdown = editorEl.value;
  }
}

// Conversor ligero y seguro de Markdown a HTML para el visor
function renderPlaybookMarkdown(markdown) {
  const emptyState = document.getElementById('playbook-empty-state');
  const contentBody = document.getElementById('playbook-rendered-content');
  if (!contentBody) return;

  if (!markdown || !markdown.trim()) {
    if (emptyState) emptyState.style.display = 'flex';
    contentBody.style.display = 'none';
    contentBody.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  contentBody.style.display = 'block';

  // Sanitizado básico y traducción de sintaxis Markdown
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Encabezados
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^\&gt; (.*$)/gim, '<blockquote>$1</blockquote>');

  // Negritas y cursivas
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Checklists y listas
  html = html.replace(/^- \[ \] (.*$)/gim, '<div style="margin: 4px 0; display:flex; align-items:center; gap:6px;"><input type="checkbox" disabled style="margin:0;"> <span>$1</span></div>');
  html = html.replace(/^- \[x\] (.*$)/gim, '<div style="margin: 4px 0; display:flex; align-items:center; gap:6px;"><input type="checkbox" checked disabled style="margin:0;"> <span>$1</span></div>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

  // Envolver <li> contiguos en <ul>
  html = html.replace(/(<li>.*<\/li>)/gims, (match) => {
    return `<ul>${match}</ul>`;
  });

  // Código en línea
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

  // Saltos de línea en párrafos
  html = html.replace(/\n\n+/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-3]>)/g, '$1');
  html = html.replace(/(<\/h[1-3]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>.*<\/blockquote>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>.*<\/ul>)<\/p>/g, '$1');

  contentBody.innerHTML = html;
}

// Descargar Playbook en formato .MD para NotebookLM
function downloadPlaybookMD() {
  const editorEl = document.getElementById('playbook-raw-markdown');
  const markdown = editorEl ? editorEl.value.trim() : (strategyState.markdown || '');

  if (!markdown) {
    showToast('Primero genera o redacta tu Playbook antes de descargarlo.', 'warning');
    return;
  }

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const cleanDate = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `Playbook_Estrategia_Trading_NotebookLM_${cleanDate}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('📥 Archivo Markdown descargado. ¡Listo para subir como fuente a NotebookLM!', 'success');
}

// Descargar Playbook en formato .TXT para NotebookLM
function downloadPlaybookTXT() {
  const editorEl = document.getElementById('playbook-raw-markdown');
  const markdown = editorEl ? editorEl.value.trim() : (strategyState.markdown || '');

  if (!markdown) {
    showToast('Primero genera o redacta tu Playbook antes de descargarlo.', 'warning');
    return;
  }

  const blob = new Blob([markdown], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const cleanDate = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `Playbook_Estrategia_Trading_NotebookLM_${cleanDate}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('📄 Archivo de texto plano (.txt) descargado para NotebookLM.', 'success');
}

// Copiar todo el Markdown generado al portapapeles
function copyPlaybookMarkdown() {
  const editorEl = document.getElementById('playbook-raw-markdown');
  const markdown = editorEl ? editorEl.value.trim() : (strategyState.markdown || '');

  if (!markdown) {
    showToast('No hay contenido para copiar.', 'warning');
    return;
  }

  navigator.clipboard.writeText(markdown).then(() => {
    showToast('📋 Playbook copiado al portapapeles.', 'success');
  }).catch(() => {
    showToast('No se pudo copiar automáticamente', 'warning');
  });
}

// Guardar Playbook en localStorage y opcionalmente en Supabase
async function savePlaybookAction() {
  const rawInputEl = document.getElementById('strategy-raw-input');
  const styleSelect = document.getElementById('strategy-style-select');
  const editorEl = document.getElementById('playbook-raw-markdown');

  strategyState.rawInput = rawInputEl ? rawInputEl.value : '';
  strategyState.style = styleSelect ? styleSelect.value : 'SMC / ICT & Order Flow';
  strategyState.markdown = editorEl ? editorEl.value : '';
  strategyState.updatedAt = new Date().toISOString();

  savePlaybookToStorage();

  // Sincronizar con Supabase si está logueado
  if (supabaseClient && currentAuthUser) {
    try {
      const payload = {
        id: `playbook_${currentAuthUser.id}`,
        user_id: currentAuthUser.id,
        title: 'Mi Playbook Operativo',
        style: strategyState.style,
        raw_input: strategyState.rawInput,
        markdown_content: strategyState.markdown,
        updated_at: strategyState.updatedAt
      };

      const { error } = await supabaseClient
        .from('trading_playbooks')
        .upsert(payload, { onConflict: 'id' });

      if (!error) {
        showToast('💾 Playbook guardado localmente y sincronizado en Supabase Cloud', 'success');
        return;
      }
    } catch (e) {
      console.warn('Error al sincronizar playbook con Supabase:', e);
    }
  }

  showToast('💾 Playbook guardado en este navegador', 'success');
}

function savePlaybookToStorage() {
  try {
    localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(strategyState));
  } catch (e) {
    console.warn('Error al guardar en localStorage', e);
  }
}

async function loadPlaybookFromStorage() {
  // 1. Intentar cargar desde localStorage
  try {
    const raw = localStorage.getItem(STRATEGY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      strategyState = Object.assign(strategyState, parsed);
    }
  } catch (e) {
    console.warn('Error al leer playbook de localStorage', e);
  }

  // 2. Si está logueado en Supabase, verificar si hay versión más reciente en la nube
  if (supabaseClient && currentAuthUser) {
    try {
      const { data, error } = await supabaseClient
        .from('trading_playbooks')
        .select('*')
        .eq('user_id', currentAuthUser.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        strategyState.rawInput = data.raw_input || strategyState.rawInput;
        strategyState.style = data.style || strategyState.style;
        strategyState.markdown = data.markdown_content || strategyState.markdown;
        strategyState.updatedAt = data.updated_at;
      }
    } catch (e) {
      console.warn('No se pudo cargar playbook de Supabase:', e);
    }
  }

  // 3. Reflejar en la UI
  const rawInputEl = document.getElementById('strategy-raw-input');
  if (rawInputEl && strategyState.rawInput) {
    rawInputEl.value = strategyState.rawInput;
    updateStrategyCharCount();
  }

  const styleSelect = document.getElementById('strategy-style-select');
  if (styleSelect && strategyState.style) {
    styleSelect.value = strategyState.style;
  }

  const editorEl = document.getElementById('playbook-raw-markdown');
  if (editorEl && strategyState.markdown) {
    editorEl.value = strategyState.markdown;
  }

  if (strategyState.markdown) {
    renderPlaybookMarkdown(strategyState.markdown);
  }
}

// Copiar prompts de la guía con feedback visual en la tarjeta