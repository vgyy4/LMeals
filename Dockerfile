# Stage 1: Build the frontend
FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend
FROM python:3.11-slim AS backend-builder
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
# Copy the built frontend to the backend's static directory
COPY --from=frontend-builder /app/frontend/dist ./static

# Stage 3: Final image
FROM python:3.11-slim
WORKDIR /app
COPY --from=backend-builder /app .
EXPOSE 8000
COPY run.sh .
RUN chmod +x run.sh
CMD ["./run.sh"]
