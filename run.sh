#!/bin/bash

# Start FastAPI backend
echo "Starting FastAPI backend..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Navigate to frontend directory and start the frontend
echo "Starting Next.js frontend..."
cd imagetotextui
npm run dev &
FRONTEND_PID=$!

# Define a cleanup function to kill both processes
cleanup() {
    echo "Terminating both backend and frontend..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    wait $BACKEND_PID
    wait $FRONTEND_PID
    echo "Both processes terminated."
}

# Trap SIGINT (Ctrl+C) to run the cleanup function
trap cleanup SIGINT

# Wait for both processes to exit
wait $BACKEND_PID $FRONTEND_PID
