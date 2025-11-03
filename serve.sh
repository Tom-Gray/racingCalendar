#!/bin/bash

# Simple script to serve the frontend locally for testing

echo "🚀 Race Discovery Tool - Development Server"
echo "================================================"
echo ""
echo "Frontend will be available at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✅ Using Python 3 development server..."
    echo ""
    python3 -m http.server 8000
else
    echo "❌ Error: Python 3 not found."
    echo ""
    echo "Please install Python 3."
    echo ""
    exit 1
fi