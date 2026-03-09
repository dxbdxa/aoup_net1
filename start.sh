#!/bin/bash

# Quick start script for Diffusive Transistor Simulation
# Usage: ./start.sh [port]

PORT=5555

echo "🔬 Diffusive Transistor Simulation"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "Please install Node.js from https://nodejs.org/"
    echo ""
    echo "Alternatively, you can open index.html directly in your browser."
    exit 1
fi

# Check if http-server is installed
if ! command -v http-server &> /dev/null; then
    echo "📦 Installing http-server..."
    npm install -g http-server
fi

echo "🚀 Starting server on port $PORT..."
echo ""
echo "Open your browser and navigate to:"
echo "👉 http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server."
echo ""

http-server -p $PORT -c-1
