import { Store } from './store.js';
import { ICONS } from './constants.js';
import { Utils } from './utils.js';
import { Scanner } from './scanner.js';
import { Injector } from './injector.js';

export class Sidebar {
  constructor() {
    this.host = document.createElement('div');
    this.host.id = 'et-sidebar-host';
    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.currentView = 'list';
    this.highlightedIndex = -1;
    this.isArmed = false;
    this.debouncedNavigate = Utils.debounce(this.navigateToSymbol.bind(this), 200);
  }

  async init() {
    document.body.appendChild(this.host);
    this.renderStyles();
    this.render();
    
    // Initial state check
    if (Store.state.isOpen) this.open();
    
    // Message listener
    chrome.runtime.onMessage.addListener((msg) => { 
      if (msg.action === 'toggle_sidebar') this.toggle(); 
    });

    this.setupKeyboardHandlers();

    // Auto-arm if previously armed (for persistent navigation)
    if (sessionStorage.getItem('et-sidebar-armed') === 'true') {
      this.arm();
    }

    // Sync highlight from URL initially and on history changes
    this.syncHighlightFromUrl();
    window.addEventListener('popstate', () => this.syncHighlightFromUrl());
  }

  renderStyles() {
    const style = document.createElement('style');
    style.textContent = `
            :host { all: initial; font-family: -apple-system, system-ui, sans-serif; }
            * { box-sizing: border-box; }
            #sidebar {
                position: fixed; top: 0; right: 0; bottom: 0; width: ${Store.state.width}px;
                background: var(--et-bg, #ffffff); color: var(--et-fg, #333333);
                box-shadow: -2px 0 15px rgba(0,0,0,0.2);
                transform: translateX(100%); transition: transform 0.2s ease;
                display: flex; flex-direction: column; z-index: 2147483647; border-left: 1px solid var(--et-border, #e0e0e0);
            }
            #sidebar.open { transform: translateX(0); }
            header { padding: 15px; border-bottom: 1px solid var(--et-border, #e0e0e0); display: flex; justify-content: space-between; align-items: center; background: var(--et-bg, #ffffff); }
            h2 { margin: 0; font-size: 18px; font-weight: 700; }
            .icon-btn { background: transparent; border: none; cursor: pointer; color: var(--et-fg, #333333); padding: 5px; opacity: 0.7; }
            .icon-btn:hover { opacity: 1; background: var(--et-row-hover, #f5f5f5); border-radius:4px; }
            .content { flex: 1; overflow-y: auto; padding: 0; }
            
            /* Watchlist Select Header */
            .wl-select-area { padding: 10px; background: var(--et-row-hover, #f5f5f5); display: flex; gap: 5px; }
            select { flex: 1; padding: 5px; border-radius: 4px; border: 1px solid var(--et-border, #e0e0e0); background: var(--et-bg, #ffffff); color: var(--et-fg, #333333); }
            
            /* List Items */
            .wl-item { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--et-border, #e0e0e0); gap: 8px; }
            .wl-item:hover { background: var(--et-row-hover, #f5f5f5); }
            .color-marker { width: 4px; height: 30px; background: #ddd; cursor: pointer; border-radius: 2px; }
            .color-marker.red { background: var(--et-red, #f44336); }
            .color-marker.green { background: var(--et-green, #4caf50); }
            .color-marker.yellow { background: #ffc107; }
            
            .ticker-box { flex: 1; cursor: pointer; }
            .ticker { font-weight: 600; font-size: 14px; }
            .exc { font-size: 10px; color: #888; }
            
            /* Actions */
            .btn-primary { background: var(--et-accent, #2196f3); color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
            .status-msg { font-size: 11px; color: var(--et-green, #4caf50); margin-top: 5px; text-align: center; }
            textarea { width: 100%; height: 80px; margin-top: 5px; border: 1px solid var(--et-border, #e0e0e0); background: var(--et-bg, #ffffff); color: var(--et-fg, #333333); }
            
            /* Highlight (Keyboard Nav) */
            .wl-item.highlighted {
                background: var(--et-highlight-bg, rgba(33, 150, 243, 0.1));
                border-left: 3px solid var(--et-accent, #2196f3);
            }
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
    const wlSelect = document.createElement('div');
    wlSelect.className = 'wl-select-area';

    // Sync highlight with URL if not set (or always to be safe? prefer current state if valid)
    if (this.highlightedIndex === -1) {
      this.syncHighlightFromUrl();
    }

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

    // Actions (Add / Scan)
    const actions = document.createElement('div');
    actions.style.padding = '10px';
    actions.style.borderBottom = '1px solid var(--et-border, #e0e0e0)';
    actions.innerHTML = `
            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <input type="text" id="add-input" placeholder="Symbol (e.g. TATA)" style="flex:1; padding:6px; border-radius:4px; border:1px solid var(--et-border, #e0e0e0); background:var(--et-bg, #ffffff); color:var(--et-fg, #333333);">
                <button class="btn-primary" id="btn-add">Add</button>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="icon-btn" style="flex:1; border:1px solid var(--et-border, #e0e0e0);" id="btn-scan-page">Scan Page</button>
                <button class="icon-btn" style="flex:1; border:1px solid var(--et-border, #e0e0e0);" id="btn-scan-all">Scan All (50)</button>
            </div>
            <div id="scan-msg" class="status-msg"></div>
        `;

    const addFn = () => {
      const val = actions.querySelector('#add-input').value.toUpperCase().trim();
      if (val) { Store.addSymbol(val, 'NSE'); actions.querySelector('#add-input').value = ''; this.renderContent(); }
    };
    actions.querySelector('#btn-add').onclick = addFn;

    const handleScan = async (all) => {
      const msg = actions.querySelector('#scan-msg');
      msg.innerText = all ? "Scanning pages (max 50)..." : "Scanning page...";

      let count = 0;
      if (all) count = await Scanner.scanAllPages((txt) => msg.innerText = txt);
      else {
        Scanner.extractFromDoc(document).forEach(s => { if (Store.addSymbol(s.ticker, s.exchange)) count++; });
      }

      this.renderContent();
      setTimeout(() => {
        const newMsg = this.shadow.getElementById('scan-msg');
        if (newMsg) newMsg.innerText = `Added ${count} new symbols.`;
      }, 100);
    };

    actions.querySelector('#btn-scan-page').onclick = () => handleScan(false);
    actions.querySelector('#btn-scan-all').onclick = () => handleScan(true);

    area.appendChild(actions);

    // List Container
    const listContainer = document.createElement('div');
    listContainer.id = 'wl-list-container';
    area.appendChild(listContainer);

    // List Items
    Store.activeWatchlist.symbols.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'wl-item';
      if (index === this.highlightedIndex) row.classList.add('highlighted');
      row.dataset.index = index; // Keep index for ref
      row.innerHTML = `
                <div class="color-marker ${item.color || 'none'}"></div>
                <div class="ticker-box">
                    <div class="ticker">${item.ticker}</div>
                    <div class="exc">${item.exchange}</div>
                </div>
                <button class="icon-btn" id="tv-${item.ticker}">${ICONS.tv}</button>
                <button class="icon-btn" id="del-${item.ticker}">${ICONS.trash}</button>
            `;

      row.querySelector('.color-marker').onclick = () => { Store.toggleColor(item.ticker); this.renderContent(); };
      row.querySelector('.ticker-box').onclick = (e) => {
        const isTv = window.location.hostname.includes('tradingview.com');
        const url = isTv
          ? `https://in.tradingview.com/chart/?symbol=${item.exchange}:${item.ticker}`
          : `https://www.screener.in/company/${item.ticker}/`;

        // Arm before navigation to keep focus
        this.arm();

        if (e.ctrlKey || e.metaKey) window.open(url, '_blank');
        else window.location.href = url;
      };
      row.querySelector(`#tv-${item.ticker}`).onclick = () => {
        window.open(`https://in.tradingview.com/chart/?symbol=${item.exchange}:${item.ticker}`, '_blank');
      };
      row.querySelector(`#del-${item.ticker}`).onclick = () => { Store.removeSymbol(item.ticker); this.renderContent(); };

      listContainer.appendChild(row);
    });
  }

  renderSettings(area) {
    const div = document.createElement('div');
    div.style.padding = '15px';
    div.innerHTML = `
            <h3>Settings</h3>
            <div style="margin-bottom:15px">
                <label><input type="checkbox" id="chk-theme" ${Store.state.settings.theme === 'dark' ? 'checked' : ''}> Dark Mode</label><br>
                <label><input type="checkbox" id="chk-wl" ${Store.state.settings.showColWatchlist ? 'checked' : ''}> Show 'WList' (Add to Watchlist) Column</label><br>
                <label><input type="checkbox" id="chk-tv" ${Store.state.settings.showColTv ? 'checked' : ''}> Show 'TrVw' (TradingView) Column</label>
            </div>
            <hr style="border:0; border-top:1px solid var(--et-border, #e0e0e0);">
            <h4>Data Management</h4>
            <button class="btn-primary" id="btn-export">Export CSV</button>
            <div style="margin-top:15px">
                <label>Import CSV (Ticker, Exchange)</label>
                <textarea id="import-text" placeholder="RELIANCE, NSE\nTCS, NSE"></textarea>
                <button class="btn-primary" style="margin-top:5px" id="btn-import">Import</button>
            </div>
        `;

    div.querySelector('#chk-theme').onchange = (e) => { Store.state.settings.theme = e.target.checked ? 'dark' : 'light'; Store.save(); Store.applyTheme(); };
    div.querySelector('#chk-wl').onchange = (e) => { Store.state.settings.showColWatchlist = e.target.checked; Store.save(); Injector.process(true); };
    div.querySelector('#chk-tv').onchange = (e) => { Store.state.settings.showColTv = e.target.checked; Store.save(); Injector.process(true); };

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

  setupKeyboardHandlers() {
    // Global keydown for sidebar shortcuts
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    // Arming logic
    this.host.addEventListener('mousedown', () => this.arm());
    this.host.addEventListener('focusin', () => this.arm());

    // Disarm logic (clicking outside)
    document.addEventListener('mousedown', (e) => {
      if (!this.host.contains(e.target)) {
        this.disarm();
      }
    });
  }

  arm() {
    this.isArmed = true;
    sessionStorage.setItem('et-sidebar-armed', 'true');
    // visual feedback if needed
  }

  disarm() {
    this.isArmed = false;
    sessionStorage.removeItem('et-sidebar-armed');
    // remove visual feedback if needed
  }

  handleKeydown(e) {
    if (!Store.state.isOpen || !this.isArmed || this.currentView !== 'list') return;

    // Safety check: not typing in inputs
    const tag = document.activeElement.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement.isContentEditable) return;

    // Navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.moveHighlight(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.moveHighlight(1);
    }
    // Cross-site shortcuts
    else if (e.key.toUpperCase() === 'T' && window.location.hostname.includes('screener.in')) {
      e.preventDefault();
      this.openCrossSite(true); // Open TV
    } else if (e.key.toUpperCase() === 'S' && window.location.hostname.includes('tradingview.com')) {
      e.preventDefault();
      this.openCrossSite(false); // Open Screener
    }
  }

  moveHighlight(delta) {
    const symbols = Store.activeWatchlist.symbols;
    if (!symbols.length) return;

    let newIndex = this.highlightedIndex + delta;

    // Boundary checks with no wrap
    if (newIndex < 0) newIndex = 0; // Stop at top
    else if (newIndex >= symbols.length) newIndex = symbols.length - 1; // Stop at bottom

    // Special case: if starting from -1
    if (this.highlightedIndex === -1) {
      newIndex = delta > 0 ? 0 : symbols.length - 1;
    }

    if (newIndex !== this.highlightedIndex) {
      this.highlightedIndex = newIndex;
      this.updateHighlightVisuals();
      this.debouncedNavigate();
    }
  }

  updateHighlightVisuals() {
    const container = this.shadow.getElementById('wl-list-container');
    if (!container) return;

    const rows = container.querySelectorAll('.wl-item');
    rows.forEach((row, idx) => {
      if (idx === this.highlightedIndex) {
        row.classList.add('highlighted');
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        row.classList.remove('highlighted');
      }
    });
  }

  navigateToSymbol() {
    const symbol = Store.activeWatchlist.symbols[this.highlightedIndex];
    if (!symbol) return;

    const isTv = window.location.hostname.includes('tradingview.com');
    if (isTv) {
      // TradingView: Update chart in same tab
      // NOTE: TradingView generally reloads page on URL change unless we hook internal router.
      // We will stick to reload for stability as per plan.
      this.arm(); // Ensure we stay armed after reload
      window.location.href = `https://in.tradingview.com/chart/?symbol=${symbol.exchange}:${symbol.ticker}`;
    } else {
      // Screener: Navigate in current tab
      this.arm(); // Ensure we stay armed after reload
      window.location.href = `https://www.screener.in/company/${symbol.ticker}/`;
    }
  }

  openCrossSite(toTv) {
    const symbol = Store.activeWatchlist.symbols[this.highlightedIndex];
    if (!symbol) return;

    let url;
    if (toTv) {
      url = `https://in.tradingview.com/chart/?symbol=${symbol.exchange}:${symbol.ticker}`;
    } else {
      url = `https://www.screener.in/company/${symbol.ticker}/`;
    }
    window.open(url, '_blank');
  }



  syncHighlightFromUrl() {
    const isTv = window.location.hostname.includes('tradingview.com');
    let ticker = null;
    let exchange = null;

    if (isTv) {
      // url param: symbol=NSE:TATA or present in title? 
      // safer to check URL params
      const params = new URLSearchParams(window.location.search);
      const symParam = params.get('symbol'); // e.g. NSE:TATA
      if (symParam) {
        const parts = symParam.split(':');
        if (parts.length === 2) {
          exchange = parts[0];
          ticker = parts[1];
        } else {
          ticker = symParam;
        }
      }
    } else {
      // Screener: /company/TATA/
      ticker = Utils.extractTickerFromUrl(window.location.href);
    }

    if (ticker) {
      const idx = Store.activeWatchlist.symbols.findIndex(s => s.ticker === ticker);
      if (idx !== -1) {
        this.highlightedIndex = idx;
        this.updateHighlightVisuals();
      }
    }
  }

  toggle() { Store.state.isOpen = !Store.state.isOpen; Store.save(); Store.state.isOpen ? this.open() : this.close(); }
  open() { this.shadow.getElementById('sidebar').classList.add('open'); document.body.style.marginRight = `${Store.state.width}px`; }
  close() { this.shadow.getElementById('sidebar').classList.remove('open'); document.body.style.marginRight = '0'; }
}

export const SidebarInstance = new Sidebar();
