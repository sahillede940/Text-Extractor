#!/bin/bash

# Start FastAPI backend
echo "Starting FastAPI backend..."
# if no python environment is set up, use the following command to create a virtual environment
if [ ! -d "env" ]; then
    pip install virtualenv
    virtualenv env
    source env/Scripts/activate
fi
# if env activated is not env, activate it
if [ "$VIRTUAL_ENV" != "env" ]; then
    source env/Scripts/activate
fi
echo "Activated virtual environment"
pip install -r requirements.txt
fastapi dev main.py &
BACKEND_PID=$!

# Navigate to frontend directory and start the frontend
echo "Starting Next.js frontend..."
cd imagetotextui
npm install
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
