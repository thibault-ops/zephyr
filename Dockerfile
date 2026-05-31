# --- Stage 1: Build the React Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build the Express Backend & Package ---
FROM node:22-alpine
WORKDIR /app

# Copy backend package files and install production dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --only=production

# Copy backend source
COPY backend/src ./src
COPY backend/.env* ./

# Copy built frontend assets from Stage 1 into backend's public directory
COPY --from=frontend-builder /app/frontend/dist ./public

# Expose Cloud Run default port
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "src/index.js"]
