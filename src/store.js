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
      // 1. Try LOCAL storage first (Preferred)
      let data = await chrome.storage.local.get([STORAGE_KEYS.DATA]);
      
      // 2. Migration: If not in local, check SYNC (Legacy)
      if (!data[STORAGE_KEYS.DATA]) {
        Logger.info("No local data found, checking sync storage for migration...");
        const syncData = await chrome.storage.sync.get([STORAGE_KEYS.DATA]);
        if (syncData[STORAGE_KEYS.DATA]) {
          Logger.info("Migrating data from sync to local...");
          data = syncData;
        }
      }

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
      
      // Save immediately to ensure local has the data (completes migration)
      this.save();
      
      Logger.info(`[Store] Init complete. Loaded ${this.state.watchlists.length} watchlists.`);
      return this.state;
    } catch (e) {
      console.error("Failed to init store:", e); // Fallback: Console because Logger might fail if init fails fundamental things
      return this.state;
    }
  },

  save() {
    Logger.debug("[Store] Saving state to LOCAL storage...");
    const chromeApi = globalThis.chrome;
    if (!chromeApi?.storage?.local?.set) {
      Logger.warn("[Store] Storage API unavailable; skipping save.");
      this.applyTheme();
      Logger.setLevel(this.state.settings.logLevel);
      return;
    }

    try {
      chromeApi.storage.local.set({ [STORAGE_KEYS.DATA]: this.state }, () => {
        const lastError = chromeApi.runtime?.lastError;
        if (lastError) {
          Logger.error(`[Store] Save failed: ${lastError.message}`);
          console.error("Storage Error:", lastError);
        } else {
          Logger.debug("[Store] State saved successfully.");
        }
      });
    } catch (e) {
      const message = e && e.message ? e.message : String(e);
      Logger.error(`[Store] Save failed: ${message}`);
      console.error("Storage Error:", e);
    }
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

  addSymbols(items) {
    const wl = this.activeWatchlist;
    // Filter duplicates
    const toAdd = items.filter(item => !wl.symbols.find(s => s.ticker === item.ticker && s.exchange === item.exchange));
    
    if (toAdd.length > 0) {
      // Prepare items with default props
      const enriched = toAdd.map(s => ({ 
        ticker: s.ticker, 
        exchange: s.exchange, 
        color: 'none', 
        addedAt: Date.now() 
      }));
      // Unshift all at once to preserve order (A,B,C -> A,B,C...Old)
      wl.symbols.unshift(...enriched);
      this.save();
    }
    return toAdd.length;
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
    // Support comma-separated or newline-separated values
    // e.g. "NSE:TCS, NSE:INFY" or "NSE:TCS\nNSE:INFY"
    const tokens = csvText.split(/[\n,]+/).map(t => t.trim()).filter(t => t);
    let count = 0;
    tokens.forEach(token => {
      const [p1, p2] = token.split(':').map(s => s.trim().toUpperCase());
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
