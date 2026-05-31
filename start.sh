#!/bin/bash

# Zephyr Full-Stack Local Launcher

echo "🚀 Starting Zephyr Application Platform..."

# Function to clean up background processes on exit
cleanup() {
    echo "Stopping servers..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# 1. Start the Backend Server (Port 5000)
echo "📡 Launching Express Backend Server on http://localhost:5000..."
cd backend
npm run start &
BACKEND_PID=$!
cd ..

# Wait 1s
sleep 1

# 2. Start the Frontend client (Port 3000)
echo "💻 Launching React/Vite Frontend on http://localhost:3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Keep script running to maintain background jobs
wait
