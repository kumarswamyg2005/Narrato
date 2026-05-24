#!/bin/bash

# Terminate background tasks on exit
trap "kill 0" EXIT

echo "=== Starting AudioBook Studio ==="

# Check virtual environment
if [ ! -d "venv" ]; then
    echo "Creating python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if requirements.txt changed or spacy not installed
if ! python3 -c "import spacy" &>/dev/null; then
    echo "Installing missing dependencies..."
    pip install -r requirements.txt
    python3 -m spacy download en_core_web_lg
fi

echo "--> Starting FastAPI backend on http://localhost:8000..."
# Start backend in the background
PYTHONPATH=. uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "--> Starting Vite React frontend on http://localhost:3000..."
# Start frontend dev server
npm --prefix frontend run dev &
FRONTEND_PID=$!

# Wait for both background processes
wait $BACKEND_PID $FRONTEND_PID
