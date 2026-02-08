/**
 * EvenTrade - Advanced Screener.in Assistant
 * Version 3.1 (Refactored & Modularized)
 */

import { Store } from './store.js';
import { SidebarInstance } from './sidebar.js';
import { Injector } from './injector.js';
import { Logger } from './logger.js';

const INIT_KEY = '__evenTradeInitialized';

if (globalThis[INIT_KEY]) {
  Logger.info('EvenTrade: Already initialized.');
} else {
  globalThis[INIT_KEY] = true;

  (async function main() {
    Logger.info('EvenTrade: Initializing...');
    
    // Initialize Store first
    await Store.init();
    
    // Initialize UI
    await SidebarInstance.init();
    
    // Initialize DOM Injector
    Injector.init();
    
    // Inject TradingView Bridge
    if (window.location.hostname.includes('tradingview.com')) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('src/tv-inject.js');
      (document.head || document.documentElement).appendChild(script);
      Logger.info('EvenTrade: TV Bridge Injected');
    }

    Logger.info('EvenTrade: Ready');
  })();
}
