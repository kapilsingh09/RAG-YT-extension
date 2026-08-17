# YouTube RAG Extension

A browser extension and FastAPI backend that lets you chat with YouTube videos. It uses Retrieval-Augmented Generation (RAG) to understand the video transcript and answer your questions based on the context of the video you are watching.

## Why isn't this deployed?

I built this project primarily for personal use. I am intentionally not hosting a public instance of the backend because of security concerns and various edge cases (like rate limits, API key abuse, and handling malicious inputs). 

If you want to use it or deploy it for yourself, you are completely free to do so! The code is open and ready to be hosted on your own infrastructure.

## How to use the extension

The system is split into two parts: the browser extension (frontend) and the Python API (backend). You can run everything locally on your machine.

### 1. Starting the Backend

We have Docker support to make running the backend as painless as possible, but you can also run it locally via Python.

**Using Docker (Recommended):**
1. Make sure Docker is installed on your machine.
2. Navigate to the `backend` folder in your terminal:
   ```bash
   cd backend
   ```
3. Build the Docker image:
   ```bash
   docker build -t yt-rag-backend .
   ```
4. Run the container:
   ```bash
   docker run -p 8000:8000 yt-rag-backend
   ```
*(Note: If you have API keys in your `.env` file, make sure they are passed to the container appropriately).*

**Running locally without Docker:**
1. Navigate to the `backend` folder.
2. Create a virtual environment and install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```

### 2. Loading the Extension (Frontend)

1. Open your Chromium-based browser (Chrome, Edge, Brave, etc.).
2. Go to your extensions page by typing `chrome://extensions/` in the address bar.
3. Turn on **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left.
5. Select the `frontend` folder from this repository.

### 3. Chatting with Videos

1. Go to any YouTube video.
2. Click on the new extension icon in your browser toolbar to open the chat interface.
3. The extension will automatically detect the video you are watching.
4. Start asking questions about the video!
