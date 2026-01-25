/**
 * EvenTrade - Screener.in Assistant
 * Version 2.1
 */

// ==========================================
// 1. ICONS (SVG)
// ==========================================
const ICONS = {
  plus: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  close: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  tv: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>`
};

// ==========================================
// 2. STATE & STORAGE
// ==========================================
const Store = {
  state: {
    isOpen: false,
    width: 350,
    watchlist: [], // Array of {ticker, exchange}
    settings: {
      theme: 'light',
      showColWatchlist: true,
      showColTv: true
    }
  },

  async init() {
    const data = await chrome.storage.sync.get(['etData']);
    if (data.etData) {
      this.state = { ...this.state, ...data.etData };
      // Ensure settings structure exists if upgrading from old version
      if (!this.state.settings) this.state.settings = { theme: 'light', showColWatchlist: true, showColTv: true };
    }
    this.applyTheme();
    return this.state;
  },

  save() {
    chrome.storage.sync.set({ etData: this.state });
    this.applyTheme();
  },

  applyTheme() {
    if (this.state.settings.theme === 'dark') {
      document.body.setAttribute('data-et-theme', 'dark');
    } else {
      document.body.removeAttribute('data-et-theme');
    }
  },

  addToWatchlist(ticker, exchange) {
    const exists = this.state.watchlist.find(s => s.ticker === ticker && s.exchange === exchange);
    if (!exists) {
      this.state.watchlist.unshift({ ticker, exchange, addedAt: Date.now() });
      this.save();
      return true;
    }
    return false;
  },

  removeFromWatchlist(ticker) {
    this.state.watchlist = this.state.watchlist.filter(s => s.ticker !== ticker);
    this.save();
  }
};

// ==========================================
// 3. UTILITIES (BSE Logic)
// ==========================================
const Utils = {
  extractTickerFromUrl(url) {
    const match = url.match(/\/company\/([^/]+)\//);
    return match ? match[1].toUpperCase() : null;
  },

  // Cache resolved BSE symbols to avoid re-fetching
  bseCache: new Map(),

  async resolveSymbol(rawTicker) {
    // If it's text (NSE), return as is
    if (!/^\d+$/.test(rawTicker)) {
      return { ticker: rawTicker, exchange: 'NSE' };
    }

    // If it's numeric (BSE), check cache or fetch
    if (this.bseCache.has(rawTicker)) {
      return { ticker: this.bseCache.get(rawTicker), exchange: 'BSE' };
    }

    try {
      const res = await fetch(`https://www.screener.in/company/${rawTicker}/`);
      const html = await res.text();
      // Regex to find the canonical ticker in the page HTML
      const match = html.match(/company\/([A-Z0-9]+)\/consolidated/);
      // Fallback match looking for breadcrumbs or title if above fails
      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);

      let resolved = rawTicker;
      if (match && match[1]) resolved = match[1];
      else if (titleMatch) resolved = titleMatch[1].split(' ')[0]; // Very rough fallback

      this.bseCache.set(rawTicker, resolved);
      return { ticker: resolved, exchange: 'BSE' };
    } catch (e) {
      console.error("ET: Failed to resolve BSE ticker", e);
      return { ticker: rawTicker, exchange: 'BSE' };
    }
  }
};

// ==========================================
// 4. SHADOW DOM SIDEBAR
// ==========================================
class Sidebar {
  constructor() {
    this.host = document.createElement('div');
    this.host.id = 'et-sidebar-host';
    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.currentView = 'list'; // 'list' or 'settings'
  }

  init() {
    document.body.appendChild(this.host);
    this.renderStyles();
    this.render();

    if (Store.state.isOpen) this.open();

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'toggle_sidebar') this.toggle();
    });
  }

  renderStyles() {
    const style = document.createElement('style');
    style.textContent = `
            :host { all: initial; font-family: -apple-system, system-ui, sans-serif; }
            * { box-sizing: border-box; }
            
            #sidebar {
                position: fixed; top: 0; right: 0; bottom: 0;
                width: ${Store.state.width}px;
                background: var(--et-bg); color: var(--et-fg);
                box-shadow: -2px 0 15px rgba(0,0,0,0.2);
                transform: translateX(100%); transition: transform 0.2s ease;
                display: flex; flex-direction: column;
                z-index: 2147483647; border-left: 1px solid var(--et-border);
            }
            #sidebar.open { transform: translateX(0); }

            /* Header */
            header {
                padding: 15px; border-bottom: 1px solid var(--et-border);
                display: flex; justify-content: space-between; align-items: center;
                background: var(--et-bg);
            }
            h2 { margin: 0; font-size: 18px; font-weight: 700; }

            /* Buttons */
            .icon-btn {
                background: transparent; border: none; cursor: pointer;
                color: var(--et-fg); padding: 5px; border-radius: 4px;
                opacity: 0.7;
            }
            .icon-btn:hover { opacity: 1; background: var(--et-row-hover); }

            .btn-primary {
                background: var(--et-accent); color: #fff;
                border: none; padding: 8px 12px; border-radius: 4px;
                cursor: pointer; font-size: 13px; font-weight: 500;
                display: flex; align-items: center; justify-content: center; gap: 5px;
                width: 100%; margin-top: 10px;
            }
            .btn-primary:hover { background: var(--et-accent-hover); }

            /* Content Area */
            .content { flex: 1; overflow-y: auto; padding: 0; }
            
            /* List Items */
            .wl-item {
                display: flex; justify-content: space-between; align-items: center;
                padding: 10px 15px; border-bottom: 1px solid var(--et-border);
            }
            .wl-item:hover { background: var(--et-row-hover); }
            .ticker { font-weight: 600; font-size: 14px; cursor: pointer; }
            .exc { font-size: 10px; color: #888; margin-left: 4px; }
            
            /* Settings */
            .setting-row {
                padding: 15px; border-bottom: 1px solid var(--et-border);
                display: flex; justify-content: space-between; align-items: center;
            }
            
            /* Scrollbar */
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
        `;
    this.shadow.appendChild(style);
  }

  render() {
    let container = this.shadow.getElementById('sidebar');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sidebar';
      this.shadow.appendChild(container);
    }

    container.innerHTML = `
            <header>
                <h2>EvenTrade</h2>
                <div style="display:flex; gap:5px;">
                    <button id="btn-settings" class="icon-btn" title="Settings">${ICONS.settings}</button>
                    <button id="btn-close" class="icon-btn" title="Close">${ICONS.close}</button>
                </div>
            </header>
            <div class="content" id="main-content"></div>
        `;

    this.shadow.getElementById('btn-close').onclick = () => this.toggle();
    this.shadow.getElementById('btn-settings').onclick = () => {
      this.currentView = this.currentView === 'settings' ? 'list' : 'settings';
      this.renderContent();
    };

    this.renderContent();
  }

  renderContent() {
    const area = this.shadow.getElementById('main-content');
    area.innerHTML = '';

    if (this.currentView === 'settings') {
      this.renderSettings(area);
    } else {
      this.renderWatchlist(area);
    }
  }

  renderWatchlist(area) {
    // Add Input
    const inputDiv = document.createElement('div');
    inputDiv.style.padding = '15px';
    inputDiv.style.borderBottom = '1px solid var(--et-border)';
    inputDiv.innerHTML = `
            <input type="text" id="add-input" placeholder="Symbol (e.g., RELIANCE)" 
                style="width:100%; padding:8px; border:1px solid var(--et-border); background:var(--et-bg); color:var(--et-fg); border-radius:4px;">
            <button class="btn-primary" id="btn-add">Add Symbol</button>
        `;

    const addFn = () => {
      const val = inputDiv.querySelector('#add-input').value.toUpperCase().trim();
      if (val) { Store.addToWatchlist(val, 'NSE'); this.renderContent(); }
    };

    inputDiv.querySelector('#btn-add').onclick = addFn;
    inputDiv.querySelector('#add-input').onkeyup = (e) => { if (e.key === 'Enter') addFn(); };
    area.appendChild(inputDiv);

    // List
    Store.state.watchlist.forEach(item => {
      const row = document.createElement('div');
      row.className = 'wl-item';
      row.innerHTML = `
                <div class="ticker-box">
                    <span class="ticker">${item.ticker}</span>
                    <span class="exc">${item.exchange}</span>
                </div>
                <div style="display:flex; gap:5px;">
                     <button class="icon-btn" id="tv-${item.ticker}">${ICONS.tv}</button>
                     <button class="icon-btn" id="del-${item.ticker}">${ICONS.trash}</button>
                </div>
            `;

      // Open Screener
      row.querySelector('.ticker-box').onclick = () => window.location.href = `https://www.screener.in/company/${item.ticker}/`;

      // Open TradingView
      row.querySelector(`#tv-${item.ticker}`).onclick = () => {
        const sym = `${item.exchange}:${item.ticker}`;
        window.open(`https://in.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}`, '_blank');
      };

      // Delete
      row.querySelector(`#del-${item.ticker}`).onclick = () => {
        Store.removeFromWatchlist(item.ticker);
        this.renderContent();
      };

      area.appendChild(row);
    });
  }

  renderSettings(area) {
    const createToggle = (label, key, callback) => {
      const row = document.createElement('div');
      row.className = 'setting-row';
      row.innerHTML = `<span>${label}</span> <input type="checkbox" ${Store.state.settings[key] ? 'checked' : ''}>`;
      row.querySelector('input').onchange = (e) => {
        Store.state.settings[key] = e.target.checked;
        Store.save();
        if (callback) callback();
      };
      return row;
    };

    area.appendChild(createToggle('Dark Mode', 'theme', () => {
      SidebarInstance.renderStyles(); // Re-inject styles to pick up var changes? Actually variables are on body
    }));
    area.appendChild(createToggle('Show Watchlist Column (+)', 'showColWatchlist'));
    area.appendChild(createToggle('Show TradingView Column', 'showColTv'));

    const note = document.createElement('div');
    note.style.padding = '15px';
    note.style.fontSize = '12px';
    note.style.color = '#888';
    note.innerText = 'Note: Refresh the page to apply column visibility changes.';
    area.appendChild(note);
  }

  toggle() {
    Store.state.isOpen = !Store.state.isOpen;
    Store.save();
    if (Store.state.isOpen) this.open(); else this.close();
  }

  open() {
    const el = this.shadow.getElementById('sidebar');
    if (el) el.classList.add('open');
    document.body.style.marginRight = `${Store.state.width}px`;
  }

  close() {
    const el = this.shadow.getElementById('sidebar');
    if (el) el.classList.remove('open');
    document.body.style.marginRight = '0';
  }
}

const SidebarInstance = new Sidebar();

// ==========================================
// 5. TABLE INJECTOR (Core Feature)
// ==========================================
const Injector = {
  init() {
    // Run initially and then on interval to handle pagination/hydration
    this.process();
    setInterval(() => this.process(), 1500);
  },

  process() {
    // If columns are disabled in settings, do nothing (or strictly cleanup)
    // For efficiency in this script, we just stop injecting.

    const tables = document.querySelectorAll("table.data-table");
    tables.forEach(table => {
      this.injectHeaders(table);
      this.injectRows(table);
    });
  },

  injectHeaders(table) {
    const theadRow = table.querySelector("thead tr");
    if (!theadRow) return;

    // Check if we already injected
    if (Store.state.settings.showColWatchlist && !theadRow.querySelector('.et-head-wl')) {
      const th = document.createElement("th");
      th.className = 'et-head-wl';
      th.innerHTML = ICONS.plus;
      th.style.width = "30px";
      th.title = "Add to Watchlist";
      theadRow.insertBefore(th, theadRow.firstChild);
    }

    if (Store.state.settings.showColTv && !theadRow.querySelector('.et-head-tv')) {
      const th = document.createElement("th");
      th.className = 'et-head-tv';
      th.innerText = "TV";
      th.style.width = "50px";
      // Insert after WL column if it exists, or first
      const ref = theadRow.querySelector('.et-head-wl') ? theadRow.querySelector('.et-head-wl').nextSibling : theadRow.firstChild;
      theadRow.insertBefore(th, ref);
    }
  },

  injectRows(table) {
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach(row => {
      // Find the company link to identify the row
      const link = row.querySelector("a[href*='/company/']");
      if (!link) return;

      const rawTicker = Utils.extractTickerFromUrl(link.getAttribute("href"));
      if (!rawTicker) return;

      // 1. WATCHLIST COLUMN
      if (Store.state.settings.showColWatchlist && !row.querySelector('.et-col-wl')) {
        const td = document.createElement("td");
        td.className = 'et-col-wl';
        td.style.cursor = 'pointer';
        td.style.textAlign = 'center';
        td.innerHTML = `<div style="color:#ccc; transition:0.2s;">${ICONS.plus}</div>`;

        td.onclick = (e) => {
          e.preventDefault(); e.stopPropagation();
          // Just add to NSE defaults for speed, Sidebar handles display
          Store.addToWatchlist(rawTicker, /^\d+$/.test(rawTicker) ? 'BSE' : 'NSE');
          SidebarInstance.renderContent(); // Refresh sidebar

          // Visual feedback
          td.innerHTML = `<div style="color:var(--et-green); transform:scale(1.2);">${ICONS.plus}</div>`;
          if (!Store.state.isOpen) SidebarInstance.toggle();
        };

        row.insertBefore(td, row.firstChild);
      }

      // 2. TRADINGVIEW COLUMN
      if (Store.state.settings.showColTv && !row.querySelector('.et-col-tv')) {
        const td = document.createElement("td");
        td.className = 'et-col-tv';
        td.style.textAlign = 'center';

        // Button style: Solid Blue, White Text, Small
        const btn = document.createElement('a');
        btn.innerText = rawTicker.substring(0, 4); // First 4 letters
        btn.style.cssText = `
                    display: inline-block;
                    background: #2962ff; 
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                    padding: 2px 4px;
                    border-radius: 3px;
                    text-decoration: none;
                    min-width: 35px;
                    text-align: center;
                `;

        btn.onclick = async (e) => {
          e.preventDefault(); e.stopPropagation();
          btn.innerText = "...";

          // Async resolve symbol (Handles BSE numeric tickers)
          const resolved = await Utils.resolveSymbol(rawTicker);

          // Reset text
          btn.innerText = rawTicker.substring(0, 4);

          // Open URL
          const finalUrl = `https://in.tradingview.com/chart/?symbol=${resolved.exchange}:${resolved.ticker}`;
          window.open(finalUrl, '_blank');
        };

        td.appendChild(btn);

        // Insert location: after WL column or first
        const ref = row.querySelector('.et-col-wl') ? row.querySelector('.et-col-wl').nextSibling : row.firstChild;
        row.insertBefore(td, ref);
      }
    });
  }
};

// ==========================================
// 6. BOOTSTRAP
// ==========================================
(async function () {
  await Store.init();
  SidebarInstance.init();
  Injector.init();
})();