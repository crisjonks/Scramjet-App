/* ── PYSIUM index.js ── */

const SEARCH_ENGINE  = 'https://www.google.com/search?q=%s';
const PANIC_URL      = 'https://classroom.google.com';
const CLOAK_DEFAULTS = { title: 'Google Drive', favicon: 'https://drive.google.com/favicon.ico' };
const PROXY_PREFIX   = '/scram/';   // Scramjet default — change if your config differs

let tabs        = [];
let activeTabId = null;
let cloakEnabled = true;
let controller  = null;

// ─── SCRAMJET INIT ────────────────────────────────────────────────────
async function initScramjet() {
  try {
    if (typeof ScramjetController !== 'undefined') {
      controller = new ScramjetController({
        prefix: PROXY_PREFIX,
        files: {
          wasm:   '/scram/scramjet.wasm.js',
          worker: '/scram/scramjet.worker.js',
          client: '/scram/scramjet.client.js',
          shared: '/scram/scramjet.shared.js',
          sync:   '/scram/scramjet.sync.js',
        }
      });
      await controller.init();
    }
  } catch (e) {
    console.warn('[pysium] ScramjetController init failed:', e);
  }
}

function encodeURL(url) {
  // Use Scramjet's encoder if available, otherwise base64-style fallback
  try {
    if (controller && controller.encodeUrl) return controller.encodeUrl(url);
    if (typeof __scramjet$config !== 'undefined' && __scramjet$config.codec) {
      return PROXY_PREFIX + __scramjet$config.codec.encode(url);
    }
  } catch {}
  // plain prefix + encoded URI as last resort
  return PROXY_PREFIX + encodeURIComponent(url);
}

// ─── URL HELPERS ──────────────────────────────────────────────────────
function isValidURL(str) {
  try { const u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}

function resolveInput(raw) {
  raw = raw.trim();
  if (!raw) return null;
  if (isValidURL(raw)) return raw;
  if (!raw.includes(' ') && raw.includes('.')) {
    const attempt = 'https://' + raw;
    if (isValidURL(attempt)) return attempt;
  }
  return SEARCH_ENGINE.replace('%s', encodeURIComponent(raw));
}

function buildProxyURL(raw) {
  const real = resolveInput(raw);
  if (!real) return null;
  return encodeURL(real);
}

function decodeProxiedURL(src) {
  if (!src) return '';
  try {
    if (controller && controller.decodeUrl) return controller.decodeUrl(src);
    if (src.includes(PROXY_PREFIX)) {
      const after = src.slice(src.indexOf(PROXY_PREFIX) + PROXY_PREFIX.length);
      try { return decodeURIComponent(after); } catch { return after; }
    }
  } catch {}
  return src;
}

// ─── CLOAK ────────────────────────────────────────────────────────────
function applyCloak(title, faviconUrl) {
  document.title = title || CLOAK_DEFAULTS.title;
  const link = document.getElementById('cloak-favicon');
  if (link) link.href = faviconUrl || CLOAK_DEFAULTS.favicon;
}

function loadCloakSettings() {
  const s = JSON.parse(localStorage.getItem('pysium_cloak') || '{}');
  cloakEnabled = s.enabled !== false;
  const title   = s.title   || CLOAK_DEFAULTS.title;
  const favicon = s.favicon || CLOAK_DEFAULTS.favicon;
  document.getElementById('cloak-toggle').checked        = cloakEnabled;
  document.getElementById('cloak-title').value           = title;
  document.getElementById('cloak-favicon-url').value     = favicon;
  document.getElementById('cloak-auto-toggle').checked   = s.autoCloak !== false;
  if (cloakEnabled) applyCloak(title, favicon);
}

function saveCloakSettings() {
  const title   = document.getElementById('cloak-title').value.trim()       || CLOAK_DEFAULTS.title;
  const favicon = document.getElementById('cloak-favicon-url').value.trim() || CLOAK_DEFAULTS.favicon;
  cloakEnabled  = document.getElementById('cloak-toggle').checked;
  const autoCloak = document.getElementById('cloak-auto-toggle').checked;
  localStorage.setItem('pysium_cloak', JSON.stringify({ enabled: cloakEnabled, title, favicon, autoCloak }));
  if (cloakEnabled) applyCloak(title, favicon);
  else { document.title = 'Pysium'; document.getElementById('cloak-favicon').href = 'favicon.webp'; }
}

// ─── TABS ─────────────────────────────────────────────────────────────
let _tabCounter = 0;
function createTab(url = null) {
  const id  = ++_tabCounter;
  const tab = { id, title: 'New Tab', favicon: null, url: '', history: [], historyIdx: -1 };
  tabs.push(tab);
  renderTabBar();
  switchTab(id);
  if (url) navigateTo(url, id);
  return id;
}

function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx === -1) return;
  tabs.splice(idx, 1);
  if (tabs.length === 0) { createTab(); return; }
  if (activeTabId === id) switchTab(tabs[Math.min(idx, tabs.length - 1)].id);
  else renderTabBar();
}

function switchTab(id) {
  activeTabId = id;
  renderTabBar();
  const tab   = tabs.find(t => t.id === id);
  if (!tab) return;
  const frame = document.getElementById('proxy-frame');
  const home  = document.getElementById('home-page');
  const bar   = document.getElementById('address-bar');
  if (tab.url) {
    home.style.display  = 'none';
    frame.style.display = 'block';
    const proxied = buildProxyURL(tab.url);
    if (proxied && frame.src !== proxied) frame.src = proxied;
    bar.value = tab.url;
  } else {
    home.style.display  = 'flex';
    frame.style.display = 'none';
    frame.src = 'about:blank';
    bar.value = '';
  }
}

function renderTabBar() {
  const list = document.getElementById('tab-list');
  list.innerHTML = '';
  tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');

    const fav = document.createElement('img');
    fav.className = 'tab-favicon';
    fav.src = tab.favicon || `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236ee7b7' stroke-width='1.5'><circle cx='12' cy='12' r='9'/><path d='M2 12h20M12 3a15 15 0 010 18M12 3a15 15 0 000 18'/></svg>`;
    fav.onerror = () => { fav.style.display = 'none'; };

    const ttl = document.createElement('span');
    ttl.className = 'tab-title';
    ttl.textContent = tab.title || 'New Tab';

    const cls = document.createElement('button');
    cls.className = 'tab-close';
    cls.innerHTML = '&times;';
    cls.addEventListener('click', e => { e.stopPropagation(); closeTab(tab.id); });

    el.append(fav, ttl, cls);
    el.addEventListener('click', () => switchTab(tab.id));
    list.appendChild(el);
  });
}

// ─── NAVIGATION ───────────────────────────────────────────────────────
function navigateTo(raw, tabId = activeTabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  raw = (raw || '').trim();
  if (!raw) { goHome(); return; }

  const real = resolveInput(raw);
  if (!real) return;

  tab.url = real;
  tab.history = tab.history.slice(0, tab.historyIdx + 1);
  tab.history.push(real);
  tab.historyIdx = tab.history.length - 1;

  const frame = document.getElementById('proxy-frame');
  const home  = document.getElementById('home-page');
  const bar   = document.getElementById('address-bar');

  const proxied = encodeURL(real);
  home.style.display  = 'none';
  frame.style.display = 'block';
  frame.src = proxied;
  bar.value = real;
}

function goHome() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab) { tab.url = ''; switchTab(activeTabId); }
}

// ─── IFRAME META DETECTION ────────────────────────────────────────────
document.getElementById('proxy-frame').addEventListener('load', function () {
  const frame = this;
  const tab   = tabs.find(t => t.id === activeTabId);
  if (!tab || !tab.url) return;

  // Try reading proxied document (works if same-origin via proxy)
  try {
    const fdoc = frame.contentDocument || frame.contentWindow?.document;
    if (fdoc && fdoc.title) {
      tab.title = fdoc.title.trim().slice(0, 40);
    }
    const icon = fdoc && fdoc.querySelector('link[rel~="icon"], link[rel~="shortcut"]');
    if (icon && icon.href) tab.favicon = icon.href;
  } catch {}

  // Update address bar from actual frame src
  try {
    const real = decodeProxiedURL(frame.src);
    if (real && real !== tab.url) {
      tab.url = real;
      document.getElementById('address-bar').value = real;
    }
  } catch {}

  renderTabBar();
});

// ─── FULLSCREEN (page shell, not just iframe) ─────────────────────────
document.getElementById('fullscreen-btn').addEventListener('click', () => {
  const target = document.documentElement; // full page
  if (!document.fullscreenElement) {
    (target.requestFullscreen || target.webkitRequestFullscreen || (() => {})).call(target);
    document.getElementById('fullscreen-btn').title = 'Exit Fullscreen';
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
    document.getElementById('fullscreen-btn').title = 'Fullscreen';
  }
});
document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('fullscreen-btn');
  const isFs = !!document.fullscreenElement;
  btn.innerHTML = isFs
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>`;
});

// ─── TOP BAR WIRING ───────────────────────────────────────────────────
document.getElementById('home-btn').addEventListener('click', goHome);

document.getElementById('back-btn').addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab || tab.historyIdx <= 0) return;
  tab.historyIdx--;
  tab.url = tab.history[tab.historyIdx];
  const proxied = encodeURL(tab.url);
  document.getElementById('proxy-frame').src = proxied;
  document.getElementById('address-bar').value = tab.url;
});

document.getElementById('forward-btn').addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab || tab.historyIdx >= tab.history.length - 1) return;
  tab.historyIdx++;
  tab.url = tab.history[tab.historyIdx];
  const proxied = encodeURL(tab.url);
  document.getElementById('proxy-frame').src = proxied;
  document.getElementById('address-bar').value = tab.url;
});

document.getElementById('reload-btn').addEventListener('click', () => {
  const f = document.getElementById('proxy-frame');
  try { f.contentWindow.location.reload(); } catch { if (f.src) f.src = f.src; }
});

document.getElementById('address-bar').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); navigateTo(e.target.value); }
});

// ─── HOME SEARCH ──────────────────────────────────────────────────────
document.getElementById('sj-form').addEventListener('submit', e => e.preventDefault());
document.getElementById('sj-address').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const v = document.getElementById('sj-address').value.trim();
    if (v) { navigateTo(v); document.getElementById('sj-address').value = ''; }
  }
});

// ─── SHORTCUTS ────────────────────────────────────────────────────────
document.querySelectorAll('.shortcut').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    if (a.dataset.url) navigateTo(a.dataset.url);
  });
});

// ─── NEW TAB ──────────────────────────────────────────────────────────
document.getElementById('new-tab-btn').addEventListener('click', () => createTab());

// ─── PANIC ────────────────────────────────────────────────────────────
function triggerPanic() { window.location.replace(PANIC_URL); }
document.getElementById('panic-btn').addEventListener('click', triggerPanic);
document.addEventListener('keydown', e => { if (e.altKey && e.key === 'x') triggerPanic(); });

// ─── SETTINGS PANEL ───────────────────────────────────────────────────
function openPanel(id) {
  document.getElementById(id).classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}
function closeAllPanels() {
  document.querySelectorAll('.glass-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('overlay').classList.add('hidden');
}

document.getElementById('settings-fab').addEventListener('click', () => openPanel('settings-panel'));
document.getElementById('overlay').addEventListener('click', closeAllPanels);
document.querySelectorAll('.panel-close').forEach(btn => {
  btn.addEventListener('click', closeAllPanels);
});

// Tab switching inside settings panel
document.querySelectorAll('.stab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.stab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.stab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('stab-' + btn.dataset.tab).classList.add('active');
  });
});

// Preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('cloak-title').value       = btn.dataset.title;
    document.getElementById('cloak-favicon-url').value = btn.dataset.favicon;
  });
});

// Apply cloak
document.getElementById('cloak-apply').addEventListener('click', () => {
  saveCloakSettings();
  closeAllPanels();
});

// Cloak toggle live update
document.getElementById('cloak-toggle').addEventListener('change', function () {
  cloakEnabled = this.checked;
  if (!cloakEnabled) { document.title = 'Pysium'; document.getElementById('cloak-favicon').href = 'favicon.webp'; }
  else {
    const t = document.getElementById('cloak-title').value.trim()       || CLOAK_DEFAULTS.title;
    const f = document.getElementById('cloak-favicon-url').value.trim() || CLOAK_DEFAULTS.favicon;
    applyCloak(t, f);
  }
});

// About:blank cloak
document.getElementById('ab-cloak-btn').addEventListener('click', () => {
  const title   = document.getElementById('cloak-title').value.trim()       || CLOAK_DEFAULTS.title;
  const favicon = document.getElementById('cloak-favicon-url').value.trim() || CLOAK_DEFAULTS.favicon;
  const w = window.open('about:blank', '_blank');
  if (!w) { alert('Popups blocked — allow popups for this site.'); return; }
  w.document.write(`<!doctype html><html><head>
    <title>${title}</title>
    <link rel="icon" href="${favicon}"/>
    <style>*{margin:0;padding:0;border:none;overflow:hidden}html,body,iframe{width:100%;height:100%;display:block}</style>
  </head><body>
    <iframe src="${location.href}" allow="fullscreen" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"></iframe>
  </body></html>`);
  w.document.close();
});

// Panic URL save
document.getElementById('panic-save').addEventListener('click', () => {
  const url = document.getElementById('panic-url-input').value.trim();
  if (url) localStorage.setItem('pysium_panic', url);
  closeAllPanels();
});

// Search engine change
document.getElementById('engine-select').addEventListener('change', function () {
  localStorage.setItem('pysium_engine', this.value);
});

// ─── BATTERY ──────────────────────────────────────────────────────────
async function initBattery() {
  if (!navigator.getBattery) return;
  try {
    const bat = await navigator.getBattery();
    function update() {
      const pct  = Math.round(bat.level * 100);
      const fill = document.getElementById('battery-fill');
      const pctEl = document.getElementById('battery-pct');
      if (pctEl) pctEl.textContent = pct + '%';
      if (fill) {
        fill.setAttribute('width', Math.max(1, Math.round((pct / 100) * 10)));
        fill.style.fill = pct <= 20 ? '#f87171' : pct <= 50 ? '#fbbf24' : '#6ee7b7';
      }
    }
    update();
    bat.addEventListener('levelchange', update);
    bat.addEventListener('chargingchange', update);
  } catch {}
}

// ─── AUTO CLOAK (runs before DOM ready via defer, but as early as possible) ──
(function immediateCloak() {
  try {
    const s = JSON.parse(localStorage.getItem('pysium_cloak') || '{}');
    if (s.enabled !== false && s.autoCloak !== false) {
      document.title = s.title || CLOAK_DEFAULTS.title;
      // favicon can't be set before <link> is in DOM — handled in loadCloakSettings
    }
  } catch {}
})();

// ─── INIT ─────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await initScramjet();
  loadCloakSettings();
  initBattery();

  // Restore saved panic URL
  const savedPanic = localStorage.getItem('pysium_panic');
  if (savedPanic) document.getElementById('panic-url-input').value = savedPanic;

  // Restore search engine
  const savedEngine = localStorage.getItem('pysium_engine');
  if (savedEngine) {
    document.getElementById('engine-select').value = savedEngine;
    document.getElementById('sj-search-engine').value = savedEngine;
  }

  createTab();
});
