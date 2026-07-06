import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

interface Player {
  id: number;
  steam_id: string;
  display_name: string;
  avatar_url: string;
  last_updated: string;
}

interface SearchResult {
  player: Player;
  steam_profile: any;
}

function App() {
  const [steamId, setSteamId] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!steamId.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.get(
        `http://localhost:3001/api/players/search/${steamId}`
      );
      setResult(response.data);
    } catch (err) {
      setError('Player not found. Make sure you entered a valid Steam ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="app">
      <div className="header">
        <h1>CS2 Stat Tracker</h1>
        <p>Search for any player by Steam ID</p>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Enter Steam ID (e.g. 76561198147811573)"
          value={steamId}
          onChange={(e) => setSteamId(e.target.value)}
          onKeyPress={handleKeyPress}
          className="search-input"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="search-button"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="player-card">
          <img
            src={result.player.avatar_url}
            alt={result.player.display_name}
            className="avatar"
          />
          <div className="player-info">
            <h2>{result.player.display_name}</h2>
            <p className="steam-id">Steam ID: {result.player.steam_id}</p>
            <p className="last-updated">
              Last updated: {new Date(result.player.last_updated).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;