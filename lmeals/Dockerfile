# Stage 1: Build the frontend
FROM node:22-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Final image
FROM python:3.11-slim
WORKDIR /app

# Install build dependencies, ffmpeg for audio processing, and nodejs for yt-dlp
RUN apt-get update && apt-get install -y gcc ffmpeg nodejs && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-builder /app/frontend/dist ./static
EXPOSE 8000
COPY run.sh .
RUN chmod +x run.sh
CMD ["./run.sh"]
