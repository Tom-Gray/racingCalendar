# EntryBoss Discovery Tool

A lightweight, fast, and user-centric web tool that aggregates upcoming cycling events from EntryBoss and presents them in a clean, filterable, and intuitive interface.

## 🚴‍♀️ Features

- **Calendar View**: Visual 4-week calendar showing upcoming events
- **List View**: Chronological list of all upcoming events  
- **Club Filtering**: Multi-select dropdown with fuzzy search to filter by favorite clubs
- **Color-Coded Clubs**: Each selected club gets a unique color for easy identification
- **State Persistence**: Your filter preferences and club colors are saved in browser cookies
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Direct Links**: All events link directly to EntryBoss for registration

## 🛠️ Architecture

### Backend (Go CLI)
- **Language**: Go 1.21+
- **Dependencies**: 
  - `github.com/PuerkitoBio/goquery` for HTML parsing
  - `github.com/spf13/cobra` for CLI interface

### Frontend (Static Web App)
- **Technology**: Vanilla HTML, JavaScript + Tailwind CSS
- **Styling**: Tailwind CSS via CDN for utility-first styling
- **No frameworks** for fast load times and simplicity
- **Responsive design** with mobile-first approach

### Data Flow
1. Go CLI scrapes EntryBoss daily via GitHub Actions
2. Generates static `events.json` and `clubs.json` files
3. Frontend fetches JSON data and renders views
4. Static site deployed to GitHub Pages

## 🚀 Getting Started

### Prerequisites
- Go 1.21 or later
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd racecalendar
   ```

2. **Install Go dependencies**
   ```bash
   go mod tidy
   ```

3. **Update clubs list** (run manually when needed)
   ```bash
   go run main.go update-clubs
   ```

4. **Update events** (run daily via automation)
   ```bash
   go run main.go update-events
   ```

5. **Serve the frontend locally**
   ```bash
   # Using Python (if available)
   python -m http.server 8000
   
   # Or using Node.js
   npx serve .
   
   # Or any other static file server
   ```

6. **Open in browser**
   ```
   http://localhost:8000
   ```

### Running Tests

```bash
go test -v
```

## 🤖 Automation

The project uses GitHub Actions for automated data updates:

### Daily Events Update
- **Schedule**: Daily at 6 AM UTC (4 PM AEST)
- **Trigger**: Automatic via cron schedule
- **Actions**: 
  - Scrapes events from all known Victorian clubs
  - Updates `events.json`
  - Commits changes and deploys to GitHub Pages

### Manual Club Updates  
- **Trigger**: Manual via GitHub Actions UI
- **Actions**:
  - Scrapes EntryBoss for new Victorian clubs
  - Updates `clubs.json` 
  - Automatically updates events if clubs changed
  - Commits changes and deploys

### Setting Up Automation

1. **Enable GitHub Pages**
   - Go to Repository Settings → Pages
   - Set source to "GitHub Actions"

2. **Configure Workflows**
   - Workflows are automatically configured in `.github/workflows/`
   - No additional setup required

3. **Monitor Runs**
   - Check the "Actions" tab for workflow status
   - View logs for debugging if needed

## 📱 Usage

### First Time Users
- All Victorian club events are shown by default
- An onboarding banner guides users to the filter controls
- Banner can be dismissed and won't show again

### Filtering Events
1. Click on the club search input
2. Type to search for clubs (fuzzy search supported)
3. Click on clubs to add them as filters
4. Selected clubs appear as removable tags
5. Filters are automatically saved in browser cookies

### Viewing Events
- **Calendar View**: Default view showing 4 weeks of events
- **List View**: Chronological list of all upcoming events
- **Event Interaction**: Click any event to open in EntryBoss (new tab)

## 🧪 Testing

### Backend Testing
- Unit tests for HTML parsing functions
- Integration tests for data structure validation
- Test data generation for frontend development

### Frontend Testing (Manual)
- [ ] Calendar displays correctly on desktop/mobile
- [ ] View toggle switches between calendar and list
- [ ] Club filtering works with search and selection
- [ ] State persistence across browser sessions
- [ ] Events open correct URLs in new tabs
- [ ] Onboarding appears for first-time users

### Test Checklist
Run through the complete test plan documented in the PRD section 5.

## 🏗️ Project Structure

```
racecalendar/
├── .github/workflows/     # GitHub Actions automation
│   ├── update-events.yml  # Daily events update
│   └── update-clubs.yml   # Manual clubs update
├── testdata/              # Test data and fixtures
├── main.go               # Go CLI application
├── main_test.go          # Go tests
├── go.mod               # Go dependencies
├── clubs.json           # Generated clubs data
├── events.json          # Generated events data
├── index.html           # Frontend HTML
├── styles.css           # Frontend CSS
├── script.js            # Frontend JavaScript
├── PRD.md              # Product Requirements Document
└── README.md           # This file
```

## 🔧 Configuration

### CLI Commands

#### `update-clubs`
Scrapes EntryBoss to find Victorian cycling clubs.

**Usage:**
```bash
go run main.go update-clubs
```

**Output:** `clubs.json` file with structure:
```json
[
  {
    "clubName": "Brunswick Cycling Club",
    "clubUrl": "https://entryboss.cc/calendar/brunswick"
  }
]
```

#### `update-events`  
Scrapes events from all clubs in `clubs.json`.

**Usage:**
```bash
go run main.go update-events
```

**Output:** `events.json` file with structure:
```json
[
  {
    "eventName": "Winter Criterium",
    "eventDate": "2025-07-05T00:00:00Z",
    "clubName": "Brunswick Cycling Club", 
    "eventUrl": "https://entryboss.cc/races/12345"
  }
]
```

### Environment Variables
No environment variables required for basic operation.

## 🐛 Error Handling

### Backend Errors
- **Network failures**: CLI exits with non-zero code and detailed error message
- **Parsing failures**: Logs specific parsing errors and continues with remaining clubs  
- **HTTP errors**: Logs status codes and skips failed requests

### Frontend Errors
- **Data loading failures**: Shows error message with retry suggestion
- **No events found**: Displays helpful message when filters return no results
- **Network issues**: Graceful degradation with cached data where possible

## 🚀 Deployment

### GitHub Pages (Recommended)
1. Push code to GitHub repository
2. Enable GitHub Pages in repository settings
3. GitHub Actions automatically deploys on data updates

### Manual Deployment
1. Generate data files: `go run main.go update-clubs && go run main.go update-events`
2. Copy static files (`index.html`, `styles.css`, `script.js`, `events.json`) to web server
3. Serve static files

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make changes and test thoroughly**
4. **Run tests**: `go test -v`  
5. **Commit changes**: `git commit -m "Description"`
6. **Push to branch**: `git push origin feature-name`
7. **Create Pull Request**

### Development Guidelines
- Follow Go best practices and formatting
- Write tests for new functionality
- Test frontend changes on multiple devices
- Update documentation for significant changes

## 📄 License

This project is open source. See [LICENSE](LICENSE) file for details.

## 🔗 Links

- **EntryBoss**: https://entryboss.cc (source of cycling event data)
- **Live Site**: [GitHub Pages URL]
- **Issues**: [GitHub Issues URL]

## 📞 Support

For issues and feature requests, please use GitHub Issues or contact the development team.

---

*Built with ❤️ for the Victorian cycling community*
