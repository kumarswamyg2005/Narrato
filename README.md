# 🎙️ Narrato: Premium AudioBook Studio

Welcome to **Narrato**, a locally-hosted, zero-cost, multi-voice audiobook generation studio and interactive reading web application. 

Narrato allows you to upload any ebook (in **EPUB** or **PDF** format), automatically analyze the text to extract characters using spaCy Natural Language Processing (NLP), assign custom voice characters, and synthesize a complete multi-voice audiobook. During playback, the app provides a premium reading environment with word-for-word synchronized highlighting, animated waveforms, dynamic covers, and interactive player controls.

---

## ✨ Key Features

- **📚 Multi-Format Ingestion**: Ingest PDF and EPUB files. Features a custom BeautifulSoup-powered EPUB parser with DOM heading partitioning to detect and split sections into clean chapters.
- **🧠 Intelligent NLP Character Analysis**: Scans book contents using spaCy (`en_core_web_lg`) Named Entity Recognition to discover characters, estimate their gender, and count their spoken lines.
- **🎭 Custom Voice Cast (Multi-Voice TTS)**: Leverages `edge-tts` (Microsoft Edge TTS engine) to generate warm, professional, human-like voice synthesis. Supports configuring distinct voices for individual characters.
- **⏱️ Word-by-Word Synchronized Highlighting**: Synthesizes exact millisecond-level word alignments to highlight words on-screen in real-time as the audio plays.
- **⚡ Background Task Worker Queue**: Background worker pool managing processing states, queue priority, pause/resume execution support, percent-complete tracking, and real-time ETA estimates.
- **🔌 Interruption Resilience**: Automatically detects and resumes interrupted generation runs on startup, rolling back half-processed chapters and recovering gracefully from database records.
- **🎨 Premium Dark Glassmorphism Design**: Elegant UI designed with custom typography (Syne for headings, Inter for interface, Lora for immersive reading), interactive audio-synchronized waveforms, procedural SVG book covers, and a fully featured marketing landing page.
- **💾 Dual Storage Support**: Easily falls back to local storage (`./tmp/storage/`) for zero-configuration, or configures Cloudflare R2 bucket-based cloud storage.

---

## 🛠️ Architecture & Tech Stack

Narrato is built in two primary components:

### Backend (Python & FastAPI)
- **FastAPI / Uvicorn**: Async REST API endpoints with low latency.
- **SQLite / Supabase Database**: Retains book progress, character records, voice selections, chapter metadata, and audio tracking.
- **spaCy NLP**: Utilizes the large English language model `en_core_web_lg` to carry out character detection.
- **Edge-TTS / Pydub**: Generates speech audio and alignment JSON arrays directly from free Microsoft Edge TTS, processing audio buffers locally.

### Frontend (React & Tailwind CSS v4)
- **React 19 & Vite**: Clean components, blazing fast hot-reloading (HMR).
- **Tailwind CSS v4 & Custom CSS**: A customized, responsive dark-mode styling system featuring deep slate grays, violet accents, and amber highlights.
- **Standard Web Audio API**: Syncs audio position updates with React component state to drive the word highlighter.

---

## 📂 Project Structure

```text
├── backend/
│   ├── main.py            # FastAPI main entrypoint & API endpoints
│   ├── database.py        # Database abstraction layer (SQLite & Supabase adapters)
│   ├── generator.py       # edge-tts speech synthesis & alignment worker
│   ├── queue_manager.py   # Background job runner, task queuing, and status updates
│   ├── nlp.py             # spaCy-based character & dialogue extraction
│   └── storage.py         # File storage manager (Local fallback & Cloudflare R2)
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React dashboard & UI layout (Narrato interface)
│   │   ├── index.css      # Custom design system styles & glassmorphism utilities
│   │   └── main.jsx       # Vite bootstrap entrypoint
│   ├── index.html         # Document template with Google Fonts (Syne, Inter, Lora)
│   ├── package.json       # React & Tailwind dependencies
│   └── vite.config.js     # Dev server proxying and configuration
├── tmp/                   # Local databases, scratchpads, and storage fallbacks (gitignored)
├── start.sh               # Unified bash orchestrator to start the backend and frontend
├── requirements.txt       # Backend dependencies
└── README.md              # Master project documentation
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- **Python 3.11+**
- **Node.js 18+** & **npm**
- **ffmpeg** (needed by `pydub` to stitch or analyze audio tracks)
  - *macOS*: `brew install ffmpeg`
  - *Linux*: `sudo apt install ffmpeg`
  - *Windows*: Download binaries and add them to your system `PATH`.

### Setup and Running (All-in-One script)
Narrato features a unified startup script `start.sh` that automates environment configuration, package installation, NLP model setup, and starts both servers:

1. Clone or copy the project into a folder.
2. Grant executable permissions to the script:
   ```bash
   chmod +x start.sh
   ```
3. Run the script:
   ```bash
   ./start.sh
   ```

The script will:
- Check for a local Python virtual environment (`venv`). If missing, it will create one.
- Activate the virtual environment and install dependencies listed in `requirements.txt`.
- Download the `en_core_web_lg` spaCy language model.
- Spin up the FastAPI backend on `http://localhost:8000`.
- Spin up the Vite React frontend development server on `http://localhost:5173`.

Once started, open **`http://localhost:5173`** (or the port outputted by Vite) in your browser.

---

## ⚙️ Configuration (`.env`)

A configuration template is located in the root directory. Rename it to `.env` or fill in the options directly:

```ini
# Supabase Credentials (Optional: falls back to local SQLite at ./tmp/db.sqlite if left empty)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Cloudflare R2 Storage (Optional: falls back to local folder ./tmp/storage if left empty)
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET_NAME=audiobooks

# Application Settings
MAX_CONCURRENT_JOBS=2
TEMP_DIR=./tmp
# FFMPEG_PATH=/usr/bin/ffmpeg   # Set this if ffmpeg is in a non-standard location
```

---

## 📡 API Endpoints Reference

The FastAPI backend exposes the following REST API endpoints:

### Books Management
- **`POST /api/books/upload`**: Ingest an EPUB or PDF file. Expects form-data parameters `file`, `title` (optional), and `author` (optional). Automatically starts background ingestion.
- **`GET /api/books`**: Retrieve a list of all ingested books and their status/metadata.
- **`GET /api/books/{book_id}`**: Get details of a specific book, including its metadata and its complete chapter index.
- **`GET /api/books/{book_id}/status`**: Returns real-time status details of a book's processing queue (e.g., `percent_complete`, `eta_minutes`, `current_chapter`, and overall state).
- **`POST /api/books/{book_id}/cancel`**: Stop/pause active audio synthesis for the book.
- **`POST /api/books/{book_id}/resume`**: Resume audio synthesis from the last uncompleted chapter.

### Character & Cast Management
- **`GET /api/books/{book_id}/characters`**: Retrieve characters identified by spaCy and their current voice assignments.
- **`PATCH /api/books/{book_id}/characters`**: Update character voice assignments. *Note: Modifying voice mappings will cancel active generation, reset chapters, and re-queue the book for regeneration.*
- **`GET /api/voices`**: List available high-quality English TTS personas, their gender, and descriptions.
- **`GET /api/voices/{voice_id}/preview`**: Retrieve a short dynamic MP3 voice preview stream.

### Audio & Playback Utilities
- **`GET /api/chapters/{chapter_id}/audio`**: Returns the audio URL (static path or Cloudflare R2 presigned URL) for a chapter.
- **`GET /api/chapters/{chapter_id}/timestamps`**: Fetch the complete JSON word-alignment array containing `[{word, start_ms, duration_ms, speaker}]` for reader syncing.
- **`GET /api/chapters/{chapter_id}/text`**: Retrieve the raw chapter text for reader display.
- **`POST /api/progress`**: Persist user playback state (`position_ms`, `word_index`, `chapter_id`).
- **`GET /api/progress/{book_id}`**: Fetch user playback progress for a book to resume right where they left off.

---

## 🛡️ License

Narrato is built for local, free-tier educational use. Audio files and speech models are powered by `edge-tts` and spaCy. Please respect copyright laws regarding materials uploaded and synthesized.
