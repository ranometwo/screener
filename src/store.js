import { STORAGE_KEYS } from './constants.js';

import { Logger } from './logger.js';

export const Store = {
  state: {
    isOpen: false,
    width: 350,
    watchlists: [{ id: 'default', name: 'My Watchlist', symbols: [] }],
    activeWatchlistId: 'default',
    visited: [],
    settings: {
      theme: 'light',
      showColWatchlist: true,
      showColTv: true,
      logLevel: 'INFO'
    }
  },

  async init() {
    try {
      const data = await chrome.storage.sync.get([STORAGE_KEYS.DATA]);
      if (data[STORAGE_KEYS.DATA]) {
        this.state = { ...this.state, ...data[STORAGE_KEYS.DATA] };
        
        // Ensure default structure if missing (migration)
        if (!this.state.settings.logLevel) this.state.settings.logLevel = 'INFO';

        // Migration check: if coming from v2.3 (single array), migrate to multi-list
        if (Array.isArray(this.state.watchlist)) {
          this.state.watchlists[0].symbols = this.state.watchlist;
          delete this.state.watchlist;
        }
      }
      
      // Initialize Logger
      Logger.setLevel(this.state.settings.logLevel);
      
      return this.state;
    } catch (e) {
      console.error("Failed to init store:", e); // Fallback: Console because Logger might fail if init fails fundamental things
      return this.state;
    }
  },

  save() {
    chrome.storage.sync.set({ [STORAGE_KEYS.DATA]: this.state });
    this.applyTheme();
    // Update logger level on save
    Logger.setLevel(this.state.settings.logLevel);
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
    if (this.state.watchlists.length <= 1) throw new Error("Cannot delete the last watchlist.");
    this.state.watchlists = this.state.watchlists.filter(w => w.id !== id);
    this.state.activeWatchlistId = this.state.watchlists[0].id;
    this.save();
  },

  // --- SYMBOL ACTIONS ---
  addSymbol(ticker, exchange) {
    const wl = this.activeWatchlist;
    const exists = wl.symbols.find(s => s.ticker === ticker && s.exchange === exchange);
    if (!exists) {
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

  // --- IMPORT/EXPORT ---
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
