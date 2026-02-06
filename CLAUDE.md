# SmartyP - Navidrome Smart Playlist Generator

## Project Overview

SmartyP is a web utility for creating Navidrome smart playlists based on filesystem folder paths and star ratings. It bridges a user's physical music folder structure with Navidrome's database, allowing dynamic playlist creation.

**Core workflow:**
1. User selects a music folder (e.g., "Rock", "Xmas/Traditional")
2. Sets a minimum star rating filter (1-5 stars)
3. Click "Deploy to Navidrome" to write `.nsp` file and trigger rescan
   - Or use "Generate JSON Only" to preview/copy manually

## Architecture

The application builds to a **single binary** that embeds the React frontend and serves everything on one port.

```
┌──────────────────────────────────────────────────────────┐
│                     smartyp binary                        │
│  ┌───────────────┐    ┌───────────────────────────────┐  │
│  │ Embedded      │    │ Go HTTP Server                │  │
│  │ Frontend      │◄───│                               │  │
│  │ (frontend/    │    │ GET /            → UI         │  │
│  │  dist/)       │    │ GET /api/status  → Connection │  │
│  └───────────────┘    │ GET /api/folders → Scan       │  │
│                       │ POST /api/generate→ JSON      │  │
│                       │ POST /api/deploy → Write+Scan │  │
│                       │ GET /api/playlists→ List NSP  │  │
│                       │ DELETE /api/playlists→ Remove │  │
│                       └───────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  Filesystem (MUSIC_ROOT)       Navidrome (Subsonic API)
  └── playlists/*.nsp           └── ping, startScan
```

## File Structure

```
navidromeSmartyP/
├── main.go              # Go backend: HTTP API, embedded frontend, filesystem scanning
├── main_test.go         # Go unit tests for path mapping and JSON generation
├── go.mod               # Go module definition
├── Makefile             # Build automation (build, test, clean, dev)
├── .gitignore           # Ignores: smartyp binary, frontend/dist/, node_modules/
├── .env.example         # Example environment configuration
├── readme.md            # User-facing documentation
├── CLAUDE.md            # This file (developer context)
└── frontend/            # React frontend (Vite + Tailwind)
    ├── package.json     # npm dependencies
    ├── vite.config.js   # Vite config with dev proxy
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html       # HTML shell
    └── src/
        ├── main.jsx     # React entry point
        ├── index.css    # Tailwind imports
        └── App.jsx      # Main React component (dark-mode dashboard UI)
```

## Key Source Files

### main.go (Backend)

**Embedded Frontend:**
```go
//go:embed all:frontend/dist
var frontendFS embed.FS
```

**Structs:**
- `Config` - Navidrome URL, credentials, music root path
- `SmartPlaylist` - Playlist with name, comment, and rules
- `PlaylistRule` - Contains `All`/`Any` rule arrays
- `Rule` - Individual filter (name, operator, value)
- `SubsonicClient` - Subsonic/Navidrome API client with Ping, StartScan, GetPlaylists
- `SubsonicResponse` - XML response wrapper for Subsonic API
- `SmartPlaylistInfo` - Info about a .nsp file (name, filename, path, modTime)
- `StatusResponse` - Connection status for /api/status endpoint

**Key Functions:**
- `GenerateSmartJSON(name, path, minRating string)` - Creates Navidrome playlist JSON
- `mapToNavidromePath(fullPath, musicRoot string)` - Converts absolute to relative paths
- `GetFolders(musicRoot string)` - Scans Tier 1 folders + special Tier 2 for "Xmas"
- `GenerateAuthParams()` - MD5-hashed Subsonic auth token generation
- `enableCors()` - Conditional CORS middleware (only when `CORS_ALLOWED_ORIGINS` is set)
- `Ping()` - Tests connection to Navidrome via Subsonic API
- `StartScan()` - Triggers Navidrome library rescan
- `WritePlaylistFile(path, name, content)` - Writes .nsp file to playlist directory
- `ListSmartPlaylists(path)` - Returns list of .nsp files with metadata
- `DeleteSmartPlaylist(path, filename)` - Removes a .nsp file (with path traversal protection)
- `getPlaylistPath(musicRoot)` - Returns playlist directory (PLAYLIST_PATH or MUSIC_ROOT/playlists/)

**API Endpoints:**
- `GET /` - Serves embedded frontend
- `GET /api/status` - Returns connection status, config info (playlistPath, musicRoot, connected)
- `GET /api/folders` - Returns available music folders (relative paths)
- `POST /api/generate` - Accepts `{name, path, minRating}`, returns playlist JSON
- `POST /api/deploy` - Writes .nsp file + triggers startScan, returns `{success, filename, scanTriggered}`
- `GET /api/playlists` - Lists existing .nsp files with metadata
- `DELETE /api/playlists?name=file.nsp` - Removes a .nsp file

**Environment Variables:**
- `MUSIC_ROOT` - Path to music library (required)
- `PORT` - Server port (default: `8080`)
- `CORS_ALLOWED_ORIGINS` - Enable CORS for dev mode (comma-separated origins)
- `NAVIDROME_URL` - Navidrome server URL (required for deploy/rescan features)
- `NAVIDROME_USER` - Navidrome username
- `NAVIDROME_PASS` - Navidrome password
- `PLAYLIST_PATH` - Custom playlist directory (default: `MUSIC_ROOT/playlists/`)

### frontend/src/App.jsx (Frontend)

**State:**
- `folders` - List of available music folders
- `playlistName` - User-editable playlist name
- `selectedFolder` - Target folder path
- `minRating` - 1-5 star rating (slider)
- `generatedJson` - Output JSON string
- `status`/`error` - User feedback
- `connectionStatus` - Navidrome connection info (connected, navidromeUrl, playlistPath)
- `existingPlaylists` - List of deployed .nsp files
- `deploying` - Loading state for deploy button
- `showPlaylists` - Toggle for playlist manager panel

**API Base:**
```jsx
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
```
In production (embedded), uses `/api`. In dev mode, can be overridden.

**Dependencies:**
- React 18 + Hooks (useState, useEffect)
- Tailwind CSS 3
- Lucide React icons
- Vite 5

## Generated Playlist JSON Format

```json
{
  "name": "Heavy Rotation Rock",
  "comment": "Auto-generated by SmartyP for path: Rock",
  "rules": {
    "all": [
      { "name": "path", "operator": "startsWith", "value": "Rock" },
      { "name": "rating", "operator": "gt", "value": 3 }
    ]
  }
}
```

## Building & Running

### Build Single Binary
```bash
make build        # Builds frontend + Go binary → smartyp
```

### Run
```bash
MUSIC_ROOT=/path/to/music ./smartyp
# Or with custom port:
PORT=9090 MUSIC_ROOT=/path/to/music ./smartyp
```

### Development Mode
Run frontend and backend separately for hot reload:

```bash
# Terminal 1 - Backend
CORS_ALLOWED_ORIGINS=http://localhost:5173 MUSIC_ROOT=/path/to/music go run main.go

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev
```

### Tests
```bash
make test         # Ensures dist exists, runs go test -v
# Or directly (requires frontend/dist to exist):
go test -v
```

### Clean
```bash
make clean        # Removes smartyp, frontend/dist/, frontend/node_modules/
```

## Special Behaviors

1. **Tier 2 Xmas Scanning** - The "Xmas" folder gets special handling: both `Xmas` and its subfolders (`Xmas/Traditional`, `Xmas/Modern`) appear as separate options

2. **Path Mapping** - Absolute paths like `/Volumes/Files - SSD/Music/Rock` become relative `Rock` for Navidrome

3. **Graceful Degradation** - Frontend shows mock data if backend unavailable

4. **Conditional CORS** - CORS headers only added when `CORS_ALLOWED_ORIGINS` is set (for dev mode). Production builds are same-origin.

## Development Notes

- Single binary deployment: `go:embed` bundles `frontend/dist/` into the executable
- `make ensure-dist` creates a placeholder dist so `go test` compiles without building frontend
- Vite dev server proxies `/api` to `localhost:8080` for seamless development
- Only `path` and `rating` filters implemented; other Navidrome smart playlist features not exposed
- Subsonic API integration uses `ping` for connection testing and `startScan` for library rescan
- Playlist files use `.nsp` extension (Navidrome Smart Playlist)
- Filename sanitization prevents path traversal and removes unsafe characters

## Common Tasks

### Adding a new playlist rule type
1. Update `Rule` struct in `main.go` if needed
2. Modify `GenerateSmartJSON()` to include new rule
3. Add UI controls in `frontend/src/App.jsx`

### Changing folder scan depth
Look at `GetFolders()` in `main.go` - currently hardcoded for Tier 1 + special Tier 2 "Xmas"

### Adding more Subsonic API calls
Extend `SubsonicClient` with new methods following the pattern in `makeRequest()`. Add corresponding XML response structs and parse them in the method.

### Changing playlist directory
Set `PLAYLIST_PATH` environment variable, or modify `getPlaylistPath()` in `main.go` for different default behavior.
