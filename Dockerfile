# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Run the FastAPI backend and serve static files
FROM python:3.11-slim

# Prevent python from writing pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies including ffmpeg (for pydub audio stitching)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy python requirements file
COPY requirements.txt /app/

# Install python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Download spaCy English NLP model used by backend for dialogue extraction
RUN python -m spacy download en_core_web_lg

# Copy backend code
COPY backend /app/backend
# Copy built frontend assets to /app/frontend/dist
COPY --from=frontend-builder /frontend/dist /app/frontend/dist

# Expose the API port (defaulting to 8000, can be overridden by PORT env)
EXPOSE 8000

# Start uvicorn server serving backend and static frontend
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
