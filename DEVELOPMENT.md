# 🚀 Running the EntryBoss Discovery Tool

## Frontend Technology Stack
- **HTML**: Semantic structure
- **Tailwind CSS**: Utility-first CSS framework via CDN
- **Vanilla JavaScript**: No frameworks for simplicity and performance
- **Color-coded clubs**: Unique colors for each selected club

## The CORS Issue
When opening `index.html` directly in your browser using `file://` protocol, you'll encounter a CORS error that prevents loading the JSON data files. This is a browser security feature.

## ✅ Solutions (Choose One)

### Option 1: Node.js Server (Recommended)
```bash
cd /Users/grayt5/dev/racecalendar
node server.js
```
Then open: http://localhost:8000

### Option 2: Python Server
```bash
cd /Users/grayt5/dev/racecalendar
python3 -m http.server 8000
```
Then open: http://localhost:8000

### Option 3: Use the serve script
```bash
cd /Users/grayt5/dev/racecalendar
./serve.sh
```
Then open: http://localhost:8000

### Option 4: NPM (if you have Node.js)
```bash
cd /Users/grayt5/dev/racecalendar
npm start
```
Then open: http://localhost:8000

## 🎯 What's Fixed

1. **Fallback Data**: The app now includes sample events that display even when running from `file://`
2. **CORS Detection**: Automatically detects when running from file protocol and shows appropriate messages
3. **Multiple Server Options**: Several ways to run a local development server
4. **Error Handling**: Graceful fallback when data files can't be loaded

## 📱 Testing the App

Once running on http://localhost:8000, you should see:
- ✅ Calendar view with upcoming events
- ✅ List view toggle
- ✅ Club filtering dropdown
- ✅ All 36 Victorian clubs in the filter
- ✅ Responsive design on mobile/desktop
- ✅ Events linking to EntryBoss

## 🔧 For Production

When deployed to GitHub Pages or any web server, the CORS issue doesn't exist and the app will load all data normally.
