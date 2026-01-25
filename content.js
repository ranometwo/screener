/**
 * EvenTrade - Advanced Screener.in Assistant
 * Version 3.0 (Restored & Enhanced)
 */

// ==========================================
// 1. ICONS (SVG)
// ==========================================
const ICONS = {
  plus: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  tv: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>`,
  scan: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`,
  close: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  download: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`
};

// ==========================================
// 2. STATE & STORAGE (Multi-List Restored)
// ==========================================
const Store = {
  state: {
    isOpen: false,
    width: 350,
    // RESTORED: Multi-watchlist structure
    watchlists: [{ id: 'default', name: 'My Watchlist', symbols: [] }],
    activeWatchlistId: 'default',
    visited: [], // V2.3 Feature
    settings: {
      theme: 'light',
      showColWatchlist: true,
      showColTv: true
    }
  },

  async init() {
    const data = await chrome.storage.sync.get(['etData_v3']);
    if (data.etData_v3) {
      this.state = { ...this.state, ...data.etData_v3 };

      // Migration check: if coming from v2.3 (single array), migrate to multi-list
      if (Array.isArray(this.state.watchlist)) {
        this.state.watchlists[0].symbols = this.state.watchlist;
        delete this.state.watchlist;
      }
    }
    this.applyTheme();
    return this.state;
  },

  save() {
    chrome.storage.sync.set({ etData_v3: this.state });
    this.applyTheme();
  },

  applyTheme() {
    if (this.state.settings.theme === 'dark') document.body.setAttribute('data-et-theme', 'dark');
    else document.body.removeAttribute('data-et-theme');
  },

  // --- WATCHLIST HELPERS ---
  get activeWatchlist() {
    return this.state.watchlists.find(w => w.id === this.state.activeWatchlistId) || this.state.watchlists[0];
  },

  addWatchlist(name) {
    const id = 'wl_' + Date.now();
    this.state.watchlists.push({ id, name, symbols: [] });
    this.state.activeWatchlistId = id;
    this.save();
  },

  deleteWatchlist(id) {
    if (this.state.watchlists.length <= 1) return alert("Cannot delete the last watchlist.");
    this.state.watchlists = this.state.watchlists.filter(w => w.id !== id);
    this.state.activeWatchlistId = this.state.watchlists[0].id;
    this.save();
  },

  // --- SYMBOL ACTIONS ---
  addSymbol(ticker, exchange) {
    const wl = this.activeWatchlist;
    const exists = wl.symbols.find(s => s.ticker === ticker && s.exchange === exchange);
    if (!exists) {
      // RESTORED: Default color 'none'
      wl.symbols.unshift({ ticker, exchange, color: 'none', addedAt: Date.now() });
      this.save();
      return true;
    }
    return false;
  },

  removeSymbol(ticker) {
    const wl = this.activeWatchlist;
    wl.symbols = wl.symbols.filter(s => s.ticker !== ticker);
    this.save();
  },

  // RESTORED: Color Cycling
  toggleColor(ticker) {
    const wl = this.activeWatchlist;
    const sym = wl.symbols.find(s => s.ticker === ticker);
    if (sym) {
      const colors = ['none', 'red', 'yellow', 'green'];
      const idx = colors.indexOf(sym.color || 'none');
      sym.color = colors[(idx + 1) % colors.length];
      this.save();
    }
  },

  // RESTORED: Import Logic
  importCSV(csvText) {
    const rows = csvText.split('\n');
    let count = 0;
    rows.forEach(row => {
      const [p1, p2] = row.split(/[,:]/).map(s => s.trim().toUpperCase());
      if (p1 && p2) {
        // Determine which is exchange/ticker
        const ex = (p1 === 'NSE' || p1 === 'BSE') ? p1 : (p2 === 'NSE' || p2 === 'BSE') ? p2 : 'NSE';
        const tick = (p1 !== ex) ? p1 : p2;
        if (this.addSymbol(tick, ex)) count++;
      } else if (p1) {
        // Just ticker
        if (this.addSymbol(p1, 'NSE')) count++;
      }
    });
    return count;
  },

  markVisited(ticker) {
    if (!this.state.visited.includes(ticker)) {
      this.state.visited.push(ticker);
      this.save();
    }
  },

  isVisited(ticker) { return this.state.visited.includes(ticker); }
};

// ==========================================
// 3. SCANNER (Deep Scan Restored)
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

  // RESTORED: Multi-page scanning
  async scanAllPages(onProgress) {
    this.isScanning = true;
    let url = window.location.href;
    let count = 0;
    let page = 1;

    try {
      while (url && this.isScanning && page <= 50) {
        onProgress(`Scanning Page ${page}...`);
        const doc = await this.fetchUrl(url);
        const symbols = this.extractFromDoc(doc);

        symbols.forEach(s => {
          if (Store.addSymbol(s.ticker, s.exchange)) count++;
        });

        // Find next link
        const nextLink = doc.querySelector("div.pagination a[rel='next']") ||
          Array.from(doc.querySelectorAll("a")).find(a => a.innerText.includes("Next"));

        url = nextLink ? nextLink.href : null;
        page++;
        await new Promise(r => setTimeout(r, 500)); // Rate limit
      }
    } catch (e) { console.error(e); }

    this.isScanning = false;
    return count;
  }
};

// ==========================================
// 4. UTILITIES
// ==========================================
const Utils = {
  extractTickerFromUrl(url) {
    const match = url.match(/\/company\/([^/]+)\//);
    return match ? match[1].toUpperCase() : null;
  },
  bseCache: new Map(),
  async resolveSymbol(rawTicker) {
    if (!/^\d+$/.test(rawTicker)) return { ticker: rawTicker, exchange: 'NSE' };
    if (this.bseCache.has(rawTicker)) return { ticker: this.bseCache.get(rawTicker), exchange: 'BSE' };
    try {
      const res = await fetch(`https://www.screener.in/company/${rawTicker}/`);
      const html = await res.text();
      const match = html.match(/company\/([A-Z0-9]+)\/consolidated/);
      const resolved = match ? match[1] : rawTicker;
      this.bseCache.set(rawTicker, resolved);
      return { ticker: resolved, exchange: 'BSE' };
    } catch (e) { return { ticker: rawTicker, exchange: 'BSE' }; }
  }
};

// ==========================================
// 5. UI (Sidebar)
// ==========================================
class Sidebar {
  constructor() {
    this.host = document.createElement('div');
    this.host.id = 'et-sidebar-host';
    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.currentView = 'list';
  }

  init() {
    document.body.appendChild(this.host);
    this.renderStyles();
    this.render();
    if (Store.state.isOpen) this.open();
    chrome.runtime.onMessage.addListener((msg) => { if (msg.action === 'toggle_sidebar') this.toggle(); });
  }

  renderStyles() {
    const style = document.createElement('style');
    style.textContent = `
            :host { all: initial; font-family: -apple-system, system-ui, sans-serif; }
            * { box-sizing: border-box; }
            #sidebar {
                position: fixed; top: 0; right: 0; bottom: 0; width: ${Store.state.width}px;
                background: var(--et-bg); color: var(--et-fg);
                box-shadow: -2px 0 15px rgba(0,0,0,0.2);
                transform: translateX(100%); transition: transform 0.2s ease;
                display: flex; flex-direction: column; z-index: 2147483647; border-left: 1px solid var(--et-border);
            }
            #sidebar.open { transform: translateX(0); }
            header { padding: 15px; border-bottom: 1px solid var(--et-border); display: flex; justify-content: space-between; align-items: center; background: var(--et-bg); }
            h2 { margin: 0; font-size: 18px; font-weight: 700; }
            .icon-btn { background: transparent; border: none; cursor: pointer; color: var(--et-fg); padding: 5px; opacity: 0.7; }
            .icon-btn:hover { opacity: 1; background: var(--et-row-hover); border-radius:4px; }
            .content { flex: 1; overflow-y: auto; padding: 0; }
            
            /* Watchlist Select Header */
            .wl-select-area { padding: 10px; background: var(--et-row-hover); display: flex; gap: 5px; }
            select { flex: 1; padding: 5px; border-radius: 4px; border: 1px solid var(--et-border); background: var(--et-bg); color: var(--et-fg); }
            
            /* List Items */
            .wl-item { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--et-border); gap: 8px; }
            .wl-item:hover { background: var(--et-row-hover); }
            .color-marker { width: 4px; height: 30px; background: #ddd; cursor: pointer; border-radius: 2px; }
            .color-marker.red { background: var(--et-red); }
            .color-marker.green { background: var(--et-green); }
            .color-marker.yellow { background: #ffc107; }
            
            .ticker-box { flex: 1; cursor: pointer; }
            .ticker { font-weight: 600; font-size: 14px; }
            .exc { font-size: 10px; color: #888; }
            
            /* Actions */
            .btn-primary { background: var(--et-accent); color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
            .status-msg { font-size: 11px; color: var(--et-green); margin-top: 5px; text-align: center; }
            textarea { width: 100%; height: 80px; margin-top: 5px; border: 1px solid var(--et-border); background: var(--et-bg); color: var(--et-fg); }
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
    if (this.currentView === 'settings') this.renderSettings(area);
    else this.renderWatchlist(area);
  }

  renderWatchlist(area) {
    // 1. WATCHLIST SELECTOR (Restored)
    const wlSelect = document.createElement('div');
    wlSelect.className = 'wl-select-area';
    wlSelect.innerHTML = `
            <select id="wl-dropdown">
                ${Store.state.watchlists.map(w => `<option value="${w.id}" ${w.id === Store.state.activeWatchlistId ? 'selected' : ''}>${w.name}</option>`).join('')}
            </select>
            <button class="icon-btn" id="btn-new-wl" title="New List">${ICONS.plus}</button>
            <button class="icon-btn" id="btn-del-wl" title="Delete List">${ICONS.trash}</button>
        `;
    wlSelect.querySelector('#wl-dropdown').onchange = (e) => {
      Store.state.activeWatchlistId = e.target.value;
      Store.save();
      this.renderContent();
    };
    wlSelect.querySelector('#btn-new-wl').onclick = () => {
      const name = prompt("New Watchlist Name:");
      if (name) { Store.addWatchlist(name); this.renderContent(); }
    };
    wlSelect.querySelector('#btn-del-wl').onclick = () => {
      if (confirm("Delete this watchlist?")) { Store.deleteWatchlist(Store.state.activeWatchlistId); this.renderContent(); }
    };
    area.appendChild(wlSelect);

    // 2. INPUT & SCAN ACTIONS
    const actions = document.createElement('div');
    actions.style.padding = '10px';
    actions.style.borderBottom = '1px solid var(--et-border)';
    actions.innerHTML = `
            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <input type="text" id="add-input" placeholder="Symbol (e.g. TATA)" style="flex:1; padding:6px; border-radius:4px; border:1px solid var(--et-border); background:var(--et-bg); color:var(--et-fg);">
                <button class="btn-primary" id="btn-add">Add</button>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="icon-btn" style="flex:1; border:1px solid var(--et-border);" id="btn-scan-page">Scan Page</button>
                <button class="icon-btn" style="flex:1; border:1px solid var(--et-border);" id="btn-scan-all">Scan All (50)</button>
            </div>
            <div id="scan-msg" class="status-msg"></div>
        `;

    const addFn = () => {
      const val = actions.querySelector('#add-input').value.toUpperCase().trim();
      if (val) { Store.addSymbol(val, 'NSE'); actions.querySelector('#add-input').value = ''; this.renderContent(); }
    };
    actions.querySelector('#btn-add').onclick = addFn;

    // Scan Handlers
    const handleScan = async (all) => {
      const msg = actions.querySelector('#scan-msg');
      msg.innerText = all ? "Scanning pages (max 50)..." : "Scanning page...";

      let count = 0;
      if (all) count = await Scanner.scanAllPages((txt) => msg.innerText = txt);
      else {
        Scanner.extractFromDoc(document).forEach(s => { if (Store.addSymbol(s.ticker, s.exchange)) count++; });
      }

      this.renderContent();
      // Re-select message element after render
      setTimeout(() => {
        const newMsg = this.shadow.getElementById('scan-msg');
        if (newMsg) newMsg.innerText = `Added ${count} new symbols.`;
      }, 100);
    };

    actions.querySelector('#btn-scan-page').onclick = () => handleScan(false);
    actions.querySelector('#btn-scan-all').onclick = () => handleScan(true);

    area.appendChild(actions);

    // 3. LIST ITEMS
    Store.activeWatchlist.symbols.forEach(item => {
      const row = document.createElement('div');
      row.className = 'wl-item';
      row.innerHTML = `
                <div class="color-marker ${item.color || 'none'}"></div>
                <div class="ticker-box">
                    <div class="ticker">${item.ticker}</div>
                    <div class="exc">${item.exchange}</div>
                </div>
                <button class="icon-btn" id="tv-${item.ticker}">${ICONS.tv}</button>
                <button class="icon-btn" id="del-${item.ticker}">${ICONS.trash}</button>
            `;

      // Color Cycle
      row.querySelector('.color-marker').onclick = () => { Store.toggleColor(item.ticker); this.renderContent(); };

      // Navigation
      row.querySelector('.ticker-box').onclick = () => window.location.href = `https://www.screener.in/company/${item.ticker}/`;
      row.querySelector(`#tv-${item.ticker}`).onclick = () => {
        window.open(`https://in.tradingview.com/chart/?symbol=${item.exchange}:${item.ticker}`, '_blank');
      };
      row.querySelector(`#del-${item.ticker}`).onclick = () => { Store.removeSymbol(item.ticker); this.renderContent(); };

      area.appendChild(row);
    });
  }

  renderSettings(area) {
    const div = document.createElement('div');
    div.style.padding = '15px';
    div.innerHTML = `
            <h3>Settings</h3>
            <div style="margin-bottom:15px">
                <label><input type="checkbox" id="chk-theme" ${Store.state.settings.theme === 'dark' ? 'checked' : ''}> Dark Mode</label><br>
                <label><input type="checkbox" id="chk-wl" ${Store.state.settings.showColWatchlist ? 'checked' : ''}> Show Watch Column</label><br>
                <label><input type="checkbox" id="chk-tv" ${Store.state.settings.showColTv ? 'checked' : ''}> Show Chart Column</label>
            </div>
            <hr style="border:0; border-top:1px solid var(--et-border);">
            <h4>Data Management</h4>
            <button class="btn-primary" id="btn-export">Export CSV</button>
            <div style="margin-top:15px">
                <label>Import CSV (Ticker, Exchange)</label>
                <textarea id="import-text" placeholder="RELIANCE, NSE\nTCS, NSE"></textarea>
                <button class="btn-primary" style="margin-top:5px" id="btn-import">Import</button>
            </div>
        `;

    // Toggles
    div.querySelector('#chk-theme').onchange = (e) => { Store.state.settings.theme = e.target.checked ? 'dark' : 'light'; Store.save(); };
    div.querySelector('#chk-wl').onchange = (e) => { Store.state.settings.showColWatchlist = e.target.checked; Store.save(); Injector.process(true); };
    div.querySelector('#chk-tv').onchange = (e) => { Store.state.settings.showColTv = e.target.checked; Store.save(); Injector.process(true); };

    // Export (Restored)
    div.querySelector('#btn-export').onclick = () => {
      let csv = "Ticker,Exchange,Color,Watchlist\n";
      Store.state.watchlists.forEach(wl => {
        wl.symbols.forEach(s => { csv += `${s.ticker},${s.exchange},${s.color || 'none'},${wl.name}\n`; });
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'eventrade_backup.csv';
      a.click();
    };

    // Import (Restored)
    div.querySelector('#btn-import').onclick = () => {
      const txt = div.querySelector('#import-text').value;
      if (txt) {
        const count = Store.importCSV(txt);
        alert(`Imported ${count} symbols to active watchlist.`);
        this.currentView = 'list';
        this.renderContent();
      }
    };

    area.appendChild(div);
  }

  toggle() { Store.state.isOpen = !Store.state.isOpen; Store.save(); Store.state.isOpen ? this.open() : this.close(); }
  open() { this.shadow.getElementById('sidebar').classList.add('open'); document.body.style.marginRight = `${Store.state.width}px`; }
  close() { this.shadow.getElementById('sidebar').classList.remove('open'); document.body.style.marginRight = '0'; }
}
const SidebarInstance = new Sidebar();

// ==========================================
// 6. INJECTOR (Integrated with Multi-List)
// ==========================================
const Injector = {
  init() { this.process(); setInterval(() => this.process(), 1500); },

  process(force) {
    document.querySelectorAll("table.data-table").forEach(table => {
      this.injectHeaders(table, force);
      this.injectRows(table);
    });
  },

  injectHeaders(table, force) {
    const theadRow = table.querySelector("thead tr");
    if (!theadRow) return;

    let wlHeader = theadRow.querySelector('.et-head-wl');
    if (!Store.state.settings.showColWatchlist && wlHeader) wlHeader.remove();
    if (Store.state.settings.showColWatchlist && !wlHeader) {
      wlHeader = document.createElement("th");
      wlHeader.className = 'et-head-wl';
      wlHeader.innerText = "Watch";
      wlHeader.style = "width:50px; font-size:13px; text-align:center;";
      theadRow.insertBefore(wlHeader, theadRow.firstChild);
    }

    let tvHeader = theadRow.querySelector('.et-head-tv');
    if (!Store.state.settings.showColTv && tvHeader) tvHeader.remove();
    if (Store.state.settings.showColTv && !tvHeader) {
      tvHeader = document.createElement("th");
      tvHeader.className = 'et-head-tv';
      tvHeader.innerText = "Chart";
      tvHeader.style = "width:50px; font-size:13px; text-align:center;";
      wlHeader ? wlHeader.after(tvHeader) : theadRow.insertBefore(tvHeader, theadRow.firstChild);
    }
  },

  injectRows(table) {
    table.querySelectorAll("tbody tr").forEach(row => {
      const link = row.querySelector("a[href*='/company/']");
      if (!link) return;
      const rawTicker = Utils.extractTickerFromUrl(link.getAttribute("href"));
      if (!rawTicker) return;

      // Watchlist Button
      if (Store.state.settings.showColWatchlist && !row.querySelector('.et-col-wl')) {
        const td = document.createElement("td");
        td.className = 'et-col-wl';
        td.style = "cursor:pointer; text-align:center;";
        td.innerHTML = `<div style="color:#ccc; transition:0.2s;">${ICONS.plus}</div>`;
        td.onclick = (e) => {
          e.preventDefault(); e.stopPropagation();
          // Adds to currently selected active watchlist
          Store.addSymbol(rawTicker, /^\d+$/.test(rawTicker) ? 'BSE' : 'NSE');
          SidebarInstance.renderContent();
          td.innerHTML = `<div style="color:var(--et-green); transform:scale(1.2);">${ICONS.plus}</div>`;
          if (!Store.state.isOpen) SidebarInstance.toggle();
        };
        row.insertBefore(td, row.firstChild);
      }

      // TV Button
      if (Store.state.settings.showColTv && !row.querySelector('.et-col-tv')) {
        const td = document.createElement("td");
        td.className = 'et-col-tv';
        td.style.textAlign = 'center';
        const isVisited = Store.isVisited(rawTicker);
        const bg = isVisited ? '#673ab7' : '#2962ff';
        const btn = document.createElement('a');
        btn.innerText = rawTicker.substring(0, 4);
        btn.style.cssText = `display:inline-block; background:${bg}; color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:3px; text-decoration:none; cursor:pointer; min-width:38px; text-align:center;`;

        btn.onclick = async (e) => {
          e.preventDefault(); e.stopPropagation();
          Store.markVisited(rawTicker);
          btn.style.background = '#673ab7';
          btn.innerText = "...";
          const resolved = await Utils.resolveSymbol(rawTicker);
          btn.innerText = rawTicker.substring(0, 4);
          window.open(`https://in.tradingview.com/chart/?symbol=${resolved.exchange}:${resolved.ticker}`, '_blank');
        };
        td.appendChild(btn);
        const ref = row.querySelector('.et-col-wl') ? row.querySelector('.et-col-wl').nextSibling : row.firstChild;
        row.insertBefore(td, ref);
      }
    });
  }
};

(async function () { await Store.init(); SidebarInstance.init(); Injector.init(); })();