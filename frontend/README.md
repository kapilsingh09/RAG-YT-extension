# YouTube RAG Chatbot Extension

A production-quality Chrome Extension (Manifest V3) that allows users to chat with the YouTube video they are currently watching using Retrieval-Augmented Generation (RAG).

## Features

- **Automatic Video Detection**: Detects the active YouTube video's URL and title automatically.
- **Modern UI**: Clean, responsive, and dark-themed interface.
- **Conversational Memory**: Remembers context from previous questions within a session.
- **Error Handling**: Graceful fallback when transcripts are disabled or backend is offline.
- **RAG Architecture**: Leverages FastAPI, LangChain, FAISS, and HuggingFace for intelligent QA.

## Architecture

1. **Popup (`popup.js`)**: The frontend UI. Detects the current YouTube URL and captures the user's question.
2. **Background (`background.js`)**: Acts as a middleman to bypass CORS limitations safely. Sends POST requests to the FastAPI backend.
3. **Content Script (`content.js`)**: Injected into YouTube pages. Ready to support in-page UI integrations in the future.
4. **FastAPI Backend**: Fetches the YouTube transcript, chunks it, embeds it, and runs RAG with an LLM.

## Folder Structure

```
youtube-rag-extension/
│
├── manifest.json        # Extension configuration (Manifest V3)
│
├── popup/
│   ├── popup.html       # UI Layout
│   ├── popup.css        # Styling
│   └── popup.js         # UI Logic & Interaction
│
├── content/
│   └── content.js       # Injected into YouTube tabs
│
├── background/
│   └── background.js    # Service worker handling network requests
│
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
└── README.md
```

## Installation

### 1. Load the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer Mode** using the toggle in the top right corner.
3. Click the **Load unpacked** button.
4. Select the `youtube-rag-extension` folder.
5. The extension will appear in your Chrome toolbar.

### 2. Start the FastAPI Backend

1. Navigate to your FastAPI project folder.
2. Ensure you have the required dependencies (`fastapi`, `langchain`, `youtube-transcript-api`, etc.).
3. Add your `HF_API_KEY` in `main.py`.
4. Run the backend locally:
   ```bash
   uvicorn main:app --reload
   ```
5. The backend will start on `http://localhost:8000`.

## How to Configure API URL

If you deploy your backend, change the `API_BASE_URL` in `background/background.js`:
```javascript
const API_BASE_URL = "https://your-production-url.com";
```

## How the RAG Pipeline Works

1. User opens a YouTube video and asks a question in the extension.
2. The extension sends `{ session_id, question, youtube_url }` to the FastAPI backend.
3. The backend extracts the video ID and fetches the auto-generated transcript using `youtube-transcript-api`.
4. The transcript is split into smaller, overlapping chunks using LangChain text splitters.
5. Chunks are embedded and stored in a temporary FAISS vector database.
6. The user's question is used to retrieve the most relevant chunks via similarity search.
7. The question, chat history, and retrieved context are sent to a HuggingFace LLM (e.g., Qwen).
8. The LLM generates a response based *only* on the provided context.
9. The backend returns the answer to the extension, which displays it to the user.

## Troubleshooting

- **Extension says "Unable to connect to the RAG server"**: Make sure your FastAPI server is running on `http://localhost:8000` and `uvicorn` hasn't crashed.
- **"Transcripts are disabled for this video"**: The RAG pipeline relies on closed captions. If a creator disabled them, the backend cannot generate context.
- **CORS Issues**: Ensure the request is being made from `background.js` and `host_permissions` include the backend URL in `manifest.json`.

## Future Improvements

- Option to directly embed the chat UI into the YouTube sidebar via `content.js`.
- Persisting chat history to `localStorage` or `chrome.storage.local`.
- Support for summarizing the entire video at a glance.
