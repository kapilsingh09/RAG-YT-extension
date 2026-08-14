// Generate a unique session ID for the backend conversation
function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substring(2, 15);
}

// Configuration
const API_BASE_URL = "http://localhost:8000";

// State
let currentVideoInfo = null;
let sessionId = null;
let savedApiKey = '';
let isBannerVisible = true;
let isModelPillVisible = true;
let currentActiveBotMessageDiv = null;

// DOM Elements
const videoTitleEl = document.getElementById('video-title');
const videoThumbnailEl = document.getElementById('video-thumbnail');
const chatHistoryEl = document.getElementById('chat-history');
const questionInput = document.getElementById('question-input');
const askBtn = document.getElementById('ask-btn');
const resetBtn = document.getElementById('reset-btn');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');

const modelSelect = document.getElementById('model-select');
const apiKeyContainer = document.getElementById('api-key-container');
const apiKeyInput = document.getElementById('api-key-input');
const saveSetupBtn = document.getElementById('save-setup-btn');

const setupContainer = document.getElementById('setup-container');
const activeModelText = document.getElementById('active-model-text');
const modelPillContainer = document.getElementById('model-pill-container');
const modelPill = document.getElementById('model-pill');

// Toggle Elements
const toggleBannerBtn = document.getElementById('toggle-banner-btn');
const toggleBannerIcon = document.getElementById('toggle-banner-icon');
const videoBanner = document.getElementById('video-banner');

const toggleModelBtn = document.getElementById('toggle-model-btn');
const toggleModelIcon = document.getElementById('toggle-model-icon');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get the current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    if (tab && tab.url && tab.url.includes('youtube.com/watch')) {
        const urlParams = new URL(tab.url).searchParams;
        const videoId = urlParams.get('v');
        
        if (videoId) {
            currentVideoInfo = {
                url: tab.url,
                videoId: videoId,
                title: tab.title.replace(/^\(\d+\)\s*/, '').replace(' - YouTube', '')
            };
            
            videoTitleEl.textContent = currentVideoInfo.title;
            videoTitleEl.title = currentVideoInfo.title;
            
            videoThumbnailEl.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
            videoThumbnailEl.style.display = 'block';
            
            questionInput.disabled = false;
            askBtn.disabled = false;

            loadState(videoId);

        } else {
            videoTitleEl.textContent = "Status: Invalid YouTube URL";
            renderMessage("bot", "Could not detect video ID from URL.", true);
        }
    } else {
        videoTitleEl.textContent = "Status: Not on a YouTube video";
        renderMessage("bot", "Please open a YouTube video first to use YouTube RAG.", true);
    }
});

// Load state from storage
function loadState(videoId) {
    chrome.storage.local.get([
        'apiKey', 'selectedModel', 'videoId', 'sessionId', 
        'chatHistory', 'isBannerVisible', 'isModelPillVisible',
        'isGenerating', 'currentStream', 'currentError'
    ], (result) => {
        
        // Restore Toggles
        if (result.isBannerVisible !== undefined) {
            isBannerVisible = result.isBannerVisible;
            updateBannerVisibility();
        }
        if (result.isModelPillVisible !== undefined) {
            isModelPillVisible = result.isModelPillVisible;
            updateModelPillVisibility();
        }

        // Restore API Key and Model
        if (result.selectedModel) {
            modelSelect.value = result.selectedModel;
            updateActiveModelText();
        }
        if (result.apiKey) {
            savedApiKey = result.apiKey;
            apiKeyInput.value = savedApiKey;
        }
        
        // Show/Hide API key input based on model
        updateSettingsUI();

        // Check if settings are missing
        if (result.selectedModel !== 'free' && !result.apiKey) {
            showSetupView();
        }

        // Restore chat history if video matches
        if (result.videoId === videoId && result.sessionId) {
            sessionId = result.sessionId;
            const history = result.chatHistory || [];
            renderChatHistory(history);
            
            // Resume stream if currently generating
            if (result.isGenerating) {
                setLoadingState(true);
                if (result.currentStream) {
                    // Update existing stream
                    currentActiveBotMessageDiv = document.createElement('div');
                    currentActiveBotMessageDiv.classList.add('message', 'bot-message');
                    currentActiveBotMessageDiv.textContent = result.currentStream;
                    chatHistoryEl.appendChild(currentActiveBotMessageDiv);
                    scrollToBottom();
                } else {
                    // Start thinking indicator
                    currentActiveBotMessageDiv = addLoadingIndicator();
                }
            } else if (result.currentError) {
                renderMessage("bot", result.currentError, true);
                chrome.storage.local.set({ currentError: null }); // clear after showing
            }

        } else {
            // New video or no history, start fresh
            sessionId = generateSessionId();
            const initMsg = [{ sender: 'bot', text: "Hello! I'm ready to answer questions about this video. What would you like to know?" }];
            chrome.storage.local.set({ 
                videoId: videoId, 
                sessionId: sessionId, 
                chatHistory: initMsg,
                isGenerating: false,
                currentStream: "",
                currentError: null
            });
            renderChatHistory(initMsg);
        }
    });
}

function updateActiveModelText() {
    let modelName = "Free Model";
    if (modelSelect.value === 'gemini') modelName = "Gemini";
    if (modelSelect.value === 'grok') modelName = "Grok";
    activeModelText.textContent = modelName;
}

function updateSettingsUI() {
    if (modelSelect.value === 'free') {
        apiKeyContainer.classList.add('hidden');
    } else {
        apiKeyContainer.classList.remove('hidden');
    }
}

function showSetupView() {
    setupContainer.classList.remove('hidden');
    setupContainer.classList.add('flex');
}

function hideSetupView() {
    setupContainer.classList.add('hidden');
    setupContainer.classList.remove('flex');
}

// --- Toggle Logic ---

function updateBannerVisibility() {
    if (isBannerVisible) {
        videoBanner.classList.remove('hidden-banner');
        toggleBannerIcon.classList.remove('fa-chevron-down');
        toggleBannerIcon.classList.add('fa-chevron-up');
    } else {
        videoBanner.classList.add('hidden-banner');
        toggleBannerIcon.classList.remove('fa-chevron-up');
        toggleBannerIcon.classList.add('fa-chevron-down');
    }
}

toggleBannerBtn.addEventListener('click', () => {
    isBannerVisible = !isBannerVisible;
    chrome.storage.local.set({ isBannerVisible });
    updateBannerVisibility();
});

function updateModelPillVisibility() {
    if (isModelPillVisible) {
        modelPill.classList.remove('opacity-0', 'scale-90', 'absolute');
        modelPill.classList.add('opacity-100', 'scale-100');
        setTimeout(() => { if (isModelPillVisible) modelPill.style.visibility = 'visible'; }, 300);
        toggleModelIcon.classList.remove('fa-eye');
        toggleModelIcon.classList.add('fa-eye-slash');
    } else {
        modelPill.classList.remove('opacity-100', 'scale-100');
        modelPill.classList.add('opacity-0', 'scale-90', 'absolute');
        setTimeout(() => { if (!isModelPillVisible) modelPill.style.visibility = 'hidden'; }, 300);
        toggleModelIcon.classList.remove('fa-eye-slash');
        toggleModelIcon.classList.add('fa-eye');
    }
}

toggleModelBtn.addEventListener('click', () => {
    isModelPillVisible = !isModelPillVisible;
    chrome.storage.local.set({ isModelPillVisible });
    updateModelPillVisibility();
});

// --- Event Listeners ---

settingsBtn.addEventListener('click', () => showSetupView());
closeSettingsBtn.addEventListener('click', () => hideSetupView());

askBtn.addEventListener('click', handleAskQuestion);
questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAskQuestion();
});

resetBtn.addEventListener('click', () => {
    sessionId = generateSessionId();
    const initMsg = [{ sender: 'bot', text: "Conversation reset. What would you like to know?" }];
    chrome.storage.local.set({ 
        sessionId: sessionId, 
        chatHistory: initMsg,
        isGenerating: false,
        currentStream: "",
        currentError: null
    });
    renderChatHistory(initMsg);
});

modelSelect.addEventListener('change', updateSettingsUI);

saveSetupBtn.addEventListener('click', () => {
    const model = modelSelect.value;
    let key = '';
    
    if (model !== 'free') {
        key = apiKeyInput.value.trim();
        if (!key) {
            apiKeyInput.classList.add('border-red-500');
            setTimeout(() => apiKeyInput.classList.remove('border-red-500'), 2000);
            return;
        }
    }
    
    savedApiKey = key;
    chrome.storage.local.set({ 
        selectedModel: model,
        apiKey: savedApiKey 
    });
    
    updateActiveModelText();
    hideSetupView();
});


// --- Live Storage Updates (The Magic) ---

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') return;

    // Chat History updated (either user asked a question, or bot finished)
    if (changes.chatHistory) {
        renderChatHistory(changes.chatHistory.newValue);
    }

    // Streaming updates
    if (changes.currentStream) {
        const streamText = changes.currentStream.newValue;
        if (streamText) {
            // Replace thinking indicator with actual text bubble if it's the first chunk
            if (!currentActiveBotMessageDiv || currentActiveBotMessageDiv.classList.contains('loading')) {
                if (currentActiveBotMessageDiv) currentActiveBotMessageDiv.remove();
                currentActiveBotMessageDiv = document.createElement('div');
                currentActiveBotMessageDiv.classList.add('message', 'bot-message');
                chatHistoryEl.appendChild(currentActiveBotMessageDiv);
            }
            currentActiveBotMessageDiv.textContent = streamText;
            scrollToBottom();
        }
    }

    // Is Generating State Changes
    if (changes.isGenerating) {
        const isGen = changes.isGenerating.newValue;
        setLoadingState(isGen);
        
        if (isGen) {
            // Just started, show thinking indicator
            if (currentActiveBotMessageDiv) currentActiveBotMessageDiv.remove();
            currentActiveBotMessageDiv = addLoadingIndicator();
        } else {
            // Finished generating
            currentActiveBotMessageDiv = null;
        }
    }

    // Errors
    if (changes.currentError && changes.currentError.newValue) {
        renderMessage("bot", changes.currentError.newValue, true);
        chrome.storage.local.set({ currentError: null }); // clear it so it doesn't fire again on reload
    }
});


// --- Ask Question Logic ---

function handleAskQuestion() {
    const question = questionInput.value.trim();
    const model = modelSelect.value;
    const apiKey = savedApiKey;
    
    if (!question || !currentVideoInfo) return;

    if (model !== 'free' && !apiKey) {
        renderMessage("bot", `Please configure your API key for ${model} in settings.`, true);
        showSetupView();
        return;
    }
    
    questionInput.value = '';
    
    // Instead of doing the fetch here, send to background
    chrome.runtime.sendMessage({
        type: "ASK_QUESTION",
        payload: {
            youtube_url: currentVideoInfo.url,
            question: question,
            session_id: sessionId,
            model: model,
            api_key: apiKey
        }
    });
}

// --- DOM Render Functions ---

function renderMessage(sender, text, isError = false) {
    const msgDiv = document.createElement('div');
    if (isError) {
        msgDiv.classList.add('message', 'error-message');
    } else {
        msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    }
    msgDiv.textContent = text;
    chatHistoryEl.appendChild(msgDiv);
    scrollToBottom();
}

function renderChatHistory(historyArr) {
    chatHistoryEl.innerHTML = '';
    if (!historyArr) return;
    historyArr.forEach(msg => {
        renderMessage(msg.sender, msg.text);
    });
}

function addLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('loading');
    
    const spinner = document.createElement('div');
    spinner.classList.add('spinner');
    
    const text = document.createElement('span');
    text.textContent = "Thinking...";
    
    loadingDiv.appendChild(spinner);
    loadingDiv.appendChild(text);
    
    chatHistoryEl.appendChild(loadingDiv);
    scrollToBottom();
    return loadingDiv;
}

function setLoadingState(isLoading) {
    questionInput.disabled = isLoading;
    askBtn.disabled = isLoading;
    if (!isLoading) {
        questionInput.focus();
    }
}

function scrollToBottom() {
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}
