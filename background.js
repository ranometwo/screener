chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes("screener.in")) {
        chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" });
    }
});