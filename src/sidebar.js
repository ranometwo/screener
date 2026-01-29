import { Store } from './store.js';
import { Logger } from './logger.js';
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
    this.isResizing = false;
    this.startX = 0;
    this.startWidth = 0;
    this.handleResize = this.handleResize.bind(this);
    this.stopResize = this.stopResize.bind(this);
  }

  async init() {
    document.documentElement.appendChild(this.host);
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

    this.setupResizeHandler();
  }

  renderStyles() {
    const style = document.createElement('style');
    style.textContent = `
            :host { all: initial; font-family: -apple-system, system-ui, sans-serif; }
            * { box-sizing: border-box; }
            #sidebar {
                position: fixed; top: 0; right: 0; bottom: 0; width: ${Store.state.width}px;
                background: var(--et-bg, #ffffff); color: var(--et-fg, #333333);
                /* box-shadow removed for dock style */
                transform: translateX(100%); transition: transform 0.2s ease, width 0.1s ease; /* added width transition */
                display: flex; flex-direction: column; z-index: 2147483647; border-left: 1px solid var(--et-border, #e0e0e0);
            }
            #sidebar.open { transform: translateX(0); }
            #resize-handle {
                position: absolute; left: 0; top: 0; bottom: 0; width: 6px;
                cursor: ew-resize; z-index: 2147483648;
                background: transparent;
                transition: background 0.2s;
            }
            #resize-handle:hover { background: rgba(0,0,0,0.1); }
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
            <div id="resize-handle" title="Drag to resize"></div>
            <header id="sidebar-header"></header>
            <div class="content" id="main-content"></div>
        `;
    this.renderContent();
  }

  updateHeader() {
    const header = this.shadow.getElementById('sidebar-header');
    if (!header) return;

    if (this.currentView === 'settings') {
      header.innerHTML = `
          <div style="display:flex; align-items:center; flex:1;">
              <button id="btn-back" class="icon-btn" style="display:flex; align-items:center; gap:6px; padding: 6px 10px; width:auto; font-weight:600; font-size:14px; opacity:0.9;" title="Back to Watchlist">
                  ${ICONS.arrowLeft}
                  <span>Back</span>
              </button>
          </div>
          <div style="display:flex; gap:5px;">
              <button id="btn-close" class="icon-btn" title="Close">${ICONS.close}</button>
          </div>
      `;
      const btnBack = header.querySelector('#btn-back');
      if (btnBack) {
        btnBack.onclick = () => {
          this.currentView = 'list';
          this.renderContent();
        };
      }
    } else {
      header.innerHTML = `
          <h2>EvenTrade</h2>
          <div style="display:flex; gap:5px;">
              <button id="btn-settings" class="icon-btn" title="Settings">${ICONS.settings}</button>
              <button id="btn-close" class="icon-btn" title="Close">${ICONS.close}</button>
          </div>
      `;
      const btnSettings = header.querySelector('#btn-settings');
      if (btnSettings) {
        btnSettings.onclick = () => {
          this.currentView = 'settings';
          this.renderContent();
        };
      }
    }
    
    const btnClose = header.querySelector('#btn-close');
    if (btnClose) btnClose.onclick = () => this.toggle();
  }

  renderContent() {
    this.updateHeader();
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
            <button class="icon-btn" id="btn-export-wl" title="Export Watchlist">${ICONS.download}</button>
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
    wlSelect.querySelector('#btn-export-wl').onclick = () => {
      const wl = Store.activeWatchlist;
      const symbols = wl.symbols.map(s => `${s.exchange}:${s.ticker}`).join(', ');
      const blob = new Blob([symbols], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${wl.name.replace(/\s+/g, '_')}_export.txt`;
      a.click();
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
    const inputEl = actions.querySelector('#add-input');
    inputEl.onkeydown = (e) => { 
        if(e.key === 'Enter') addFn(); 
        e.stopPropagation(); 
    };
    inputEl.onkeyup = (e) => e.stopPropagation();
    inputEl.onkeypress = (e) => e.stopPropagation();
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
      row.querySelector('.ticker-box').onclick = async (e) => {
        let ticker = item.ticker;
        let exchange = item.exchange;

        // Resolve BSE if numeric
        if (exchange === 'BSE' && /^\d+$/.test(ticker)) {
           const resolved = await Utils.resolveSymbol(ticker);
           ticker = resolved.ticker;
           // We keep exchange as BSE
        }

        const isTv = window.location.hostname.includes('tradingview.com');
        const url = isTv
          ? `https://in.tradingview.com/chart/?symbol=${exchange}:${ticker}`
          : `https://www.screener.in/company/${item.ticker}/`; // Use original ticker for screener for robustness? Or resolved? Screener handles slugs usually.

        // Arm before navigation to keep focus
        this.arm();

        if (e.ctrlKey || e.metaKey) {
            window.open(url, '_blank');
        } else if (isTv) {
            // TradingView soft navigation
            const fullSymbol = `${exchange}:${ticker}`;
            const success = await this.setTradingViewSymbol(fullSymbol);
            if (!success) {
                window.location.href = url;
            } else {
                this.highlightedIndex = index;
                this.updateHighlightVisuals();
            }
        } else {
            window.location.href = url;
        }
      };
      row.querySelector(`#tv-${item.ticker}`).onclick = async () => {
        let ticker = item.ticker;
        if (item.exchange === 'BSE' && /^\d+$/.test(ticker)) {
           const resolved = await Utils.resolveSymbol(ticker);
           ticker = resolved.ticker;
        }
        window.open(`https://in.tradingview.com/chart/?symbol=${item.exchange}:${ticker}`, '_blank');
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
                <div style="margin-top:10px; display:flex; align-items:center; gap:10px;">
                   <label for="sel-loglevel">Log Level:</label>
                   <select id="sel-loglevel" style="flex:1">
                     <option value="ERROR" ${Store.state.settings.logLevel === 'ERROR' ? 'selected' : ''}>Error</option>
                     <option value="WARN" ${Store.state.settings.logLevel === 'WARN' ? 'selected' : ''}>Warn</option>
                     <option value="INFO" ${Store.state.settings.logLevel === 'INFO' ? 'selected' : ''}>Info</option>
                     <option value="DEBUG" ${Store.state.settings.logLevel === 'DEBUG' ? 'selected' : ''}>Debug</option>
                   </select>
                </div>
            </div>
            <hr style="border:0; border-top:1px solid var(--et-border, #e0e0e0);">
            <h4>Data Management</h4>
            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <button class="btn-primary" id="btn-export-all" style="flex:1" title="Backup all data as CSV">Backup All</button>
            </div>
            <div style="margin-top:15px">
                <label>Import (NSE:TCS, BSE:INFY - Comma or Newline)</label>
                <textarea id="import-text" placeholder="RELIANCE, NSE\nTCS, NSE"></textarea>
                <button class="btn-primary" style="margin-top:5px" id="btn-import">Import</button>
            </div>
        `;

    div.querySelector('#chk-theme').onchange = (e) => { Store.state.settings.theme = e.target.checked ? 'dark' : 'light'; Store.save(); Store.applyTheme(); };
    div.querySelector('#chk-wl').onchange = (e) => { Store.state.settings.showColWatchlist = e.target.checked; Store.save(); Injector.process(true); };
    div.querySelector('#chk-tv').onchange = (e) => { Store.state.settings.showColTv = e.target.checked; Store.save(); Injector.process(true); };
    div.querySelector('#sel-loglevel').onchange = (e) => { Store.state.settings.logLevel = e.target.value; Store.save(); };

    div.querySelector('#btn-export-all').onclick = () => {
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
    // Check main document active element
    let activeTag = document.activeElement.tagName.toLowerCase();
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || document.activeElement.isContentEditable) return;

    // Check shadow DOM active element (if focused element is the host)
    if (this.host === document.activeElement && this.shadow.activeElement) {
        activeTag = this.shadow.activeElement.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || this.shadow.activeElement.isContentEditable) return;
    }

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

  async navigateToSymbol() {
    const symbolItem = Store.activeWatchlist.symbols[this.highlightedIndex];
    if (!symbolItem) return;

    let ticker = symbolItem.ticker;
    let exchange = symbolItem.exchange;

    // Resolve BSE if numeric
    if (exchange === 'BSE' && /^\d+$/.test(ticker)) {
        const resolved = await Utils.resolveSymbol(ticker);
        ticker = resolved.ticker;
        // Keep exchange as BSE
    }

    const isTv = window.location.hostname.includes('tradingview.com');
    if (isTv) {
      // TradingView: Try soft navigation first
      const fullSymbol = `${exchange}:${ticker}`;
      const success = await this.setTradingViewSymbol(fullSymbol);

      this.arm(); // Ensure we stay armed

      if (!success) {
        // Fallback to reload if UI automation fails
        Logger.warn("[EvenTrade] Soft nav failed, falling back to reload");
        window.location.href = `https://in.tradingview.com/chart/?symbol=${fullSymbol}`;
      } else {
        Logger.debug("Soft nav dispatched");
      }
    } else {
      // Screener: Navigate in current tab
      this.arm(); // Ensure we stay armed after reload
      // For screener, we can usually use the numeric ticker or the original one
      // But let's use the item's original ticker for consistency with how Screener works
      window.location.href = `https://www.screener.in/company/${symbolItem.ticker}/`;
    }
  }

  async setTradingViewSymbol(symbol) {
    // Soft Navigation via Injection Bridge
    // We cannot access TradingViewApi directly from the content script (Sidebar).
    // Instead, we dispatch a custom event that the injected script (tv-inject.js) listens to.
    Logger.debug(`Attempting soft nav via Injection to: ${symbol}`);
    
    let exchange = 'NSE';
    let ticker = symbol;
    
    if (symbol.includes(':')) {
        [exchange, ticker] = symbol.split(':');
    }

    document.dispatchEvent(new CustomEvent("change_tradingview_symbol", {
        detail: {
            symbol: ticker,
            exchange: exchange
        }
    }));
    
    return true; 
  }

  waitForEl(selector, timeout) {
    return new Promise(resolve => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
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

  open() {
    this.shadow.getElementById('sidebar').classList.add('open');
    this.updatePageLayout(Store.state.width);
  }

  close() {
    this.shadow.getElementById('sidebar').classList.remove('open');
    this.updatePageLayout(0);
  }

  updatePageLayout(width) {
    const isTv = window.location.hostname.includes('tradingview.com');
    if (isTv) {
      // TradingView: Resize body width to force layout recalculation
      // We use 100vw - width because TV uses fixed positioning relative to viewport often
      // We also use transform: translateZ(0) to force body to be the containing block for fixed elements (like the layout sensor)
      if (width > 0) {
        document.body.style.width = `calc(100vw - ${width}px)`;
        document.body.style.transform = 'translateZ(0)';
        // Trigger resize to ensure TV re-calculates immediately
        window.dispatchEvent(new Event('resize'));
      } else {
        document.body.style.width = '';
        document.body.style.transform = '';
        window.dispatchEvent(new Event('resize'));
      }
    } else {
      // Screener.in: Margin Right works fine
      document.body.style.marginRight = width > 0 ? `${width}px` : '0';
      document.body.style.width = ''; // Reset width
    }
  }

  setupResizeHandler() {
    const handle = this.shadow.getElementById('resize-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault(); // update: prevent text selection
      this.isResizing = true;
      this.startX = e.clientX;
      this.startWidth = Store.state.width;

      const sidebar = this.shadow.getElementById('sidebar');
      if (sidebar) sidebar.style.transition = 'none'; // disable transition for smooth drag

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';

      window.addEventListener('mousemove', this.handleResize);
      window.addEventListener('mouseup', this.stopResize);
    });
  }

  handleResize(e) {
    if (!this.isResizing) return;
    const delta = this.startX - e.clientX; // Move left = positive delta = increase width
    let newWidth = this.startWidth + delta;

    // Constraints
    if (newWidth < 250) newWidth = 250;
    if (newWidth > 800) newWidth = 800;

    const sidebar = this.shadow.getElementById('sidebar');
    if (sidebar) sidebar.style.width = `${newWidth}px`;

    // Only update layout if open
    if (Store.state.isOpen) {
      this.updatePageLayout(newWidth);
    }
  }

  stopResize() {
    this.isResizing = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    window.removeEventListener('mousemove', this.handleResize);
    window.removeEventListener('mouseup', this.stopResize);

    const sidebar = this.shadow.getElementById('sidebar');
    if (sidebar) {
      sidebar.style.transition = 'transform 0.2s ease, width 0.1s ease'; // restore
      Store.state.width = parseInt(sidebar.style.width, 10);
      Store.save();
    }
  }
}

export const SidebarInstance = new Sidebar();
