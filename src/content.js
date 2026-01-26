/**
 * EvenTrade - Advanced Screener.in Assistant
 * Version 3.1 (Refactored & Modularized)
 */

import { Store } from './store.js';
import { SidebarInstance } from './sidebar.js';
import { Injector } from './injector.js';

(async function main() {
  console.log('EvenTrade: Initializing...');
  
  // Initialize Store first
  await Store.init();
  
  // Initialize UI
  await SidebarInstance.init();
  
  // Initialize DOM Injector
  Injector.init();
  
  console.log('EvenTrade: Ready');
})();
