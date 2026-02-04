import React, { useState, useEffect } from 'react';
import { Settings, Music, Save, RefreshCw, Folder, Star, Info, AlertCircle } from 'lucide-react';

const App = () => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playlistName, setPlaylistName] = useState('My Smart Playlist');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [minRating, setMinRating] = useState(4);
  const [generatedJson, setGeneratedJson] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE || '/api';

  useEffect(() => {
    fetchFolders();
  }, []);

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
          <button
            type="button"
            onClick={fetchFolders}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
            title="Rescan Folders"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </header>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
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

              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
              >
                <Save size={18} />
                Generate Definition
              </button>
            </div>

            <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-500/30 flex gap-3 text-sm text-indigo-200">
              <Info size={20} className="shrink-0 text-indigo-400" />
              <p>
                Navidrome smart playlists are JSON files. After generating, save this output to your Navidrome 
                <code className="bg-indigo-900/40 px-1 rounded ml-1">playlists/</code> directory as 
                <code className="bg-indigo-900/40 px-1 rounded ml-1">.json</code>.
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
                  <p>Configure filters and click generate to see the Navidrome smart playlist definition.</p>
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