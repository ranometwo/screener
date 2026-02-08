chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes("screener.in") || tab.url.includes("tradingview.com")) {
        chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'FETCH_PAGE') {
        fetch(request.url)
            .then(async response => {
                const text = await response.text();
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}, body: ${text.substring(0, 200)}`);
                }
                return { text, url: response.url, status: response.status };
            })
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
    }
});