/* ─── THEME ─────────────────────────────────────────── */
:root {
  --bg: #0d0f14;
  --bg2: #12151c;
  --surface: rgba(255,255,255,0.055);
  --surface-hover: rgba(255,255,255,0.09);
  --border: rgba(255,255,255,0.1);
  --border-strong: rgba(255,255,255,0.18);
  --text: #e8eaf0;
  --text-muted: rgba(232,234,240,0.45);
  --accent: #7eb8f7;
  --accent2: #a78bfa;
  --glass-blur: 18px;
  --radius: 14px;
  --radius-sm: 8px;
  --tab-h: 40px;
  --topbar-h: 52px;
  --font: 'DM Sans', sans-serif;
  --font-mono: 'DM Mono', monospace;
  --panic-url: "https://classroom.google.com";
}

/* ─── RESET ─────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font); }

/* ─── GLASS MIXIN ────────────────────────────────────── */
.glass {
  background: var(--surface);
  backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
  border: 1px solid var(--border);
}

/* ─── BG GRADIENT ────────────────────────────────────── */
body::before {
  content: '';
  position: fixed; inset: 0; z-index: -1;
  background:
    radial-gradient(ellipse 60% 50% at 20% 10%, rgba(126,184,247,0.12) 0%, transparent 70%),
    radial-gradient(ellipse 50% 60% at 80% 80%, rgba(167,139,250,0.1) 0%, transparent 70%),
    var(--bg);
  pointer-events: none;
}

/* ─── TAB BAR ────────────────────────────────────────── */
#tab-bar {
  position: fixed; top: 0; left: 0; right: 0;
  height: var(--tab-h);
  display: flex; align-items: center;
  background: rgba(13,15,20,0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  z-index: 200;
  padding: 0 6px;
  gap: 4px;
}

#tab-list {
  display: flex; align-items: center; gap: 3px;
  flex: 1; overflow-x: auto; overflow-y: hidden;
  scrollbar-width: none;
}
#tab-list::-webkit-scrollbar { display: none; }

.tab {
  display: flex; align-items: center; gap: 6px;
  padding: 0 10px 0 10px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  font-family: var(--font); font-size: 12px; font-weight: 400;
  cursor: pointer;
  white-space: nowrap;
  min-width: 80px; max-width: 180px;
  transition: background .15s, color .15s, border-color .15s;
  position: relative;
  user-select: none;
}
.tab:hover { background: var(--surface); color: var(--text); }
.tab.active {
  background: rgba(126,184,247,0.12);
  border-color: rgba(126,184,247,0.25);
  color: var(--text);
}
.tab-favicon { width: 14px; height: 14px; border-radius: 2px; flex-shrink: 0; }
.tab-title { flex: 1; overflow: hidden; text-overflow: ellipsis; }
.tab-close {
  width: 16px; height: 16px; border-radius: 4px;
  background: none; border: none; color: inherit;
  font-size: 11px; line-height: 1; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity .15s, background .15s;
  flex-shrink: 0;
}
.tab:hover .tab-close, .tab.active .tab-close { opacity: 1; }
.tab-close:hover { background: rgba(255,255,255,0.12); }

#new-tab-btn {
  width: 28px; height: 28px; border-radius: var(--radius-sm);
  background: none; border: 1px solid var(--border);
  color: var(--text-muted); font-size: 18px; line-height: 1;
  cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, color .15s;
}
#new-tab-btn:hover { background: var(--surface); color: var(--text); }

/* ─── MAIN SHELL ─────────────────────────────────────── */
#main-shell {
  position: fixed;
  top: var(--tab-h); left: 0; right: 0; bottom: 0;
  display: flex; flex-direction: column;
}

/* ─── TOP BAR ────────────────────────────────────────── */
#top-bar {
  height: var(--topbar-h);
  display: flex; align-items: center; gap: 6px;
  padding: 0 10px;
  background: rgba(13,15,20,0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.top-btn {
  width: 34px; height: 34px; border-radius: var(--radius-sm);
  background: var(--surface); border: 1px solid var(--border);
  color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, color .15s, border-color .15s;
  flex-shrink: 0;
}
.top-btn svg { width: 16px; height: 16px; }
.top-btn:hover { background: var(--surface-hover); color: var(--text); border-color: var(--border-strong); }

#address-bar-wrap {
  flex: 1;
  display: flex; align-items: center; gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 12px;
  height: 34px;
  transition: border-color .2s, background .2s;
}
#address-bar-wrap:focus-within {
  border-color: rgba(126,184,247,0.4);
  background: rgba(126,184,247,0.06);
}
#lock-icon { color: var(--text-muted); display: flex; }
#lock-icon svg { width: 14px; height: 14px; }

#address-bar {
  flex: 1; background: none; border: none; outline: none;
  color: var(--text); font-family: var(--font-mono); font-size: 12.5px;
}
#address-bar::placeholder { color: var(--text-muted); font-family: var(--font); }

/* battery */
#battery-wrap {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; font-family: var(--font-mono);
  color: var(--text-muted);
}
#battery-icon { width: 24px; height: 14px; }
#battery-fill { transition: width .4s; }

/* panic */
#panic-btn { color: rgba(248,113,113,0.7); }
#panic-btn:hover { color: #f87171; border-color: rgba(248,113,113,0.4); background: rgba(248,113,113,0.08); }

/* ─── HOME PAGE ──────────────────────────────────────── */
#home-page {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  overflow-y: auto;
}
#home-inner {
  display: flex; flex-direction: column; align-items: center; gap: 24px;
  padding: 40px 20px;
  max-width: 700px; width: 100%;
}

#wordmark {
  font-size: clamp(52px, 10vw, 88px);
  font-weight: 300;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--text) 0%, rgba(126,184,247,0.9) 50%, var(--accent2) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}
#home-sub {
  font-size: 14px; color: var(--text-muted); letter-spacing: 0.05em;
  text-transform: lowercase; font-weight: 300;
}

/* search form */
#sj-form { width: 100%; }
#search-wrap {
  display: flex; align-items: center; gap: 12px;
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--border);
  border-radius: 50px;
  padding: 0 20px;
  height: 54px;
  transition: border-color .2s, background .2s, box-shadow .2s;
}
#search-wrap:focus-within {
  border-color: rgba(126,184,247,0.5);
  background: rgba(126,184,247,0.07);
  box-shadow: 0 0 0 3px rgba(126,184,247,0.1), 0 8px 32px rgba(0,0,0,0.3);
}
.search-ico { width: 18px; height: 18px; color: var(--text-muted); flex-shrink: 0; }
#sj-address {
  flex: 1; background: none; border: none; outline: none;
  color: var(--text); font-family: var(--font); font-size: 15px; font-weight: 400;
}
#sj-address::placeholder { color: var(--text-muted); }
#sj-error { color: #f87171; font-size: 12px; margin-top: 8px; text-align: center; }
#sj-error-code { color: var(--text-muted); font-family: var(--font-mono); font-size: 11px; margin-top: 4px; }

/* shortcuts */
#shortcuts {
  display: flex; gap: 14px; flex-wrap: wrap; justify-content: center;
  margin-top: 8px;
}
.shortcut {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  text-decoration: none; color: var(--text-muted);
  font-size: 11px; font-weight: 500; letter-spacing: 0.03em;
  transition: color .2s, transform .2s;
}
.shortcut:hover { color: var(--text); transform: translateY(-3px); }
.shortcut-icon {
  width: 52px; height: 52px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.07);
  border: 1px solid var(--border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: background .2s, border-color .2s, box-shadow .2s;
}
.shortcut-icon svg { width: 22px; height: 22px; }
.shortcut:hover .shortcut-icon {
  border-color: var(--border-strong);
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.sc-yt  { color: #ff4444; }
.sc-reddit { color: #ff6314; }
.sc-x { color: #e8eaf0; }
.sc-discord { color: #5865f2; }
.sc-insta { color: #e1306c; }
.sc-tiktok { color: #ee1d52; }

.shortcut:hover .sc-yt  { background: rgba(255,68,68,0.15); }
.shortcut:hover .sc-reddit { background: rgba(255,99,20,0.15); }
.shortcut:hover .sc-x { background: rgba(232,234,240,0.1); }
.shortcut:hover .sc-discord { background: rgba(88,101,242,0.15); }
.shortcut:hover .sc-insta { background: rgba(225,48,108,0.15); }
.shortcut:hover .sc-tiktok { background: rgba(238,29,82,0.15); }

/* ─── PROXY IFRAME ───────────────────────────────────── */
#proxy-frame {
  flex: 1; border: none; width: 100%;
  display: none;
  background: #fff;
}
#proxy-frame.active { display: block; }

/* ─── FAB ROW ────────────────────────────────────────── */
#fab-row {
  position: fixed; bottom: 20px; right: 20px;
  display: flex; gap: 10px; z-index: 100;
}
#cloak-fab {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 14px;
  background: rgba(255,255,255,0.07);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: 50px;
  color: var(--text-muted); font-family: var(--font); font-size: 12px; font-weight: 500;
  cursor: pointer;
  transition: background .15s, color .15s, border-color .15s;
}
#cloak-fab svg { width: 15px; height: 15px; }
#cloak-fab:hover { background: rgba(255,255,255,0.12); color: var(--text); border-color: var(--border-strong); }

/* ─── GLASS PANEL ────────────────────────────────────── */
.glass-panel {
  position: fixed; z-index: 300;
  background: rgba(18,21,28,0.82);
  backdrop-filter: blur(28px) saturate(1.5);
  -webkit-backdrop-filter: blur(28px) saturate(1.5);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  width: 320px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  overflow: hidden;
  animation: panelIn .2s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes panelIn {
  from { opacity: 0; transform: scale(0.93) translateY(6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.glass-panel.hidden { display: none; }
#cloak-panel { bottom: 70px; right: 20px; }

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 13px; font-weight: 600; color: var(--text);
}
.panel-close {
  background: none; border: none; color: var(--text-muted);
  font-size: 14px; cursor: pointer; line-height: 1;
  padding: 2px 6px; border-radius: 4px;
  transition: background .15s, color .15s;
}
.panel-close:hover { background: var(--surface); color: var(--text); }

.panel-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }

.toggle-row {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 13px; color: var(--text); cursor: pointer;
}
.toggle-row input[type=checkbox] {
  width: 36px; height: 20px; appearance: none;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; cursor: pointer; position: relative;
  transition: background .2s;
}
.toggle-row input[type=checkbox]::after {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--text-muted);
  transition: transform .2s, background .2s;
}
.toggle-row input[type=checkbox]:checked { background: rgba(126,184,247,0.3); border-color: var(--accent); }
.toggle-row input[type=checkbox]:checked::after { transform: translateX(16px); background: var(--accent); }

.field-group { display: flex; flex-direction: column; gap: 5px; }
.field-group label { font-size: 11px; color: var(--text-muted); letter-spacing: 0.04em; text-transform: uppercase; }
.field-group input {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 8px 10px;
  color: var(--text); font-family: var(--font); font-size: 12.5px;
  outline: none; transition: border-color .15s;
}
.field-group input:focus { border-color: rgba(126,184,247,0.4); }
.field-group input::placeholder { color: var(--text-muted); }

.preset-row { display: flex; gap: 6px; flex-wrap: wrap; }
.preset-btn {
  padding: 5px 10px; border-radius: 6px;
  background: var(--surface); border: 1px solid var(--border);
  color: var(--text-muted); font-family: var(--font); font-size: 11px; font-weight: 500;
  cursor: pointer; transition: background .15s, color .15s, border-color .15s;
}
.preset-btn:hover { background: var(--surface-hover); color: var(--text); border-color: var(--border-strong); }

.apply-btn {
  width: 100%; padding: 9px;
  background: rgba(126,184,247,0.15); border: 1px solid rgba(126,184,247,0.3);
  border-radius: var(--radius-sm); color: var(--accent);
  font-family: var(--font); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background .15s, border-color .15s;
}
.apply-btn:hover { background: rgba(126,184,247,0.25); border-color: rgba(126,184,247,0.5); }
.apply-btn.secondary {
  background: var(--surface); border-color: var(--border); color: var(--text-muted);
}
.apply-btn.secondary:hover { background: var(--surface-hover); color: var(--text); border-color: var(--border-strong); }

/* ─── OVERLAY ────────────────────────────────────────── */
#overlay {
  position: fixed; inset: 0; z-index: 250;
  background: rgba(0,0,0,0.3);
  backdrop-filter: blur(2px);
}
#overlay.hidden { display: none; }

/* ─── SCROLLBAR ──────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
