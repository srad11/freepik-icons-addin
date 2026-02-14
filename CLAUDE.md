# FreePik Icons - PowerPoint Add-in

## Project Overview
A PowerPoint Web Add-in (Office.js) that integrates with the Freepik Icons API to search, browse, download, and insert icons directly into PowerPoint presentations. Also supports AI-powered icon generation from text prompts.

## Architecture
- **Type**: Office Web Add-in (Task Pane)
- **Technology**: HTML, CSS, JavaScript (vanilla or lightweight framework)
- **Office API**: Office.js (OfficeJS)
- **External API**: Freepik API v1 (https://api.freepik.com/v1)
- **Hosting**: Local HTTPS dev server (Node.js) for personal use
- **Platform**: macOS (PowerPoint for Mac)

## Freepik API Endpoints Used
1. `GET /v1/icons` - Search/filter icons (stock library)
2. `GET /v1/icons/{id}` - Get icon details + related icons
3. `GET /v1/icons/{id}/download` - Download icon in various formats
4. `POST /v1/ai/text-to-icon` - AI icon generation from text prompt
5. `POST /v1/ai/text-to-icon/preview` - AI icon preview
6. `POST /v1/ai/text-to-icon/{format}/{id}` - Download AI-generated icon

## API Authentication
- Header: `x-freepik-api-key: <API_KEY>`
- Key stored in browser localStorage via add-in settings page

## Key Features
- **Stock Icon Search**: Search, filter by style/family, paginated results
- **AI Icon Generation**: Generate custom icons from text prompts (styles: solid, outline, color, flat, sticker)
- **Multi-format Download**: SVG, PNG (16-512px), EPS, PSD, GIF, MP4, AEP, JSON
- **Insert to Slide**: Insert at cursor position, default 128px
- **Favorites**: Save favorite icons for quick access (localStorage)
- **History**: Track recently downloaded/inserted icons (localStorage)
- **Settings**: API key management, default preferences

## UI Design Decisions
- **Layout**: Task Pane (right sidebar)
- **Style**: Feature-rich dashboard with tabs, filters, favorites, history
- **Theme**: Matches PowerPoint theme (light/dark adaptive)
- **Tabs**: Search | AI Generate | Favorites | History | Settings

## Installation (macOS Sideloading)
1. Install Node.js dependencies: `npm install`
2. Run local HTTPS dev server: `npm start`
3. Run `npm run sideload` (or `bash scripts/install.sh`) to install the manifest
   - Copies manifest.xml to `~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef/`
   - Clears the Office add-in cache to avoid stale manifest issues
4. Quit and reopen PowerPoint
5. Go to Home > Add-ins and select "FreePik Icons"
6. NOTE: On macOS, the ribbon button may not persist across restarts (known limitation).
   After restart, re-select the add-in from Home > Add-ins. Documents that have been
   opened with the add-in will auto-open the task pane on subsequent opens.

## Rate Limits (Freepik API)
- Stock Icons: 25 RPD (free) / 2,500 RPD (premium)
- AI Generation: 25 RPD (free)
- Burst: 50 req/sec over 5s window
- Average: 10 req/sec over 2min window

## Project Structure
```
PowerPoint Icons/
├── CLAUDE.md
├── manifest.xml          # Office Add-in manifest
├── package.json          # Node.js dependencies
├── src/
│   ├── taskpane/
│   │   ├── taskpane.html # Main add-in UI
│   │   ├── taskpane.css  # Styles (theme-adaptive)
│   │   └── taskpane.js   # Main application logic
│   ├── api/
│   │   ├── freepik.js    # Freepik API client
│   │   └── config.js     # API configuration
│   ├── utils/
│   │   ├── storage.js    # localStorage helpers (favorites, history)
│   │   └── office.js     # Office.js helpers (insert image, etc.)
│   └── assets/
│       └── icon-*.png    # Add-in icons
├── webpack.config.js     # Build configuration
└── scripts/
    └── install.sh        # macOS sideload installation script
```

## Development Commands
- `npm install` - Install dependencies
- `npm start` - Start local dev server with HTTPS
- `npm run build` - Build for production
- `npm run sideload` - Sideload manifest into PowerPoint (macOS)
