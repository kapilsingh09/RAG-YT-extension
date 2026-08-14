// Content script runs in the context of the YouTube page
// Currently, the popup can detect the URL via chrome.tabs, 
// so this script is primarily useful if we want to inject UI into the YouTube page itself,
// or extract specific DOM elements (like the description or channel name) that aren't in the URL.

console.log("YouTube RAG Chatbot: Content script loaded.");

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_PAGE_INFO") {
        // Safely extract page-level info
        const pageInfo = {
            title: document.title,
            url: window.location.href
        };
        sendResponse(pageInfo);
    }
    return true; // Keep the message channel open if doing async work
});
