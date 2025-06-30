#!/bin/bash

# Simple script to serve the frontend locally for testing

echo "🚀 Race Discovery Tool - Development Server"
echo "================================================"
echo ""
echo "Frontend will be available at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

# Check if Node.js is available
if command -v node &> /dev/null; then
    echo "✅ Using Node.js development server..."
    echo ""
    node server.js
else
    echo "❌ Error: Node.js not found."
    echo ""
    echo "Please install Node.js from: https://nodejs.org/"
    echo ""
    exit 1
fi
