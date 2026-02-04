SmartyP
=======

SmartyP is a specialized utility for managing **Navidrome Smart Playlists**, with a specific focus on filesystem path-based filtering. It bridges the gap between your physical folder structure and Navidrome's database, allowing you to easily create dynamic playlists based on folders (e.g., "Rock", "Xmas/Traditional") combined with metadata filters like ratings.

Features
--------

*   **Intelligent Path Scanning**: Automatically discovers Tier 1 music folders and specific Tier 2 subfolders (e.g., inside "Xmas") to populate filter options.
    
*   **Smart Playlist Generation**: Generates compliant .json smart playlist definitions that Navidrome understands.
    
*   **Path Mapping**: Automatically translates absolute system paths to Navidrome-compatible relative paths.
    
*   **Modern Web UI**: A clean, dark-mode React dashboard to configure and generate definitions visually.
    

Tech Stack
----------

*   **Backend**: Go (Golang) - Uses standard library for HTTP handling and JSON processing.
    
*   **Frontend**: React + Tailwind CSS - Features a responsive design with Lucide icons.
    

Prerequisites
-------------

*   Go 1.18 or higher
    
*   Node.js and npm
    
*   Access to the filesystem where your Music is stored (for the scanner to work).
    

Getting Started
---------------

### 1\. Backend Setup

The backend runs on port :8080 and handles filesystem scanning.

1.  Clone the repository and navigate to the root directory.
    
2.  **Mac/Linux:**export NAVIDROME\_URL="http://localhost:4533" # Optional, for future API expansionexport NAVIDROME\_USER="admin" # Optionalexport NAVIDROME\_PASS="password" # Optionalexport MUSIC\_ROOT="/Volumes/Files - SSD/Music" # Required: Your actual music path**Windows (PowerShell):**$env:MUSIC\_ROOT="C:\\Users\\Music"
    
3.  go run main.go
    

### 2\. Frontend Setup

The frontend connects to the backend to fetch folders and generate logic.

1.  Ensure the backend is running.
    
2.  npm install
    
3.  npm start# or if using Vitenpm run dev
    
4.  Open your browser (usually http://localhost:3000 or http://localhost:5173).
    

Usage
-----

1.  **Select Folder**: The dropdown will populate with folders found in your MUSIC\_ROOT. Select the genre or category you want to target.
    
2.  **Set Filters**: Choose the minimum star rating.
    
3.  **Generate**: Click the "Generate Definition" button.
    
4.  **Deploy**:
    
    *   Copy the generated JSON output.
        
    *   Create a new file in your Navidrome playlists directory (e.g., my\_playlist.json).
        
    *   Paste the content and save.
        
    *   Navidrome will automatically detect the new smart playlist.
        

Testing
-------

The project includes unit tests for path mapping and JSON generation.

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   go test -v   `

Troubleshooting
---------------

*   **"Failed to connect to backend"**: Ensure the Go server is running on port 8080.
    
*   **Empty Folder List**: Check your MUSIC\_ROOT environment variable. The application falls back to mock data if it cannot read the directory specified.