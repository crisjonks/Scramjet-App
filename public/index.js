/* ============================================================
   PYSIUM — index.js
   Tabs, AB Cloak, Panic, Battery, Favicon/Title detection
   ============================================================ */

(function () {
  "use strict";

  // ── Config ────────────────────────────────────────────────
  const PANIC_URL  = "https://classroom.google.com";
  const PANIC_KEY  = "Escape"; // hold Escape for 1s = panic
  const AUTO_CLOAK = true;     // cloak on load (about:blank wrapper)

  // ── DOM refs ──────────────────────────────────────────────
  const homeScreen    = document.getElementById("home-screen");
  const proxyFrame    = document.getElementById("proxy-frame");
  const sjForm        = document.getElementById("sj-form");
  const sjAddress     = document.getElementById("sj-address");
  const sjError       = document.getElementById("sj-error");
  const sjErrorCode   = document.getElementById("sj-error-code");
  const errorWrap     = document.getElementById("sj-error-wrap");
  const tabBar        = document.getElementById("tab-bar");
  const newTabBtn     = document.getElementById("new-tab-btn");
  const homeBtn       = document.getElementById("home-btn");
  const cloakBtn      = document.getElementById("cloak-btn");
  const panicBtn      = document.getElementById("panic-btn");
  const fullscreenBtn = document.getElementById("fullscreen-btn");
  const cloakOverlay  = document.getElementById("cloak-overlay");
  const battPct       = document.getElementById("battery-pct");
  const battFill      = document.querySelector(".battery-fill");

  // ── AB / About:blank Cloak ────────────────────────────────
  let cloakActive = false;

  function activateCloak() {
    cloakActive = true;
    cloakOverlay.classList.remove("hidden");
    cloakBtn.classList.add("active");
    cloakBtn.title = "Disable cloak";
  }

  function deactivateCloak() {
    cloakActive = false;
    cloakOverlay.classList.add("hidden");
    cloakBtn.classList.remove("active");
    cloakBtn.title = "About:blank cloak";
  }

  cloakBtn.addEventListener("click", () => {
    if (cloakActive) deactivateCloak();
    else activateCloak();
  });

  if (AUTO_CLOAK) {
    activateCloak();
    // Click anywhere on cloak overlay to reveal (user opt-in)
    cloakOverlay.addEventListener("click", deactivateCloak, { once: false });
    cloakOverlay.title = "Click to enter Pysium";
  }

  // ── Panic switch ──────────────────────────────────────────
  let panicHold = null;

  function triggerPanic() {
    // Replace the whole page context to avoid back-navigation to proxy
    window.location.replace(PANIC_URL);
  }

  panicBtn.addEventListener("click", triggerPanic);

  // Keyboard shortcut: hold Escape 0.8s
  document.addEventListener("keydown", (e) => {
    if (e.key === PANIC_KEY && !panicHold) {
      panicHold = setTimeout(triggerPanic, 800);
    }
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === PANIC_KEY) {
      clearTimeout(panicHold);
      panicHold = null;
    }
  });

  // ── Battery ───────────────────────────────────────────────
  async function initBattery() {
    if (!navigator.getBattery) return;
    try {
      const bat = await navigator.getBattery();
      function updateBat() {
        const pct = Math.round(bat.level * 100);
        battPct.textContent = pct + "%";
        // Fill bar: max inner width ~16px at 100%
        const maxW = 16;
        const w = Math.round((pct / 100) * maxW);
        battFill.style.setProperty("--batt-w", w + "px");
        battFill.setAttribute("width", w);
        // Color hint
        if (pct <= 20) {
          battFill.style.fill = "hsl(355, 85%, 62%)";
          battPct.style.color = "hsl(355, 85%, 62%)";
        } else if (pct <= 40) {
          battFill.style.fill = "hsl(40, 90%, 60%)";
          battPct.style.color = "hsl(40, 90%, 60%)";
        } else {
          battFill.style.fill = "";
          battPct.style.color = "";
        }
      }
      updateBat();
      bat.addEventListener("levelchange", updateBat);
      bat.addEventListener("chargingchange", updateBat);
    } catch (_) {}
  }
  initBattery();

  // ── Fullscreen ────────────────────────────────────────────
  fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  document.addEventListener("fullscreenchange", () => {
    const icon = fullscreenBtn.querySelector("svg");
    if (document.fullscreenElement) {
      icon.innerHTML = '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3"/>';
    } else {
      icon.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
    }
  });

  // ── Tab system ────────────────────────────────────────────
  let tabs      = [];    // [{ id, title, favicon, url, active }]
  let activeTab = null;
  let tabIdCounter = 0;

  function createTab(url = null, title = "New Tab") {
    const id = ++tabIdCounter;
    const tab = { id, title, favicon: null, url };
    tabs.push(tab);
    renderTabs();
    switchTab(id);
    if (url) navigate(url);
    return tab;
  }

  function closeTab(id) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    tabs.splice(idx, 1);
    if (activeTab === id) {
      if (tabs.length === 0) {
        activeTab = null;
        showHome();
      } else {
        const next = tabs[Math.min(idx, tabs.length - 1)];
        switchTab(next.id);
      }
    }
    renderTabs();
  }

  function switchTab(id) {
    activeTab = id;
    const tab = tabs.find(t => t.id === id);
    renderTabs();
    if (tab && tab.url) {
      showProxy();
    } else {
      showHome();
    }
  }

  function renderTabs() {
    // Remove old tab elements, keep new-tab button
    Array.from(tabBar.querySelectorAll(".tab-item")).forEach(el => el.remove());

    tabs.forEach(tab => {
      const el = document.createElement("div");
      el.className = "tab-item" + (tab.id === activeTab ? " active" : "");
      el.dataset.tabId = tab.id;

      // Favicon
      const fav = document.createElement("img");
      fav.className = "tab-favicon";
      fav.src = tab.favicon || defaultFaviconSVG();
      fav.alt = "";
      fav.onerror = () => { fav.src = defaultFaviconSVG(); };
      el.appendChild(fav);

      // Title
      const titleEl = document.createElement("span");
      titleEl.className = "tab-title";
      titleEl.textContent = tab.title;
      el.appendChild(titleEl);

      // Close btn
      const close = document.createElement("button");
      close.className = "tab-close";
      close.innerHTML = "×";
      close.title = "Close tab";
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(tab.id);
      });
      el.appendChild(close);

      el.addEventListener("click", () => switchTab(tab.id));

      // Insert before new-tab button
      tabBar.insertBefore(el, newTabBtn);
    });
  }

  function defaultFaviconSVG() {
    return `data:image/svg+xml,<svg viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'><rect width='16' height='16' rx='3' fill='%23334'/><text x='8' y='12' text-anchor='middle' font-size='10' fill='%238899aa'>⊕</text></svg>`;
  }

  newTabBtn.addEventListener("click", () => createTab());

  // ── Navigation / Proxy ───────────────────────────────────
  function showProxy() {
    homeScreen.classList.add("hidden");
    proxyFrame.classList.remove("hidden");
  }

  function showHome() {
    homeScreen.classList.remove("hidden");
    proxyFrame.classList.add("hidden");
    sjAddress.value = "";
  }

  homeBtn.addEventListener("click", () => {
    if (activeTab) {
      const tab = tabs.find(t => t.id === activeTab);
      if (tab) { tab.url = null; tab.title = "New Tab"; tab.favicon = null; renderTabs(); }
    }
    showHome();
  });

  async function navigate(rawUrl) {
    clearError();

    let url = rawUrl.trim();
    if (!url) return;

    // Determine if URL or search
    const isURL = /^(https?:\/\/|ftp:\/\/)/i.test(url)
      || /^[a-z0-9-]+\.[a-z]{2,}(\/|$)/i.test(url);

    if (!isURL) {
      const engine = document.getElementById("sj-search-engine").value;
      url = engine.replace("%s", encodeURIComponent(url));
    } else if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    // Update active tab url
    const tab = tabs.find(t => t.id === activeTab);

    try {
      const proxyUrl = await __scramjet$worker.encodeUrl(url);

      if (tab) {
        tab.url = url;
        tab.title = new URL(url).hostname;
        renderTabs();
      }

      showProxy();

      proxyFrame.src = proxyUrl;

      // After iframe loads: detect title + favicon
      proxyFrame.addEventListener("load", () => detectTitleFavicon(tab), { once: false });

    } catch (err) {
      showError("Failed to load: " + err.message, err.stack || "");
    }
  }

  // ── Favicon & Title detection ─────────────────────────────
  function detectTitleFavicon(tab) {
    if (!tab) return;
    try {
      const iDoc = proxyFrame.contentDocument || proxyFrame.contentWindow?.document;
      if (!iDoc) return;

      // Title
      const title = iDoc.title || iDoc.querySelector("title")?.textContent;
      if (title && title.trim()) {
        tab.title = title.trim().slice(0, 40);
      }

      // Favicon
      const links = iDoc.querySelectorAll("link[rel*='icon']");
      let faviconHref = null;
      for (const l of links) {
        if (l.href) { faviconHref = l.href; break; }
      }
      if (!faviconHref && tab.url) {
        try {
          const base = new URL(tab.url);
          faviconHref = base.origin + "/favicon.ico";
        } catch (_) {}
      }
      if (faviconHref) tab.favicon = faviconHref;

      renderTabs();
    } catch (_) {
      // cross-origin: use domain favicon
      if (tab && tab.url) {
        try {
          const base = new URL(tab.url);
          tab.favicon = `https://www.google.com/s2/favicons?domain=${base.hostname}&sz=32`;
          renderTabs();
        } catch (_) {}
      }
    }
  }

  // ── Form submit ───────────────────────────────────────────
  sjForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = sjAddress.value.trim();
    if (!query) return;

    if (tabs.length === 0 || !activeTab) {
      createTab(query);
    } else {
      navigate(query);
    }
  });

  // ── Shortcut cards ────────────────────────────────────────
  document.querySelectorAll(".shortcut-card").forEach(card => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const site = card.dataset.site;
      if (!site) return;
      if (tabs.length === 0 || !activeTab) {
        createTab(site);
      } else {
        navigate(site);
      }
    });
  });

  // ── Error helpers ─────────────────────────────────────────
  function showError(msg, code = "") {
    sjError.textContent = msg;
    sjErrorCode.textContent = code;
    errorWrap.classList.remove("hidden");
  }
  function clearError() {
    errorWrap.classList.add("hidden");
    sjError.textContent = "";
    sjErrorCode.textContent = "";
  }

  // ── Init: create first tab slot (home) ────────────────────
  // Don't create a full tab yet; user starts on home screen
  renderTabs();

})();
