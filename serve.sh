#!/bin/bash

# Simple script to serve the frontend locally for testing

echo "🚀 EntryBoss Discovery Tool - Development Server"
echo "================================================"
echo ""
echo "Frontend will be available at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

# Try different server options in order of preference
if command -v node &> /dev/null; then
    echo "✅ Using Node.js development server..."
    echo ""
    node server.js
elif command -v python3 &> /dev/null; then
    echo "✅ Using Python 3 HTTP server..."
    echo ""
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "✅ Using Python HTTP server..."
    echo ""
    python -m http.server 8000
elif command -v npx &> /dev/null; then
    echo "✅ Using npx serve..."
    echo ""
    npx serve . -p 8000
else
    echo "❌ Error: No suitable HTTP server found."
    echo ""
    echo "Please install one of the following:"
    echo "  • Node.js (recommended): https://nodejs.org/"
    echo "  • Python 3: https://python.org/"
    echo ""
    echo "Alternatively, you can:"
    echo "  1. Open index.html directly (limited functionality due to CORS)"
    echo "  2. Use any other static file server on port 8000"
    echo ""
    exit 1
fi
