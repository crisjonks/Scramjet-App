/* ── PYSIUM index.js ── */

// ─── STATE ────────────────────────────────────────────────────────────
const SEARCH_ENGINE = 'https://www.google.com/search?q=%s';
const PANIC_URL     = 'https://classroom.google.com';
const CLOAK_DEFAULTS = { title: 'Google Drive', favicon: 'https://drive.google.com/favicon.ico' };

let tabs = [];        // { id, title, favicon, url, history, historyIdx }
let activeTabId = null;
let cloakEnabled = true;

// ─── HELPERS ──────────────────────────────────────────────────────────
function isValidURL(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function buildProxyURL(input) {
  input = input.trim();
  if (!input) return null;
  // already a full URL?
  if (isValidURL(input)) return __scramjet$config.prefix + encodeURIComponent(input);
  // looks like a domain? (has dot, no spaces)
  if (!input.includes(' ') && input.includes('.')) {
    const withProto = 'https://' + input;
    if (isValidURL(withProto)) return __scramjet$config.prefix + encodeURIComponent(withProto);
  }
  // treat as search query
  return __scramjet$config.prefix + encodeURIComponent(SEARCH_ENGINE.replace('%s', encodeURIComponent(input)));
}

function scramjetPrefix() {
  // fallback if scramjet not loaded yet
  try { return __scramjet$config.prefix; } catch { return '/scram/'; }
}

function decodeProxiedURL(src) {
  if (!src) return '';
  try {
    const prefix = scramjetPrefix();
    if (src.startsWith(prefix)) return decodeURIComponent(src.slice(prefix.length));
  } catch {}
  return src;
}

// ─── CLOAK ────────────────────────────────────────────────────────────
function applyCloak(title, faviconUrl) {
  if (!cloakEnabled) return;
  document.title = title || CLOAK_DEFAULTS.title;
  const link = document.getElementById('cloak-favicon');
  if (link) link.href = faviconUrl || CLOAK_DEFAULTS.favicon;
}

function loadCloakSettings() {
  const stored = JSON.parse(localStorage.getItem('pysium_cloak') || '{}');
  cloakEnabled = stored.enabled !== false;
  const title   = stored.title   || CLOAK_DEFAULTS.title;
  const favicon = stored.favicon || CLOAK_DEFAULTS.favicon;
  document.getElementById('cloak-toggle').checked = cloakEnabled;
  document.getElementById('cloak-title').value    = title;
  document.getElementById('cloak-favicon-url').value = favicon;
  if (cloakEnabled) applyCloak(title, favicon);
}

function saveCloakSettings() {
  const title   = document.getElementById('cloak-title').value.trim()       || CLOAK_DEFAULTS.title;
  const favicon = document.getElementById('cloak-favicon-url').value.trim() || CLOAK_DEFAULTS.favicon;
  cloakEnabled  = document.getElementById('cloak-toggle').checked;
  localStorage.setItem('pysium_cloak', JSON.stringify({ enabled: cloakEnabled, title, favicon }));
  if (cloakEnabled) applyCloak(title, favicon);
  else { document.title = 'Pysium'; document.getElementById('cloak-favicon').href = 'favicon.webp'; }
}

// ─── TAB MODEL ────────────────────────────────────────────────────────
let _tabCounter = 0;
function createTab(url = null) {
  const id = ++_tabCounter;
  const tab = { id, title: 'New Tab', favicon: null, url: url || '', history: [], historyIdx: -1 };
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
  if (activeTabId === id) {
    const next = tabs[Math.min(idx, tabs.length - 1)];
    switchTab(next.id);
  } else {
    renderTabBar();
  }
}

function switchTab(id) {
  activeTabId = id;
  renderTabBar();
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;
  const frame = document.getElementById('proxy-frame');
  const home  = document.getElementById('home-page');
  const bar   = document.getElementById('address-bar');
  if (tab.url && tab.url !== 'home') {
    home.style.display  = 'none';
    frame.style.display = 'block';
    frame.classList.add('active');
    // Only reload if the frame isn't already on this URL
    const decoded = decodeProxiedURL(frame.src);
    if (decoded !== tab.url) {
      const proxied = buildProxyURL(tab.url);
      if (proxied) frame.src = proxied;
    }
    bar.value = tab.url;
  } else {
    home.style.display  = 'flex';
    frame.style.display = 'none';
    frame.classList.remove('active');
    bar.value = '';
  }
}

// ─── TAB RENDER ───────────────────────────────────────────────────────
function renderTabBar() {
  const list = document.getElementById('tab-list');
  list.innerHTML = '';
  tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');
    el.dataset.id = tab.id;

    // favicon
    const fav = document.createElement('img');
    fav.className = 'tab-favicon';
    fav.src = tab.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23aaa" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>';
    fav.onerror = () => { fav.style.display = 'none'; };

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = tab.title || 'New Tab';

    const close = document.createElement('button');
    close.className = 'tab-close';
    close.textContent = '×';
    close.title = 'Close tab';
    close.addEventListener('click', e => { e.stopPropagation(); closeTab(tab.id); });

    el.append(fav, title, close);
    el.addEventListener('click', () => switchTab(tab.id));
    list.appendChild(el);
  });
}

// ─── NAVIGATION ───────────────────────────────────────────────────────
function navigateTo(input, tabId = activeTabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  input = input.trim();
  if (!input || input === 'home') {
    tab.url = 'home';
    switchTab(tabId);
    return;
  }
  tab.url = input;
  // push history
  tab.history = tab.history.slice(0, tab.historyIdx + 1);
  tab.history.push(input);
  tab.historyIdx = tab.history.length - 1;

  const frame = document.getElementById('proxy-frame');
  const home  = document.getElementById('home-page');
  const bar   = document.getElementById('address-bar');

  const proxied = buildProxyURL(input);
  if (!proxied) return;

  home.style.display  = 'none';
  frame.style.display = 'block';
  frame.classList.add('active');
  frame.src = proxied;
  bar.value = input;
}

// ─── IFRAME TITLE / FAVICON DETECTION ────────────────────────────────
function tryUpdateTabMeta() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab) return;
  const frame = document.getElementById('proxy-frame');
  try {
    const fdoc = frame.contentDocument || frame.contentWindow?.document;
    if (!fdoc) return;

    // title
    const ftitle = fdoc.title;
    if (ftitle && ftitle.trim()) {
      tab.title = ftitle.trim().slice(0, 40);
    }

    // favicon: look for <link rel="icon"> in the proxied page
    const iconLink = fdoc.querySelector('link[rel~="icon"]');
    if (iconLink && iconLink.href) {
      tab.favicon = iconLink.href;
    }
    renderTabBar();
  } catch {
    // cross-origin — can't read; that's fine
  }
}

// ─── FRAME LOAD ───────────────────────────────────────────────────────
document.getElementById('proxy-frame').addEventListener('load', () => {
  tryUpdateTabMeta();
  const frame = document.getElementById('proxy-frame');
  const bar   = document.getElementById('address-bar');
  try {
    const src = frame.src;
    const real = decodeProxiedURL(src);
    if (real && real !== bar.value) bar.value = real;
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) tab.url = real || tab.url;
  } catch {}
});

// ─── TOP BAR BUTTONS ──────────────────────────────────────────────────
document.getElementById('home-btn').addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab) { tab.url = 'home'; switchTab(activeTabId); }
});

document.getElementById('back-btn').addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab || tab.historyIdx <= 0) return;
  tab.historyIdx--;
  tab.url = tab.history[tab.historyIdx];
  const frame = document.getElementById('proxy-frame');
  const proxied = buildProxyURL(tab.url);
  if (proxied) frame.src = proxied;
  document.getElementById('address-bar').value = tab.url;
});

document.getElementById('forward-btn').addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab || tab.historyIdx >= tab.history.length - 1) return;
  tab.historyIdx++;
  tab.url = tab.history[tab.historyIdx];
  const frame = document.getElementById('proxy-frame');
  const proxied = buildProxyURL(tab.url);
  if (proxied) frame.src = proxied;
  document.getElementById('address-bar').value = tab.url;
});

document.getElementById('reload-btn').addEventListener('click', () => {
  const frame = document.getElementById('proxy-frame');
  if (frame.src) frame.src = frame.src;
});

document.getElementById('fullscreen-btn').addEventListener('click', () => {
  const el = document.getElementById('proxy-frame');
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
  }
});

// address bar navigation
document.getElementById('address-bar').addEventListener('keydown', e => {
  if (e.key === 'Enter') navigateTo(e.target.value);
});

// ─── SEARCH FORM (home page) ───────────────────────────────────────────
document.getElementById('sj-form').addEventListener('submit', e => e.preventDefault());
document.getElementById('sj-address').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const val = document.getElementById('sj-address').value;
    navigateTo(val);
    document.getElementById('sj-address').value = '';
  }
});

// ─── SHORTCUTS ────────────────────────────────────────────────────────
document.querySelectorAll('.shortcut').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const url = a.dataset.url;
    if (url) navigateTo(url);
  });
});

// ─── NEW TAB ──────────────────────────────────────────────────────────
document.getElementById('new-tab-btn').addEventListener('click', () => createTab());

// ─── PANIC ────────────────────────────────────────────────────────────
function triggerPanic() {
  window.location.replace(PANIC_URL);
}
document.getElementById('panic-btn').addEventListener('click', triggerPanic);
document.addEventListener('keydown', e => {
  if (e.altKey && e.key === 'x') triggerPanic();
});

// ─── CLOAK PANEL ──────────────────────────────────────────────────────
document.getElementById('cloak-fab').addEventListener('click', () => {
  const panel   = document.getElementById('cloak-panel');
  const overlay = document.getElementById('overlay');
  panel.classList.toggle('hidden');
  overlay.classList.toggle('hidden');
});

document.getElementById('overlay').addEventListener('click', () => {
  document.querySelectorAll('.glass-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('overlay').classList.add('hidden');
});

document.querySelectorAll('.panel-close').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.panel;
    document.getElementById(id)?.classList.add('hidden');
    document.getElementById('overlay').classList.add('hidden');
  });
});

// preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('cloak-title').value       = btn.dataset.title;
    document.getElementById('cloak-favicon-url').value = btn.dataset.favicon;
  });
});

document.getElementById('cloak-apply').addEventListener('click', () => {
  saveCloakSettings();
  document.getElementById('cloak-panel').classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
});

// about:blank cloak
document.getElementById('ab-cloak-btn').addEventListener('click', () => {
  const title   = document.getElementById('cloak-title').value.trim()       || CLOAK_DEFAULTS.title;
  const favicon = document.getElementById('cloak-favicon-url').value.trim() || CLOAK_DEFAULTS.favicon;
  const w = window.open('about:blank', '_blank');
  if (!w) { alert('Pop-up blocked — allow popups for this site.'); return; }
  const iframeSrc = encodeURIComponent(location.href);
  w.document.write(`<!doctype html><html><head>
    <title>${title}</title>
    <link rel="icon" href="${favicon}"/>
    <style>*{margin:0;padding:0;border:none;overflow:hidden}html,body,iframe{width:100%;height:100%;display:block}</style>
  </head><body>
    <iframe src="${location.href}" allow="fullscreen" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"></iframe>
  </body></html>`);
  w.document.close();
});

// cloak toggle live
document.getElementById('cloak-toggle').addEventListener('change', () => {
  cloakEnabled = document.getElementById('cloak-toggle').checked;
  if (!cloakEnabled) {
    document.title = 'Pysium';
    document.getElementById('cloak-favicon').href = 'favicon.webp';
  }
});

// ─── BATTERY ──────────────────────────────────────────────────────────
async function initBattery() {
  if (!navigator.getBattery) return;
  try {
    const bat = await navigator.getBattery();
    function updateBattery() {
      const pct = Math.round(bat.level * 100);
      document.getElementById('battery-pct').textContent = pct + '%';
      // fill rect: max inner width is ~10 (x=4 to x=14 in the SVG, height 6)
      const fillW = Math.max(1, Math.round((pct / 100) * 10));
      const fill = document.getElementById('battery-fill');
      if (fill) {
        fill.setAttribute('width', fillW);
        fill.style.color = pct <= 20 ? '#f87171' : pct <= 50 ? '#fbbf24' : '#6ee7b7';
      }
    }
    updateBattery();
    bat.addEventListener('levelchange', updateBattery);
    bat.addEventListener('chargingchange', updateBattery);
  } catch {}
}

// ─── AUTO-CLOAK ON LOAD ───────────────────────────────────────────────
// Runs immediately so title/favicon change before user sees the page
(function autoCloak() {
  const stored = JSON.parse(localStorage.getItem('pysium_cloak') || '{}');
  if (stored.enabled !== false) {
    document.title = stored.title   || CLOAK_DEFAULTS.title;
    const link = document.getElementById('cloak-favicon');
    if (link) link.href = stored.favicon || CLOAK_DEFAULTS.favicon;
  }
})();

// ─── INIT ─────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadCloakSettings();
  initBattery();
  createTab(); // open first tab (home)
});
