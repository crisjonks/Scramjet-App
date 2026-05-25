/* ── PYSIUM index.js ── */
'use strict';

const CLOAK_DEFAULTS = { title: 'Pysium', favicon: '/favicon.ico' };
let SEARCH_ENGINE = localStorage.getItem('pysium_engine') || 'https://www.google.com/search?q=%s';
let PANIC_URL     = localStorage.getItem('pysium_panic')  || 'https://classroom.google.com';

let tabs         = [];
let activeTabId  = null;
let cloakEnabled = true;
let scramjet     = null;
let connection   = null;
let transportSet = false;

// ── SCRAMJET ──────────────────────────────────────────────────────────
function initScramjet() {
  try {
    scramjet = new ScramjetController({
      files: {
        wasm:   '/scram/scramjet.wasm.wasm',
        worker: '/scram/scramjet.worker.js',
        client: '/scram/scramjet.client.js',
        shared: '/scram/scramjet.shared.js',
        sync:   '/scram/scramjet.sync.js',
      },
    });
    scramjet.init();
    connection = new BareMux.BareMuxConnection('/baremux/worker.js');
    console.log('[pysium] scramjet+baremux ready');
  } catch (e) {
    console.warn('[pysium] scramjet init failed (proxy disabled):', e.message);
  }
}

async function ensureTransport() {
  if (transportSet || !connection) return;
  const wisp = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/wisp/';
  const bare = (location.protocol === 'https:' ? 'https' : 'http') + '://' + location.host + '/bare/';
  const transports = [
    ['/epoxy/index.mjs',  [{ wisp }]],
    ['/libcurl/index.mjs',[{ wisp }]],
    ['/baremod/index.mjs',[bare]],
  ];
  for (const [path, args] of transports) {
    try {
      await connection.setTransport(path, args);
      transportSet = true;
      console.log('[pysium] transport set:', path);
      return;
    } catch {}
  }
  console.warn('[pysium] no transport available');
}

// ── URL HELPERS ───────────────────────────────────────────────────────
function isURL(s) {
  try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}
function resolveInput(raw) {
  raw = (raw || '').trim();
  if (!raw) return null;
  if (isURL(raw)) return raw;
  if (!raw.includes(' ') && raw.includes('.')) {
    const a = 'https://' + raw;
    if (isURL(a)) return a;
  }
  return SEARCH_ENGINE.replace('%s', encodeURIComponent(raw));
}

// ── CLOAK ─────────────────────────────────────────────────────────────
function applyCloak(title, fav) {
  document.title = title || CLOAK_DEFAULTS.title;
  const el = document.getElementById('cloak-favicon');
  if (el) el.href = fav || CLOAK_DEFAULTS.favicon;
}
function loadCloakSettings() {
  const s = JSON.parse(localStorage.getItem('pysium_cloak') || '{}');
  cloakEnabled = s.enabled !== false;
  const title = s.title   || CLOAK_DEFAULTS.title;
  const fav   = s.favicon || CLOAK_DEFAULTS.favicon;
  const auto  = s.autoCloak !== false;
  document.getElementById('cloak-toggle').checked      = cloakEnabled;
  document.getElementById('cloak-title').value         = title;
  document.getElementById('cloak-favicon-url').value   = fav;
  document.getElementById('cloak-auto-toggle').checked = auto;
  if (cloakEnabled && auto) applyCloak(title, fav);
}
function saveCloakSettings() {
  const title = document.getElementById('cloak-title').value.trim()       || CLOAK_DEFAULTS.title;
  const fav   = document.getElementById('cloak-favicon-url').value.trim() || CLOAK_DEFAULTS.favicon;
  cloakEnabled = document.getElementById('cloak-toggle').checked;
  const auto  = document.getElementById('cloak-auto-toggle').checked;
  localStorage.setItem('pysium_cloak', JSON.stringify({ enabled: cloakEnabled, title, favicon: fav, autoCloak: auto }));
  if (cloakEnabled) applyCloak(title, fav);
  else { document.title = 'Pysium'; document.getElementById('cloak-favicon').href = '/favicon.ico'; }
}

// ── TABS ──────────────────────────────────────────────────────────────
let _tid = 0;

function createTab(url) {
  const id = ++_tid;
  let frame = null, iframe = null;

  if (scramjet) {
    try {
      frame  = scramjet.createFrame();
      iframe = frame.frame;
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;display:none;background:#fff;';
      document.getElementById('frame-container').appendChild(iframe);
    } catch (e) {
      console.warn('[pysium] createFrame failed:', e.message);
      frame = null; iframe = null;
    }
  }

  tabs.push({ id, title: 'New Tab', favicon: null, url: '', history: [], historyIdx: -1, frame, iframe });
  renderTabBar();
  switchTab(id);
  if (url) navigateTo(url, id);
  return id;
}

function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx < 0) return;
  const tab = tabs[idx];
  if (tab.iframe) tab.iframe.remove();
  tabs.splice(idx, 1);
  if (!tabs.length) { createTab(); return; }
  if (activeTabId === id) switchTab(tabs[Math.min(idx, tabs.length - 1)].id);
  else renderTabBar();
}

function switchTab(id) {
  activeTabId = id;
  tabs.forEach(t => { if (t.iframe) t.iframe.style.display = 'none'; });
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  const home = document.getElementById('home-page');
  const fc   = document.getElementById('frame-container');
  const bar  = document.getElementById('address-bar');

  if (tab.url) {
    home.style.display = 'none';
    fc.style.display   = 'flex';
    if (tab.iframe) tab.iframe.style.display = 'block';
    bar.value = tab.url;
  } else {
    home.style.display = 'flex';
    fc.style.display   = 'none';
    bar.value = '';
  }
  renderTabBar();
  updateNavButtons();
}

function renderTabBar() {
  const list = document.getElementById('tab-list');
  list.innerHTML = '';
  tabs.forEach(tab => {
    const el  = document.createElement('div');
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

function updateNavButtons() {
  const tab = tabs.find(t => t.id === activeTabId);
  document.getElementById('back-btn').disabled    = !tab || tab.historyIdx <= 0;
  document.getElementById('forward-btn').disabled = !tab || tab.historyIdx >= tab.history.length - 1;
}

// ── NAVIGATION ────────────────────────────────────────────────────────
async function navigateTo(raw, tabId) {
  tabId = tabId || activeTabId;
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;

  const url = resolveInput(raw);
  if (!url) { goHome(); return; }

  if (tab.history[tab.historyIdx] !== url) {
    tab.history = tab.history.slice(0, tab.historyIdx + 1);
    tab.history.push(url);
    tab.historyIdx = tab.history.length - 1;
  }
  tab.url = url;

  const home = document.getElementById('home-page');
  const fc   = document.getElementById('frame-container');
  home.style.display = 'none';
  fc.style.display   = 'flex';
  tabs.forEach(t => { if (t.iframe) t.iframe.style.display = 'none'; });
  if (tab.iframe) tab.iframe.style.display = 'block';
  document.getElementById('address-bar').value = url;
  renderTabBar();
  updateNavButtons();

  if (tab.frame) {
    await ensureTransport();
    try { tab.frame.go(url); } catch (e) { console.error('[pysium] go() failed:', e); }
  }
}

function goHome() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab) return;
  tab.url = '';
  tabs.forEach(t => { if (t.iframe) t.iframe.style.display = 'none'; });
  document.getElementById('home-page').style.display  = 'flex';
  document.getElementById('frame-container').style.display = 'none';
  document.getElementById('address-bar').value = '';
  renderTabBar();
  updateNavButtons();
}

function goBack() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab || tab.historyIdx <= 0) return;
  tab.historyIdx--;
  tab.url = tab.history[tab.historyIdx];
  document.getElementById('address-bar').value = tab.url;
  document.getElementById('home-page').style.display  = 'none';
  document.getElementById('frame-container').style.display = 'flex';
  tabs.forEach(t => { if (t.iframe) t.iframe.style.display = 'none'; });
  if (tab.iframe) tab.iframe.style.display = 'block';
  updateNavButtons();
  if (tab.frame) ensureTransport().then(() => { try { tab.frame.go(tab.url); } catch {} });
}

function goForward() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab || tab.historyIdx >= tab.history.length - 1) return;
  tab.historyIdx++;
  tab.url = tab.history[tab.historyIdx];
  document.getElementById('address-bar').value = tab.url;
  document.getElementById('home-page').style.display  = 'none';
  document.getElementById('frame-container').style.display = 'flex';
  tabs.forEach(t => { if (t.iframe) t.iframe.style.display = 'none'; });
  if (tab.iframe) tab.iframe.style.display = 'block';
  updateNavButtons();
  if (tab.frame) ensureTransport().then(() => { try { tab.frame.go(tab.url); } catch {} });
}

function reloadTab() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab || !tab.url || !tab.frame) return;
  ensureTransport().then(() => { try { tab.frame.go(tab.url); } catch {} });
}

// ── WEATHER ───────────────────────────────────────────────────────────
const WX_ICONS = {0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌧',71:'🌨',73:'🌨',75:'❄️',80:'🌦',81:'🌧',82:'⛈',95:'⛈',96:'⛈',99:'⛈'};
const WX_DESC  = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Showers',81:'Heavy showers',82:'Violent showers',95:'Thunderstorm',96:'Thunderstorm',99:'Thunderstorm'};

async function fetchWeather(lat, lon) {
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=auto`);
  const d = await r.json();
  const c = d.current || d.current_weather || {};
  return { temperature: c.temperature_2m ?? c.temperature ?? 0, weathercode: c.weathercode ?? 0 };
}
async function fetchCity(lat, lon) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { 'Accept-Language': 'en' } });
    const d = await r.json();
    return d.address?.city || d.address?.town || d.address?.village || d.address?.county || '';
  } catch { return ''; }
}
function showWeatherData(wx, city) {
  document.getElementById('weather-loading').classList.add('hidden');
  document.getElementById('weather-data').classList.remove('hidden');
  const code = wx.weathercode ?? 0;
  document.getElementById('weather-temp').textContent = Math.round(wx.temperature) + '°C';
  document.getElementById('weather-desc').textContent = WX_DESC[code] || 'Clear';
  document.getElementById('weather-city').textContent = city || '';
  document.getElementById('weather-icon-wrap').innerHTML = `<span style="font-size:28px;line-height:1">${WX_ICONS[code] || '🌡️'}</span>`;
}
async function loadWeather(lat, lon) {
  const [wx, city] = await Promise.all([fetchWeather(lat, lon), fetchCity(lat, lon)]);
  localStorage.setItem('pysium_weather_cache', JSON.stringify({ wx, city, ts: Date.now() }));
  showWeatherData(wx, city);
}
function initWeather() {
  const cached = localStorage.getItem('pysium_weather_cache');
  if (cached) {
    try { const { wx, city } = JSON.parse(cached); showWeatherData(wx, city); } catch {}
  }
  const savedPos = localStorage.getItem('pysium_weather_pos');
  if (savedPos) {
    try {
      const { lat, lon } = JSON.parse(savedPos);
      const age = cached ? Date.now() - JSON.parse(cached).ts : Infinity;
      if (age > 15 * 60 * 1000) loadWeather(lat, lon);
    } catch {}
  }
  document.getElementById('weather-widget').addEventListener('click', () => {
    if (!navigator.geolocation) { alert('Geolocation not available.'); return; }
    const loading = document.getElementById('weather-loading');
    const data    = document.getElementById('weather-data');
    loading.classList.remove('hidden');
    data.classList.add('hidden');
    loading.querySelector('span').textContent = 'Getting location…';
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        localStorage.setItem('pysium_weather_pos', JSON.stringify({ lat, lon }));
        loading.querySelector('span').textContent = 'Loading…';
        loadWeather(lat, lon).catch(() => {
          loading.querySelector('span').textContent = 'Unavailable';
        });
      },
      err => {
        loading.querySelector('span').textContent = err.code === 1 ? 'Location denied' : 'Unavailable';
      },
      { timeout: 10000 }
    );
  });
}

// ── BATTERY ───────────────────────────────────────────────────────────
function initBattery() {
  if (!navigator.getBattery) return;
  navigator.getBattery().then(bat => {
    function update() {
      const pct = Math.round(bat.level * 100);
      document.getElementById('batt-pct').textContent    = pct + '%';
      document.getElementById('batt-status').textContent = bat.charging ? '⚡ Charging' : (pct <= 20 ? '⚠ Low' : 'Battery');
      const fill = document.getElementById('batt-fill');
      if (fill) {
        fill.setAttribute('width', parseFloat((bat.level * 31).toFixed(2)));
        fill.setAttribute('fill', pct <= 20 ? '#f87171' : pct <= 50 ? '#fbbf24' : '#6ee7b7');
      }
    }
    update();
    bat.addEventListener('levelchange', update);
    bat.addEventListener('chargingchange', update);
  }).catch(() => {});
}

// ── PANELS ────────────────────────────────────────────────────────────
function openPanel(id) {
  document.getElementById(id).classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}
function closeAllPanels() {
  document.querySelectorAll('.glass-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('overlay').classList.add('hidden');
}

// ── EARLY CLOAK ───────────────────────────────────────────────────────
(function () {
  try {
    const s = JSON.parse(localStorage.getItem('pysium_cloak') || '{}');
    if (s.enabled !== false && s.autoCloak !== false)
      document.title = s.title || CLOAK_DEFAULTS.title;
  } catch {}
}());

// ── BOOT ──────────────────────────────────────────────────────────────
// Scripts are at end of <body> so DOM is already ready — no DOMContentLoaded needed
initScramjet();

document.getElementById('engine-select').value   = SEARCH_ENGINE;
document.getElementById('panic-url-input').value = PANIC_URL;
loadCloakSettings();
initBattery();
initWeather();

// Nav
document.getElementById('home-btn').addEventListener('click', goHome);
document.getElementById('back-btn').addEventListener('click', goBack);
document.getElementById('forward-btn').addEventListener('click', goForward);
document.getElementById('reload-btn').addEventListener('click', reloadTab);
document.getElementById('address-bar').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); navigateTo(this.value); }
});

// Home search
document.getElementById('sj-form').addEventListener('submit', function(e) { e.preventDefault(); });
document.getElementById('sj-address').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    var v = this.value.trim();
    if (v) { navigateTo(v); this.value = ''; }
  }
});

// Shortcuts
document.querySelectorAll('.shortcut').forEach(function(a) {
  a.addEventListener('click', function(e) {
    e.preventDefault();
    if (a.dataset.url) navigateTo(a.dataset.url);
  });
});

// Tabs
document.getElementById('new-tab-btn').addEventListener('click', function() { createTab(); });

// Fullscreen
var fsBtn = document.getElementById('fullscreen-btn');
fsBtn.addEventListener('click', function() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen && document.exitFullscreen();
  }
});
document.addEventListener('fullscreenchange', function() {
  fsBtn.innerHTML = document.fullscreenElement
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>';
});

// Panic
document.getElementById('panic-btn').addEventListener('click', function() { window.location.replace(PANIC_URL); });
document.addEventListener('keydown', function(e) { if (e.altKey && e.key === 'x') window.location.replace(PANIC_URL); });

// Settings
document.getElementById('settings-fab').addEventListener('click', function() { openPanel('settings-panel'); });
document.getElementById('overlay').addEventListener('click', closeAllPanels);
document.querySelectorAll('.panel-close').forEach(function(b) { b.addEventListener('click', closeAllPanels); });
document.querySelectorAll('.stab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.stab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.stab-pane').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('stab-' + btn.dataset.tab).classList.add('active');
  });
});
document.querySelectorAll('.preset-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.getElementById('cloak-title').value       = btn.dataset.title;
    document.getElementById('cloak-favicon-url').value = btn.dataset.favicon;
  });
});
document.getElementById('cloak-apply').addEventListener('click', function() { saveCloakSettings(); closeAllPanels(); });
document.getElementById('cloak-toggle').addEventListener('change', function() {
  cloakEnabled = this.checked;
  if (!cloakEnabled) { document.title = 'Pysium'; document.getElementById('cloak-favicon').href = '/favicon.ico'; }
  else applyCloak(
    document.getElementById('cloak-title').value.trim() || CLOAK_DEFAULTS.title,
    document.getElementById('cloak-favicon-url').value.trim() || CLOAK_DEFAULTS.favicon
  );
});
document.getElementById('ab-cloak-btn').addEventListener('click', function() {
  var title = document.getElementById('cloak-title').value.trim() || CLOAK_DEFAULTS.title;
  var fav   = document.getElementById('cloak-favicon-url').value.trim() || CLOAK_DEFAULTS.favicon;
  var w = window.open('about:blank', '_blank');
  if (!w) { alert('Allow popups first.'); return; }
  w.document.write('<!doctype html><html><head><title>' + title + '</title><link rel="icon" href="' + fav + '"/><style>*{margin:0;padding:0;border:none;overflow:hidden}html,body,iframe{width:100%;height:100%;display:block}</style></head><body><iframe src="' + location.href + '" allow="fullscreen" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"></iframe></body></html>');
  w.document.close();
});
document.getElementById('panic-save').addEventListener('click', function() {
  var url = document.getElementById('panic-url-input').value.trim();
  if (url) { PANIC_URL = url; localStorage.setItem('pysium_panic', url); }
  closeAllPanels();
});
document.getElementById('engine-select').addEventListener('change', function() {
  SEARCH_ENGINE = this.value;
  localStorage.setItem('pysium_engine', this.value);
});

// Open first tab
createTab();
updateNavButtons();
