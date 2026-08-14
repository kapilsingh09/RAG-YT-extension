// Configuration
const API_BASE_URL = "http://localhost:8000";

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ASK_QUESTION") {
        // Start streaming process asynchronously
        handleStreamingRequest(message.payload);
        // Respond immediately so popup knows it started
        sendResponse({ status: "started" });
    }
});

async function handleStreamingRequest(payload) {
    try {
        // 1. Initialize state
        await chrome.storage.local.set({
            isGenerating: true,
            currentStream: "",
            currentError: null
        });

        // 2. Add user question to history immediately
        const storageData = await chrome.storage.local.get(['chatHistory']);
        const history = storageData.chatHistory || [];
        history.push({ sender: 'user', text: payload.question });
        await chrome.storage.local.set({ chatHistory: history });

        // 3. Initiate fetch
        const response = await fetch(`${API_BASE_URL}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const contentType = response.headers.get('content-type') || '';

        // 4. Handle JSON Error Responses
        if (contentType.includes('application/json')) {
            const data = await response.json();
            throw new Error(data.error + (data.details ? `: ${data.details}` : ""));
        }

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        // 5. Read Stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullAnswer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            fullAnswer += text;
            
            // Save current chunk to storage so popup can read it
            await chrome.storage.local.set({ currentStream: fullAnswer });
        }

        // 6. Complete Stream: move to history, clear stream
        history.push({ sender: 'bot', text: fullAnswer });
        await chrome.storage.local.set({
            chatHistory: history,
            currentStream: "",
            isGenerating: false
        });

    } catch (error) {
        console.error("Background Fetch Error:", error);
        await chrome.storage.local.set({
            isGenerating: false,
            currentStream: "",
            currentError: error.message || "Network error or backend unavailable"
        });
    }
}
