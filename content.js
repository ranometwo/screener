/**
 * EvenTrade - Advanced Screener.in Sidebar
 * Version 2.0
 */

// ==========================================
// 1. ICONS (SVG Strings)
// ==========================================
const ICONS = {
  tv: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>`,
  sc: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  scan: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  download: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`
};

// ==========================================
// 2. STATE MANAGEMENT & STORAGE
// ==========================================
const Store = {
  state: {
    isOpen: false,
    width: 320,
    watchlists: [{ id: 'default', name: 'My Watchlist', symbols: [] }], // symbol: { ticker, exchange, color }
    activeWatchlistId: 'default',
    settings: {
      theme: 'light',
      lastOpened: null
    },
    scannedSymbols: [] // Temporary storage
  },

  async init() {
    const data = await chrome.storage.sync.get(['evenTradeData']);
    if (data.evenTradeData) {
      // Merge with defaults to ensure schema updates don't break
      this.state = { ...this.state, ...data.evenTradeData };

      // Ensure watchlists exist
      if (!this.state.watchlists || this.state.watchlists.length === 0) {
        this.state.watchlists = [{ id: 'default', name: 'My Watchlist', symbols: [] }];
      }
    }
    return this.state;
  },

  save() {
    chrome.storage.sync.set({ evenTradeData: this.state });
  },

  // --- Watchlist Actions ---
  get activeWatchlist() {
    return this.state.watchlists.find(w => w.id === this.state.activeWatchlistId) || this.state.watchlists[0];
  },

  addWatchlist(name) {
    const id = 'wl_' + Date.now();
    this.state.watchlists.push({ id, name, symbols: [] });
    this.state.activeWatchlistId = id;
    this.save();
    return id;
  },

  deleteWatchlist(id) {
    if (this.state.watchlists.length <= 1) return alert("Cannot delete the last watchlist.");
    this.state.watchlists = this.state.watchlists.filter(w => w.id !== id);
    if (this.state.activeWatchlistId === id) {
      this.state.activeWatchlistId = this.state.watchlists[0].id;
    }
    this.save();
  },

  renameWatchlist(id, newName) {
    const wl = this.state.watchlists.find(w => w.id === id);
    if (wl) {
      wl.name = newName;
      this.save();
    }
  },

  // --- Symbol Actions ---
  addSymbol(ticker, exchange = "NSE") {
    const wl = this.activeWatchlist;
    // Deduplicate
    const exists = wl.symbols.find(s => s.ticker === ticker && s.exchange === exchange);
    if (!exists) {
      wl.symbols.unshift({ ticker, exchange, color: 'none', addedAt: Date.now() });
      this.save();
    }
  },

  removeSymbol(ticker, exchange) {
    const wl = this.activeWatchlist;
    wl.symbols = wl.symbols.filter(s => !(s.ticker === ticker && s.exchange === exchange));
    this.save();
  },

  toggleSymbolColor(ticker, exchange, color) {
    const wl = this.activeWatchlist;
    const sym = wl.symbols.find(s => s.ticker === ticker && s.exchange === exchange);
    if (sym) {
      sym.color = sym.color === color ? 'none' : color;
      this.save();
    }
  },

  importCSV(csvText) {
    try {
      const rows = csvText.split('\n');
      const wlId = this.addWatchlist(`Imported ${new Date().toLocaleDateString()}`);
      this.state.activeWatchlistId = wlId;

      rows.forEach(row => {
        const parts = row.split(/[,:]/); // Split by comma or colon
        if (parts.length >= 2) {
          // Very basic parsing: Exchange:Ticker or Ticker,Exchange
          let ex = parts[0].trim().toUpperCase();
          let tick = parts[1].trim().toUpperCase();
          if (ex.length > 4) { [ex, tick] = [tick, ex]; } // Swap if parsed backward
          if (tick && ex) this.addSymbol(tick, ex);
        }
      });
      this.save();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
};

// ==========================================
// 3. PAGE & DOM UTILITIES
// ==========================================
const Utils = {
  extractTickerFromUrl(url) {
    const match = url.match(/\/company\/([^/]+)\//);
    return match ? match[1].toUpperCase() : null;
  },

  async resolveBSETicker(ticker) {
    // Similar to old logic but cached/optimized if possible
    try {
      const res = await fetch(`/company/${ticker}/`);
      const html = await res.text();
      const match = html.match(/stock-share-price\/[^/]+\/([^/]+)\//);
      return match ? match[1].toUpperCase() : null;
    } catch (e) { return null; }
  },

  getSymbolFromPage() {
    // If on a company page, returns current ticker
    const path = window.location.pathname;
    if (path.includes("/company/")) {
      const ticker = this.extractTickerFromUrl(path);
      // Check page for BSE link to confirm exchange if needed, defaulting to NSE for simplicity
      // unless user explicitly sets logic.
      return ticker;
    }
    return null;
  }
};

// ==========================================
// 4. SCANNER LOGIC
// ==========================================
const Scanner = {
  isScanning: false,

  async fetchUrl(url) {
    const res = await fetch(url);
    const text = await res.text();
    const parser = new DOMParser();
    return parser.parseFromString(text, 'text/html');
  },

  extractFromDoc(doc) {
    const symbols = [];
    const rows = doc.querySelectorAll("table.data-table tbody tr");
    rows.forEach(row => {
      const link = row.querySelector("a[href*='/company/']");
      if (link) {
        const ticker = Utils.extractTickerFromUrl(link.getAttribute("href"));
        if (ticker) symbols.push({ ticker, exchange: /^\d+$/.test(ticker) ? "BSE" : "NSE" });
      }
    });
    return symbols;
  },

  async scanAllPages(onProgress) {
    this.isScanning = true;
    let url = window.location.href;
    let allSymbols = [];
    let pageCount = 1;

    try {
      while (url && this.isScanning) {
        onProgress(`Scanning page ${pageCount}...`);
        const doc = await this.fetchUrl(url);
        const symbols = this.extractFromDoc(doc);
        allSymbols = [...allSymbols, ...symbols];

        // Find next link
        const nextLink = doc.querySelector("div.pagination a[rel='next']"); // Standard Screener pagination
        // Screener pagination often looks like: <a href="?page=2">Next</a>
        const nextLinkByText = Array.from(doc.querySelectorAll("a")).find(a => a.innerText.includes("Next"));

        url = nextLink ? nextLink.href : (nextLinkByText ? nextLinkByText.href : null);
        pageCount++;

        // Safety break
        if (pageCount > 50) break;
        await new Promise(r => setTimeout(r, 500)); // Be polite to server
      }
    } catch (e) {
      console.error("Scan error", e);
    }

    this.isScanning = false;

    // Dedup
    const unique = [];
    const map = new Map();
    for (const item of allSymbols) {
      if (!map.has(item.ticker)) {
        map.set(item.ticker, true);
        unique.push(item);
      }
    }
    return unique;
  }
};

// ==========================================
// 5. UI COMPONENT (Shadow DOM)
// ==========================================
class EvenTradeSidebar {
  constructor() {
    this.host = document.createElement('div');
    this.host.id = "eventrade-host";
    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.isResizing = false;
    this.renderPending = false;

    // Bindings
    this.toggle = this.toggle.bind(this);
    this.render = this.render.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.stopResize = this.stopResize.bind(this);
  }

  async init() {
    await Store.init();
    document.body.appendChild(this.host);
    this.injectStyles();
    this.render();
    this.setupGlobalListeners();

    if (Store.state.isOpen) {
      this.open();
    }
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Structure */
      :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      #sidebar {
        position: fixed; top: 0; right: 0; bottom: 0;
        width: ${Store.state.width}px;
        background: var(--et-bg); color: var(--et-fg);
        box-shadow: -2px 0 10px rgba(0,0,0,0.1);
        z-index: 99999;
        display: flex; flex-direction: column;
        transform: translateX(100%); transition: transform 0.2s ease;
        border-left: 1px solid var(--et-border);
      }
      #sidebar.open { transform: translateX(0); }
      
      /* Layout */
      header { padding: 12px; border-bottom: 1px solid var(--et-border); display: flex; align-items: center; justify-content: space-between; background: var(--et-bg); }
      #content { flex: 1; overflow-y: auto; padding: 0; }
      footer { padding: 12px; border-top: 1px solid var(--et-border); display: flex; gap: 8px; }

      /* Components */
      .btn {
        background: transparent; border: 1px solid var(--et-border);
        color: var(--et-fg); padding: 6px 10px; border-radius: 4px; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        font-size: 13px;
      }
      .btn:hover { background: var(--et-row-hover); }
      .btn-primary { background: var(--et-accent); color: white; border: none; }
      .btn-primary:hover { background: var(--et-accent-hover); }
      
      .icon-btn { padding: 4px; border: none; cursor: pointer; color: #888; background: transparent; border-radius: 4px; }
      .icon-btn:hover { background: var(--et-row-hover); color: var(--et-fg); }

      /* Resizer */
      #resizer { position: absolute; left: -5px; top: 0; bottom: 0; width: 10px; cursor: ew-resize; z-index: 10; }

      /* Watchlist Header */
      .wl-select { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--et-row-hover); }
      .wl-select select { flex: 1; padding: 4px; border-radius: 4px; border: 1px solid var(--et-border); background: var(--et-bg); color: var(--et-fg); }

      /* List Items */
      .symbol-row {
        display: grid; grid-template-columns: 4px 1fr auto auto;
        align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--et-border);
        gap: 8px; user-select: none;
      }
      .symbol-row:hover { background: var(--et-row-hover); }
      .symbol-row.active { background: #e3f2fd; } /* Highlight active */
      :host(.dark-mode) .symbol-row.active { background: #1f2a40; }

      .color-marker { width: 4px; height: 24px; border-radius: 2px; background: #ddd; cursor: pointer; }
      .color-marker.red { background: var(--et-red); }
      .color-marker.green { background: var(--et-green); }
      .color-marker.yellow { background: var(--et-yellow); }

      .ticker-info { display: flex; flex-direction: column; cursor: pointer; }
      .ticker-name { font-weight: 600; font-size: 14px; }
      .ticker-exc { font-size: 10px; color: #888; }
      
      .actions { display: flex; gap: 4px; opacity: 0.6; }
      .symbol-row:hover .actions { opacity: 1; }

      /* Inputs */
      .input-group { display: flex; padding: 8px 12px; gap: 4px; border-bottom: 1px solid var(--et-border); }
      .input-group input { flex: 1; padding: 6px; border: 1px solid var(--et-border); border-radius: 4px; background: var(--et-bg); color: var(--et-fg); }

      /* Scanner Results */
      .scanner-area { padding: 12px; }
      .scan-result-box {
        margin-top: 10px; padding: 8px; background: var(--et-row-hover); 
        border-radius: 4px; font-family: monospace; font-size: 11px;
        max-height: 100px; overflow-y: auto; word-break: break-all;
      }
    `;
    this.shadow.appendChild(style);
  }

  setupGlobalListeners() {
    // Listen for resize
    window.addEventListener('mousemove', this.handleResize);
    window.addEventListener('mouseup', this.stopResize);

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'toggle_sidebar') this.toggle();
    });
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
    // Add class for theming
    if (Store.state.settings.theme === 'dark') this.host.classList.add('dark-mode');
  }

  close() {
    const el = this.shadow.getElementById('sidebar');
    if (el) el.classList.remove('open');
    document.body.style.marginRight = '0px';
  }

  startResize(e) {
    this.isResizing = true;
    e.preventDefault(); // Stop text selection
  }

  handleResize(e) {
    if (!this.isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 200 && newWidth < 600) {
      Store.state.width = newWidth;
      this.shadow.getElementById('sidebar').style.width = `${newWidth}px`;
      document.body.style.marginRight = `${newWidth}px`;
    }
  }

  stopResize() {
    if (this.isResizing) {
      this.isResizing = false;
      Store.save();
    }
  }

  // --- HTML Generators ---

  render() {
    // Basic virtual DOM Diffing is too complex for vanilla, we just rebuild interior
    // but keep the sidebar wrapper to avoid closing animations resetting
    let sidebar = this.shadow.getElementById('sidebar');
    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.id = 'sidebar';

      const resizer = document.createElement('div');
      resizer.id = 'resizer';
      resizer.addEventListener('mousedown', (e) => this.startResize(e));
      sidebar.appendChild(resizer);

      const header = document.createElement('header');
      const content = document.createElement('div');
      content.id = 'content';

      sidebar.appendChild(header);
      sidebar.appendChild(content);
      this.shadow.appendChild(sidebar);
    }

    // Update Header
    const header = sidebar.querySelector('header');
    header.innerHTML = `
      <div style="font-weight:bold; font-size:16px;">EvenTrade</div>
      <div style="display:flex; gap:4px;">
        <button class="icon-btn" id="btn-theme">${Store.state.settings.theme === 'light' ? '🌙' : '☀️'}</button>
        <button class="icon-btn" id="btn-scan" title="Scanner">${ICONS.scan}</button>
        <button class="icon-btn" id="btn-settings" title="Settings">${ICONS.settings}</button>
        <button class="icon-btn" id="btn-close">${ICONS.close}</button>
      </div>
    `;

    // Bind Header Events
    header.querySelector('#btn-close').onclick = this.toggle;
    header.querySelector('#btn-theme').onclick = () => {
      Store.state.settings.theme = Store.state.settings.theme === 'light' ? 'dark' : 'light';
      Store.save();
      this.host.classList.toggle('dark-mode');
      this.render();
    };
    header.querySelector('#btn-scan').onclick = () => this.renderScannerView();
    header.querySelector('#btn-settings').onclick = () => this.renderSettingsView();

    // Default View: Watchlist
    if (!this.currentView || this.currentView === 'watchlist') {
      this.renderWatchlistView(sidebar.querySelector('#content'));
    }
  }

  renderWatchlistView(container) {
    this.currentView = 'watchlist';
    const wl = Store.activeWatchlist;

    container.innerHTML = `
      <div class="wl-select">
        <select id="wl-dropdown">
          ${Store.state.watchlists.map(w => `<option value="${w.id}" ${w.id === wl.id ? 'selected' : ''}>${w.name}</option>`).join('')}
        </select>
        <button class="icon-btn" id="btn-new-wl" title="New List">${ICONS.plus}</button>
        <button class="icon-btn" id="btn-del-wl" title="Delete List">${ICONS.trash}</button>
      </div>
      
      <div class="input-group">
        <input type="text" id="add-sym-input" placeholder="Add Symbol (e.g. TATAMOTORS)" />
        <button class="btn btn-primary" id="btn-add-sym">Add</button>
      </div>

      <div id="sym-list"></div>
    `;

    // Events
    container.querySelector('#wl-dropdown').onchange = (e) => {
      Store.state.activeWatchlistId = e.target.value;
      Store.save();
      this.render();
    };
    container.querySelector('#btn-new-wl').onclick = () => {
      const name = prompt("Watchlist Name:");
      if (name) { Store.addWatchlist(name); this.render(); }
    };
    container.querySelector('#btn-del-wl').onclick = () => {
      if (confirm("Delete current watchlist?")) { Store.deleteWatchlist(wl.id); this.render(); }
    };

    const addSymbol = () => {
      const input = container.querySelector('#add-sym-input');
      const val = input.value.trim().toUpperCase();
      if (val) { Store.addSymbol(val); input.value = ''; this.render(); }
    };
    container.querySelector('#btn-add-sym').onclick = addSymbol;
    container.querySelector('#add-sym-input').onkeyup = (e) => { if (e.key === 'Enter') addSymbol(); };

    // Render Rows
    const list = container.querySelector('#sym-list');
    wl.symbols.forEach(sym => {
      const row = document.createElement('div');
      row.className = `symbol-row ${Store.state.settings.lastOpened === sym.ticker ? 'active' : ''}`;

      // Color Cycler
      const colors = ['none', 'red', 'yellow', 'green'];

      row.innerHTML = `
           <div class="color-marker ${sym.color}"></div>
           <div class="ticker-info">
             <span class="ticker-name">${sym.ticker}</span>
             <span class="ticker-exc">${sym.exchange}</span>
           </div>
           <div class="actions">
             <button class="icon-btn action-sc" title="Screener">${ICONS.sc}</button>
             <button class="icon-btn action-tv" title="TradingView">${ICONS.tv}</button>
             <button class="icon-btn action-del" title="Remove">${ICONS.trash}</button>
           </div>
        `;

      // Row Logic
      row.querySelector('.color-marker').onclick = () => {
        const nextColor = colors[(colors.indexOf(sym.color) + 1) % colors.length];
        Store.toggleSymbolColor(sym.ticker, sym.exchange, nextColor);
        this.render();
      };

      row.querySelector('.ticker-name').onclick = () => {
        // Click to open default
        window.open(`https://www.screener.in/company/${sym.ticker}/`, '_blank');
      };

      row.querySelector('.action-sc').onclick = () => {
        Store.state.settings.lastOpened = sym.ticker; Store.save();
        window.open(`https://www.screener.in/company/${sym.ticker}/`, '_blank');
        this.render();
      };

      row.querySelector('.action-tv').onclick = () => {
        Store.state.settings.lastOpened = sym.ticker; Store.save();
        const symbol = `${sym.exchange}:${sym.ticker}`;
        window.open(`https://in.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`, '_blank');
        this.render();
      };

      row.querySelector('.action-del').onclick = () => {
        Store.removeSymbol(sym.ticker, sym.exchange);
        this.render();
      };

      list.appendChild(row);
    });
  }

  renderScannerView() {
    this.currentView = 'scanner';
    const container = this.shadow.getElementById('content');
    container.innerHTML = `
        <div style="padding:12px; border-bottom:1px solid var(--et-border);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3>Page Scanner</h3>
                <button class="icon-btn" id="btn-back-scan">${ICONS.close}</button>
            </div>
            <p style="font-size:12px; color:#666;">Extract symbols from this Screener page or results.</p>
            <div style="display:flex; gap:8px; margin-top:12px;">
                <button class="btn btn-primary" id="btn-scan-page">Scan This Page</button>
                <button class="btn" id="btn-scan-all">Scan All Pages</button>
            </div>
            <div id="scan-status" style="margin-top:8px; font-size:11px; color:#888;"></div>
        </div>
        <div class="scanner-area" id="scan-results-area" style="display:none">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <strong>Found: <span id="scan-count">0</span></strong>
                <div style="display:flex; gap:4px;">
                    <button class="icon-btn" id="btn-copy-scan" title="Copy">${ICONS.copy}</button>
                    <button class="icon-btn" id="btn-save-scan" title="Save as Watchlist">${ICONS.download}</button>
                </div>
            </div>
            <textarea class="scan-result-box" id="scan-text" readonly></textarea>
        </div>
      `;

    container.querySelector('#btn-back-scan').onclick = () => { this.currentView = 'watchlist'; this.render(); };

    const handleScan = async (all) => {
      const status = container.querySelector('#scan-status');
      const area = container.querySelector('#scan-results-area');

      if (all) {
        status.textContent = "Initializing multi-page scan...";
        const results = await Scanner.scanAllPages((msg) => status.textContent = msg);
        Store.state.scannedSymbols = results;
      } else {
        Store.state.scannedSymbols = Scanner.extractFromDoc(document);
      }

      status.textContent = "Scan complete.";
      area.style.display = 'block';
      container.querySelector('#scan-count').textContent = Store.state.scannedSymbols.length;
      container.querySelector('#scan-text').value = Store.state.scannedSymbols.map(s => s.ticker).join(', ');
    };

    container.querySelector('#btn-scan-page').onclick = () => handleScan(false);
    container.querySelector('#btn-scan-all').onclick = () => handleScan(true);

    container.querySelector('#btn-copy-scan').onclick = () => {
      const text = container.querySelector('#scan-text');
      text.select();
      document.execCommand('copy');
    };

    container.querySelector('#btn-save-scan').onclick = () => {
      const name = prompt("Name for new watchlist:", "Scanned Results");
      if (name) {
        const id = Store.addWatchlist(name);
        const wl = Store.state.watchlists.find(w => w.id === id);
        wl.symbols = Store.state.scannedSymbols.map(s => ({ ...s, color: 'none', addedAt: Date.now() }));
        Store.save();
        alert("Watchlist created!");
        this.currentView = 'watchlist';
        this.render();
      }
    };
  }

  renderSettingsView() {
    this.currentView = 'settings';
    const container = this.shadow.getElementById('content');
    container.innerHTML = `
        <div style="padding:12px;">
             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3>Settings</h3>
                <button class="icon-btn" id="btn-back-set">${ICONS.close}</button>
            </div>
            
            <h4>Data Management</h4>
            <div style="margin-top:8px;">
                <button class="btn" id="btn-export">Export to CSV</button>
            </div>
            
            <div style="margin-top:16px;">
                <label style="font-size:12px; font-weight:bold;">Import CSV (Ticker, Exchange)</label>
                <textarea id="import-text" style="width:100%; height:80px; margin-top:4px; font-family:monospace;" placeholder="TCS, NSE\nINFY, NSE"></textarea>
                <button class="btn btn-primary" id="btn-import" style="margin-top:4px;">Import</button>
            </div>
        </div>
      `;

    container.querySelector('#btn-back-set').onclick = () => { this.currentView = 'watchlist'; this.render(); };

    container.querySelector('#btn-export').onclick = () => {
      let csv = "Ticker,Exchange,Watchlist\n";
      Store.state.watchlists.forEach(wl => {
        wl.symbols.forEach(s => {
          csv += `${s.ticker},${s.exchange},${wl.name}\n`;
        });
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'eventrade_backup.csv';
      a.click();
    };

    container.querySelector('#btn-import').onclick = () => {
      const txt = container.querySelector('#import-text').value;
      if (txt) {
        Store.importCSV(txt);
        alert("Imported successfully");
        this.currentView = 'watchlist';
        this.render();
      }
    };
  }
}

// ==========================================
// 6. INJECTION & LEGACY INTEGRATION
// ==========================================

const SidebarInstance = new EvenTradeSidebar();

// Initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => SidebarInstance.init());
} else {
  SidebarInstance.init();
}

// --- Integrate into Existing Buttons (Refactored) ---

function processPageButtons() {
  // Inject "Add to Watchlist" icon into tables
  const tables = document.querySelectorAll("table.data-table");
  tables.forEach(table => {
    if (table.dataset.etProcessed) return;
    table.dataset.etProcessed = "true";

    // Headers
    const ths = table.querySelectorAll("thead th");
    if (ths.length > 0) {
      const th = document.createElement("th");
      th.innerHTML = ICONS.plus; // Use icon for header
      th.style.width = "20px";
      table.querySelector("thead tr").insertBefore(th, table.querySelector("thead tr").firstChild);
    }

    // Rows
    table.querySelectorAll("tbody tr").forEach(row => {
      const link = row.querySelector("a[href*='/company/']");
      if (!link) return;
      const ticker = Utils.extractTickerFromUrl(link.getAttribute("href"));

      const td = document.createElement("td");
      td.style.textAlign = "center";
      td.style.cursor = "pointer";
      td.innerHTML = `<div style="color:#ccc; transition:color 0.2s;">${ICONS.plus}</div>`;

      td.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Add to active watchlist
        // Async check for BSE if numeric
        if (/^\d+$/.test(ticker)) {
          Utils.resolveBSETicker(ticker).then(sym => {
            Store.addSymbol(ticker, sym || "BSE");
            SidebarInstance.render();
            SidebarInstance.open(); // Open sidebar to show feedback
          });
        } else {
          Store.addSymbol(ticker, "NSE");
          SidebarInstance.render();
          SidebarInstance.open();
        }

        // Visual feedback
        td.innerHTML = `<div style="color:var(--et-green);">${ICONS.plus}</div>`;
      };

      row.insertBefore(td, row.firstChild);
    });
  });
}

// Run button injector periodically
setInterval(processPageButtons, 1000);