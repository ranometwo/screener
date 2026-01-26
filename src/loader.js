/**
 * Loader for EvenTrade Modules
 * Chrome Content Scripts default to "classic" scripts. 
 * To use ES Modules, we must import them dynamically.
 */
(async () => {
  const src = chrome.runtime.getURL('src/content.js');
  try {
    await import(src);
  } catch (e) {
    console.error("EvenTrade: Failed to load modules", e);
  }
})();
