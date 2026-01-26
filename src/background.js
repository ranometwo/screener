chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes("screener.in") || tab.url.includes("tradingview.com")) {
        chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" });
    }
});