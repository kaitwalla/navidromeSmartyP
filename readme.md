SmartyP
=======

SmartyP is a specialized utility for managing **Navidrome Smart Playlists**, with a specific focus on filesystem path-based filtering. It bridges the gap between your physical folder structure and Navidrome's database, allowing you to easily create dynamic playlists based on folders (e.g., "Rock", "Xmas/Traditional") combined with metadata filters like ratings.

Features
--------

*   **Intelligent Path Scanning**: Automatically discovers Tier 1 music folders and specific Tier 2 subfolders (e.g., inside "Xmas") to populate filter options.

*   **Smart Playlist Generation**: Generates compliant .json smart playlist definitions that Navidrome understands.

*   **Path Mapping**: Automatically translates absolute system paths to Navidrome-compatible relative paths.

*   **Modern Web UI**: A clean, dark-mode React dashboard to configure and generate definitions visually.

*   **Single Binary**: The Go backend embeds the React frontend—one executable serves everything.

Tech Stack
----------

*   **Backend**: Go (Golang) - Uses standard library for HTTP handling, JSON processing, and embedded filesystem.

*   **Frontend**: React + Vite + Tailwind CSS - Features a responsive design with Lucide icons.

Prerequisites
-------------

*   Go 1.21 or higher
*   Node.js 18+ and npm
*   Make (for build automation)
*   Access to the filesystem where your music is stored

Quick Start
-----------

### Build

```bash
make build
```

This compiles the React frontend and embeds it into a single Go binary called `smartyp`.

### Run

```bash
MUSIC_ROOT=/path/to/your/music ./smartyp
```

Open http://localhost:8080 in your browser.

### Configuration

Set environment variables to configure the server:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MUSIC_ROOT` | Yes | `/Volumes/Files - SSD/Music` | Path to your music library root folder |
| `PORT` | No | `8080` | Port the server listens on |
| `NAVIDROME_URL` | No | - | Navidrome server URL (for future API integration) |
| `NAVIDROME_USER` | No | - | Navidrome username (for future API integration) |
| `NAVIDROME_PASS` | No | - | Navidrome password (for future API integration) |
| `CORS_ALLOWED_ORIGINS` | No | - | Only needed for development (see below) |

You can copy `.env.example` to `.env` and customize it, then source it before running:

```bash
cp .env.example .env
# Edit .env with your values
source .env
./smartyp
```

Or pass variables directly:

```bash
PORT=9090 MUSIC_ROOT=/media/music ./smartyp
```

Development
-----------

For development, you can run the frontend dev server (with hot reload) separately from the Go backend.

**Terminal 1 - Backend:**
```bash
CORS_ALLOWED_ORIGINS=http://localhost:5173 MUSIC_ROOT=/path/to/music go run main.go
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on http://localhost:5173 and proxies API requests to the Go backend on port 8080.

The `CORS_ALLOWED_ORIGINS` variable enables CORS headers so the frontend dev server can communicate with the backend. This is not needed when running the built binary (same-origin).

Makefile Targets
----------------

| Target | Description |
|--------|-------------|
| `make build` | Build frontend + Go binary (`smartyp`) |
| `make test` | Run Go tests |
| `make dev` | Print instructions for dev mode |
| `make clean` | Remove build artifacts |

Usage
-----

1.  **Select Folder**: The dropdown will populate with folders found in your `MUSIC_ROOT`. Select the genre or category you want to target.

2.  **Set Filters**: Choose the minimum star rating.

3.  **Generate**: Click the "Generate Definition" button.

4.  **Deploy**:
    *   Copy the generated JSON output.
    *   Create a new file in your Navidrome playlists directory (e.g., `my_playlist.json`).
    *   Paste the content and save.
    *   Navidrome will automatically detect the new smart playlist.

Testing
-------

```bash
make test
```

Or directly:

```bash
go test -v
```

Note: If running `go test` directly without having built the frontend first, run `make ensure-dist` to create a placeholder so the embed directive compiles.

Troubleshooting
---------------

*   **"Failed to connect to backend"**: Ensure the server is running and check the port.

*   **Empty Folder List**: Check your `MUSIC_ROOT` environment variable. The application falls back to mock data if it cannot read the directory.

*   **Build fails with embed error**: Run `make ensure-dist` or `make build` to ensure the `frontend/dist` directory exists.
