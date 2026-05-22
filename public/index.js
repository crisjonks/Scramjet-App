/* ============================================================
   Scramjet MW — index.js
   Tab manager, AB cloak, panic switch, battery, favicon/title
   detection, shortcuts, fullscreen, panic key
   ============================================================ */

(function () {
  "use strict";

  /* ---- State ---- */
  const tabs = [];
  let activeTabId = null;

  /* ---- DOM refs ---- */
  const tabsContainer   = document.getElementById("tabs-container");
  const framesContainer = document.getElementById("frames-container");
  const homeScreen      = document.getElementById("home-screen");
  const frameArea       = document.getElementById("frame-area");
  const addressInput    = document.getElementById("sj-address");
  const searchForm      = document.getElementById("sj-form");
  const searchEngine    = document.getElementById("sj-search-engine");
  const btnNewTab       = document.getElementById("btn-new-tab");
  const btnHome         = document.getElementById("btn-home");
  const btnBack         = document.getElementById("btn-back");
  const btnForward      = document.getElementById("btn-forward");
  const btnReload       = document.getElementById("btn-reload");
  const btnPanic        = document.getElementById("btn-panic");
  const btnCloak        = document.getElementById("btn-cloak");
  const btnFullscreen   = document.getElementById("btn-fullscreen");
  const panicOverlay    = document.getElementById("panic-overlay");
  const cloakShell      = document.getElementById("cloak-shell");
  const cloakFrame      = document.getElementById("cloak-frame");
  const cloakExitBtn    = document.getElementById("cloak-exit-btn");
  const cloakUrlText    = document.getElementById("cloak-url-text");
  const batteryFill     = document.getElementById("battery-fill");
  const batteryText     = document.getElementById("battery-text");

  /* ===============================================================
     UTILITY
  =============================================================== */
  function generateId() {
    return "_" + Math.random().toString(36).slice(2, 9);
  }

  function isUrl(str) {
    if (/^https?:\/\//i.test(str)) return true;
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(str)) return true;
    return false;
  }

  function buildProxyUrl(input) {
    let url = input.trim();
    if (!url) return null;
    if (isUrl(url)) {
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    } else {
      const se = searchEngine.value || "https://www.google.com/search?q=%s";
      url = se.replace("%s", encodeURIComponent(url));
    }
    try {
      if (typeof __scramjet$ !== "undefined") {
        return __scramjet$.rewrite(url);
      }
      return "/scram/" + encodeURIComponent(url);
    } catch {
      return "/scram/" + encodeURIComponent(url);
    }
  }

  /* ===============================================================
     TABS
  =============================================================== */
  function createTab(url, switchTo = true) {
    const id = generateId();
    const tab = {
      id,
      url: url || null,
      title: "New Tab",
      favicon: null,
      iframe: null,
      tabEl: null,
    };

    /* iframe */
    const iframe = document.createElement("iframe");
    iframe.className = "browser-frame";
    iframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation");
    framesContainer.appendChild(iframe);
    tab.iframe = iframe;

    /* tab element */
    const tabEl = document.createElement("div");
    tabEl.className = "tab";
    tabEl.dataset.id = id;
    tabEl.innerHTML = `
      <span class="tab-favicon-placeholder">
        <svg style="width:13px;height:13px;opacity:.35" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
      </span>
      <span class="tab-title">New Tab</span>
      <button class="tab-close" title="Close tab">✕</button>
    `;
    tabEl.addEventListener("click", (e) => {
      if (!e.target.closest(".tab-close")) switchTab(id);
    });
    tabEl.querySelector(".tab-close").addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(id);
    });
    tabsContainer.appendChild(tabEl);
    tab.tabEl = tabEl;

    tabs.push(tab);

    /* iframe load events for title/favicon */
    iframe.addEventListener("load", () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        /* title */
        const title = doc.title || tab.url || "New Tab";
        updateTabMeta(id, { title });
        /* favicon */
        const faviconLink = doc.querySelector("link[rel~='icon']");
        if (faviconLink && faviconLink.href) {
          updateTabMeta(id, { favicon: faviconLink.href });
        } else {
          try {
            const origin = new URL(tab.url || "").origin;
            if (origin) updateTabMeta(id, { favicon: origin + "/favicon.ico" });
          } catch {}
        }
      } catch {/* cross-origin blocked — that's fine */}
    });

    if (url) {
      const proxyUrl = buildProxyUrl(url);
      if (proxyUrl) {
        iframe.src = proxyUrl;
        tab.url = url;
      }
    }

    if (switchTo) switchTab(id);
    return id;
  }

  function updateTabMeta(id, { title, favicon } = {}) {
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;
    if (title !== undefined) tab.title = title;
    if (favicon !== undefined) tab.favicon = favicon;
    renderTabEl(tab);
  }

  function renderTabEl(tab) {
    const el = tab.tabEl;
    if (!el) return;
    const titleEl = el.querySelector(".tab-title");
    const faviconSlot = el.querySelector(".tab-favicon-placeholder, .tab-favicon");
    if (titleEl) titleEl.textContent = tab.title || "New Tab";
    if (faviconSlot && tab.favicon) {
      const img = document.createElement("img");
      img.className = "tab-favicon";
      img.src = tab.favicon;
      img.alt = "";
      img.width = 14;
      img.height = 14;
      img.onerror = () => { img.style.display = "none"; };
      faviconSlot.replaceWith(img);
    }
  }

  function switchTab(id) {
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;
    activeTabId = id;

    /* show/hide frames */
    tabs.forEach(t => {
      t.iframe.classList.toggle("active", t.id === id);
      t.tabEl.classList.toggle("active", t.id === id);
    });

    /* show home or frame area */
    if (tab.url) {
      homeScreen.style.display = "none";
      frameArea.style.display = "flex";
    } else {
      homeScreen.style.display = "";
      frameArea.style.display = "none";
    }

    /* address bar */
    addressInput.value = tab.url || "";
  }

  function closeTab(id) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    const tab = tabs[idx];
    tab.iframe.remove();
    tab.tabEl.remove();
    tabs.splice(idx, 1);

    if (tabs.length === 0) {
      createTab(null);
    } else if (activeTabId === id) {
      switchTab(tabs[Math.max(0, idx - 1)].id);
    }
  }

  function navigateActiveTab(url) {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;
    const proxyUrl = buildProxyUrl(url);
    if (!proxyUrl) return;
    tab.url = url;
    tab.title = url;
    tab.favicon = null;
    renderTabEl(tab);
    tab.iframe.src = proxyUrl;
    homeScreen.style.display = "none";
    frameArea.style.display = "flex";
    tab.iframe.classList.add("active");
  }

  /* ===============================================================
     SEARCH FORM
  =============================================================== */
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = addressInput.value.trim();
    if (!val) return;
    navigateActiveTab(val);
  });

  /* address bar click → select all */
  addressInput.addEventListener("focus", () => addressInput.select());

  /* ===============================================================
     TOOLBAR BUTTONS
  =============================================================== */
  btnNewTab.addEventListener("click", () => createTab(null));
  btnHome.addEventListener("click", () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) {
      tab.url = null;
      tab.title = "New Tab";
      tab.favicon = null;
      renderTabEl(tab);
      tab.iframe.src = "about:blank";
      addressInput.value = "";
    }
    homeScreen.style.display = "";
    frameArea.style.display = "none";
  });

  btnBack.addEventListener("click", () => {
    const tab = tabs.find(t => t.id === activeTabId);
    try { tab?.iframe?.contentWindow?.history?.back(); } catch {}
  });

  btnForward.addEventListener("click", () => {
    const tab = tabs.find(t => t.id === activeTabId);
    try { tab?.iframe?.contentWindow?.history?.forward(); } catch {}
  });

  btnReload.addEventListener("click", () => {
    const tab = tabs.find(t => t.id === activeTabId);
    try {
      tab?.iframe?.contentWindow?.location?.reload();
    } catch {
      if (tab?.iframe?.src) tab.iframe.src = tab.iframe.src;
    }
  });

  /* ===============================================================
     SHORTCUTS
  =============================================================== */
  document.querySelectorAll(".shortcut").forEach(btn => {
    btn.addEventListener("click", () => {
      const url = btn.dataset.url;
      if (!url) return;
      /* navigate active tab if it's a "new tab", else open new tab */
      const tab = tabs.find(t => t.id === activeTabId);
      if (tab && !tab.url) {
        navigateActiveTab(url);
      } else {
        const id = createTab(url, false);
        switchTab(id);
      }
    });
  });

  /* ===============================================================
     PANIC SWITCH
  =============================================================== */
  function triggerPanic() {
    panicOverlay.style.display = "block";
    /* navigate top window to a neutral page */
    try {
      window.location.replace("https://google.com");
    } catch {}
  }

  btnPanic.addEventListener("click", triggerPanic);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !cloakShell.style.display.includes("none") === false) {
      /* Escape: if not in cloak, don't panic */
    }
    /* Double-tap shift = panic */
    if (e.key === "F1") {
      e.preventDefault();
      triggerPanic();
    }
  });

  /* ===============================================================
     ABOUT:BLANK CLOAK
  =============================================================== */
  function openCloak(srcUrl) {
    cloakShell.style.display = "flex";
    if (srcUrl) {
      cloakFrame.src = srcUrl;
      cloakUrlText.textContent = "about:blank";
    }
    /* make the tab/title look like about:blank */
    document.title = "";
  }

  function closeCloak() {
    cloakShell.style.display = "none";
    cloakFrame.src = "about:blank";
    document.title = "Scramjet";
  }

  btnCloak.addEventListener("click", () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab?.url) {
      openCloak(tab.iframe.src || "about:blank");
    } else {
      openCloak("about:blank");
    }
  });

  cloakExitBtn.addEventListener("click", closeCloak);

  /* Auto-cloak on load: open in about:blank frame immediately */
  function autoCloak() {
    /* wrap the whole app in a blank-titled window appearance */
    document.title = "";
    /* we already have blank title; favicon trick */
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon";
    link.href = "data:,";
    document.head.appendChild(link);
  }
  autoCloak();

  /* ===============================================================
     FULLSCREEN
  =============================================================== */
  btnFullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      document.getElementById("app").classList.add("fullscreen-mode");
    } else {
      document.exitFullscreen?.();
      document.getElementById("app").classList.remove("fullscreen-mode");
    }
  });

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      document.getElementById("app").classList.remove("fullscreen-mode");
    }
  });

  /* ===============================================================
     BATTERY
  =============================================================== */
  function updateBatteryUI(battery) {
    const pct = Math.round(battery.level * 100);
    batteryText.textContent = pct + "%";
    batteryFill.style.width = pct + "%";
    if (pct <= 20) {
      batteryFill.style.background = "#f87171";
    } else if (pct <= 50) {
      batteryFill.style.background = "#facc15";
    } else {
      batteryFill.style.background = "#4ade80";
    }
  }

  if ("getBattery" in navigator) {
    navigator.getBattery().then(battery => {
      updateBatteryUI(battery);
      battery.addEventListener("levelchange", () => updateBatteryUI(battery));
      battery.addEventListener("chargingchange", () => updateBatteryUI(battery));
    }).catch(() => {
      batteryText.textContent = "N/A";
    });
  } else {
    batteryText.textContent = "N/A";
    document.getElementById("battery-indicator").title = "Battery API not available";
  }

  /* ===============================================================
     INIT: open first tab
  =============================================================== */
  createTab(null);

})();
