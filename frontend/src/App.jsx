import React, { useState, useEffect } from 'react';
import { Settings, Music, Save, RefreshCw, Folder, Star, Info, AlertCircle, Upload, Trash2, CheckCircle, XCircle, Wifi, WifiOff, List } from 'lucide-react';

const App = () => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playlistName, setPlaylistName] = useState('My Smart Playlist');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [minRating, setMinRating] = useState(4);
  const [generatedJson, setGeneratedJson] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // New state for Navidrome integration
  const [connectionStatus, setConnectionStatus] = useState(null); // null = loading, object = status
  const [existingPlaylists, setExistingPlaylists] = useState([]);
  const [deploying, setDeploying] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || '/api';

  useEffect(() => {
    fetchFolders();
    fetchStatus();
    fetchPlaylists();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/status`);
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch status", err);
      setConnectionStatus({ connected: false, error: "Backend not reachable" });
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await fetch(`${API_BASE}/playlists`);
      if (response.ok) {
        const data = await response.json();
        setExistingPlaylists(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch playlists", err);
    }
  };

  const fetchFolders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/folders`);
      if (!response.ok) throw new Error("Could not connect to backend");
      const data = await response.json();
      setFolders(data);
      if (data.length > 0) setSelectedFolder(data[0]);
    } catch (err) {
      console.error("Failed to fetch folders", err);
      setError("Failed to connect to SmartyP backend. Is it running on :8080?");
      // Fallback for UI visualization only
      setFolders(["(Mock) Rock", "(Mock) Jazz"]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setStatus('Generating...');
    setError('');
    try {
      const payload = {
        name: playlistName,
        path: selectedFolder,
        minRating: minRating
      };

      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Generation failed");

      const result = await response.json();
      setGeneratedJson(JSON.stringify(result, null, 2));
      setStatus('Successfully generated!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus('Error generating playlist.');
      setError(err.message);
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    setStatus('Deploying...');
    setError('');
    try {
      const payload = {
        name: playlistName,
        path: selectedFolder,
        minRating: minRating
      };

      const response = await fetch(`${API_BASE}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Deployment failed");
      }

      const result = await response.json();

      // Also generate the JSON for display
      const genResponse = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (genResponse.ok) {
        const genResult = await genResponse.json();
        setGeneratedJson(JSON.stringify(genResult, null, 2));
      }

      let successMsg = `Deployed ${result.filename}!`;
      if (result.scanTriggered) {
        successMsg += ' Rescan triggered.';
      } else if (result.scanError) {
        successMsg += ` (Scan warning: ${result.scanError})`;
      }
      setStatus(successMsg);

      // Refresh playlist list
      fetchPlaylists();

      setTimeout(() => setStatus(''), 5000);
    } catch (err) {
      setStatus('Deployment failed.');
      setError(err.message);
    } finally {
      setDeploying(false);
    }
  };

  const handleDeletePlaylist = async (filename) => {
    if (!window.confirm(`Delete ${filename}?`)) return;

    try {
      const response = await fetch(`${API_BASE}/playlists?name=${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Delete failed");
      }

      setStatus(`Deleted ${filename}`);
      fetchPlaylists();
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError(`Failed to delete: ${err.message}`);
    }
  };

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(generatedJson);
      } else {
        // Fallback for browsers without Clipboard API
        const textArea = document.createElement("textarea");
        textArea.value = generatedJson;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setStatus('Copied to clipboard!');
      setTimeout(() => setStatus(''), 2000);
    } catch (error) {
      setStatus(`Copy failed: ${error.message}`);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  // Connection status banner component
  const ConnectionBanner = () => {
    if (connectionStatus === null) return null;

    const hasNavidromeConfig = connectionStatus.navidromeUrl;

    if (!hasNavidromeConfig) {
      return (
        <div className="bg-yellow-900/30 border border-yellow-500/50 text-yellow-200 p-3 rounded-lg mb-6 flex items-center gap-2">
          <WifiOff size={18} />
          <span>Navidrome not configured. Set NAVIDROME_URL to enable direct deployment.</span>
        </div>
      );
    }

    if (connectionStatus.connected) {
      return (
        <div className="bg-green-900/30 border border-green-500/50 text-green-200 p-3 rounded-lg mb-6 flex items-center gap-2">
          <Wifi size={18} />
          <span>Connected to Navidrome ({connectionStatus.navidromeUrl})</span>
        </div>
      );
    }

    return (
      <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 flex items-center gap-2">
        <XCircle size={18} />
        <span>Cannot connect to Navidrome: {connectionStatus.error}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Music size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">SmartyP</h1>
              <p className="text-slate-400 text-sm">Navidrome Smart Playlist Utility</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPlaylists(!showPlaylists)}
              className={`p-2 rounded-full transition-colors ${showPlaylists ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
              title="Manage Playlists"
            >
              <List size={20} />
            </button>
            <button
              type="button"
              onClick={() => { fetchFolders(); fetchStatus(); fetchPlaylists(); }}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
              title="Refresh"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* Connection Status Banner */}
        <ConnectionBanner />

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Existing Playlists Panel */}
        {showPlaylists && (
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-xl mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <List size={18} className="text-indigo-400" />
              Deployed Smart Playlists
              <span className="text-xs text-slate-500 font-normal ml-2">
                {connectionStatus?.playlistPath}
              </span>
            </h2>

            {existingPlaylists.length === 0 ? (
              <p className="text-slate-500 text-sm">No smart playlists found.</p>
            ) : (
              <div className="space-y-2">
                {existingPlaylists.map((pl) => (
                  <div key={pl.filename} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg">
                    <div>
                      <span className="font-medium">{pl.name}</span>
                      <span className="text-xs text-slate-500 ml-2">{pl.filename}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePlaylist(pl.filename)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                      title="Delete playlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form Side */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings size={18} className="text-indigo-400" />
                Playlist Definition
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="playlist-name" className="block text-sm font-medium text-slate-400 mb-1">Playlist Name</label>
                  <input
                    id="playlist-name"
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. Best of Rock"
                  />
                </div>

                <div>
                  <label htmlFor="target-folder" className="block text-sm font-medium text-slate-400 mb-1">Target Folder (Path)</label>
                  <div className="relative">
                    <select
                      id="target-folder"
                      value={selectedFolder}
                      onChange={(e) => setSelectedFolder(e.target.value)}
                      disabled={folders.length === 0}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
                    >
                      {folders.length === 0 && <option>Scanning...</option>}
                      {folders.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <Folder className="absolute right-3 top-2.5 text-slate-500 pointer-events-none" size={16} />
                  </div>
                </div>

                <div>
                  <label htmlFor="min-rating" className="block text-sm font-medium text-slate-400 mb-1 flex justify-between">
                    Minimum Rating
                    <span className="text-indigo-400 font-bold">{minRating} Stars</span>
                  </label>
                  <input
                    id="min-rating"
                    type="range"
                    min="1"
                    max="5"
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase font-bold px-1">
                    <span>1 Star</span>
                    <span>3 Stars</span>
                    <span>5 Stars</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={handleDeploy}
                  disabled={loading || deploying}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                >
                  <Upload size={18} />
                  {deploying ? 'Deploying...' : 'Deploy to Navidrome'}
                </button>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Save size={16} />
                  Generate JSON Only
                </button>
              </div>
            </div>

            <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-500/30 flex gap-3 text-sm text-indigo-200">
              <Info size={20} className="shrink-0 text-indigo-400" />
              <p>
                <strong>Deploy</strong> writes the playlist directly to Navidrome and triggers a library rescan.
                <strong className="block mt-1">Generate JSON Only</strong> lets you preview/copy the definition manually.
              </p>
            </div>
          </div>

          {/* Preview Side */}
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Star size={18} className="text-yellow-400" />
                JSON Output
              </h2>
              {generatedJson && (
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider"
                >
                  Copy JSON
                </button>
              )}
            </div>

            <div className="flex-grow bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-sm overflow-auto min-h-[300px] shadow-inner relative group">
              {generatedJson ? (
                <pre className="text-emerald-400 whitespace-pre-wrap">{generatedJson}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center p-8">
                  <div className="mb-3 opacity-20"><Music size={48} /></div>
                  <p>Configure filters and click generate or deploy to see the Navidrome smart playlist definition.</p>
                </div>
              )}

              {status && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-bold animate-bounce shadow-xl">
                  {status}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
