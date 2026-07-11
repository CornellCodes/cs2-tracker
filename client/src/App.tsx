import EloChart from './components/EloChart';
import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://cs2-tracker-production-b738.up.railway.app';

interface Player {
  id: number;
  steam_id: string;
  faceit_username: string;
  display_name: string;
  avatar_url: string;
  last_updated: string;
}

interface FaceitStats {
  elo: number;
  level: number;
  wins: string;
  matches: string;
  kd_ratio: string;
  win_rate: string;
  headshots: string;
}

interface SteamResult {
  player: Player;
  steam_profile: any;
}

interface FaceitResult {
  player: Player;
  faceit: FaceitStats;
}

function getLevelColor(level: number): string {
  if (level <= 3) return '#eee';
  if (level <= 5) return '#6dc249';
  if (level <= 7) return '#f4a21e';
  if (level <= 9) return '#eb4c2c';
  return '#c00';
}

function App() {
  const [steamId, setSteamId] = useState('');
  const [faceitUsername, setFaceitUsername] = useState('');
  const [steamResult, setSteamResult] = useState<SteamResult | null>(null);
  const [faceitResult, setFaceitResult] = useState<FaceitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'steam' | 'faceit'>('faceit');
  const [eloHistory, setEloHistory] = useState<any[]>([]);

  const handleSteamSearch = async () => {
    if (!steamId.trim()) return;
    setLoading(true);
    setError('');
    setSteamResult(null);

    try {
      const response = await axios.get(
        `${API_URL}/api/players/search/${steamId}`
      );
      setSteamResult(response.data);
    } catch (err) {
      setError('Player not found. Check your Steam ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceitSearch = async () => {
    if (!faceitUsername.trim()) return;
    setLoading(true);
    setError('');
    setFaceitResult(null);

    try {
      const response = await axios.get(
        `${API_URL}/api/faceit/player/${faceitUsername}`
      );
      setFaceitResult(response.data);

      const historyResponse = await axios.get(
        `${API_URL}/api/faceit/history/${faceitUsername}`
      );
      setEloHistory(historyResponse.data.history);
    } catch (err) {
      setError('Player not found. Check your FACEIT username and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, handler: () => void) => {
    if (e.key === 'Enter') handler();
  };

  return (
    <div className="app">
      <div className="header">
        <h1>CS2 Stat Tracker</h1>
        <p>Search by Steam ID or FACEIT username</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'faceit' ? 'active' : ''}`}
          onClick={() => setActiveTab('faceit')}
        >
          FACEIT
        </button>
        <button
          className={`tab ${activeTab === 'steam' ? 'active' : ''}`}
          onClick={() => setActiveTab('steam')}
        >
          Steam
        </button>
      </div>

      {activeTab === 'faceit' && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Enter FACEIT username (e.g. Phil-Ivey)"
            value={faceitUsername}
            onChange={(e) => setFaceitUsername(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleFaceitSearch)}
            className="search-input"
          />
          <button onClick={handleFaceitSearch} disabled={loading} className="search-button">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      )}

      {activeTab === 'steam' && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Enter Steam ID (e.g. 76561198147811573)"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleSteamSearch)}
            className="search-input"
          />
          <button onClick={handleSteamSearch} disabled={loading} className="search-button">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {faceitResult && activeTab === 'faceit' && (
        <div className="player-card">
          <div className="player-header">
            <img
              src={faceitResult.player.avatar_url}
              alt={faceitResult.player.display_name}
              className="avatar"
            />
            <div className="player-info">
              <h2>{faceitResult.player.display_name}</h2>
              <div className="level-badge" style={{ backgroundColor: getLevelColor(faceitResult.faceit.level) }}>
                Level {faceitResult.faceit.level}
              </div>
              <p className="elo">ELO: {faceitResult.faceit.elo}</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-value">{faceitResult.faceit.kd_ratio}</span>
              <span className="stat-label">K/D Ratio</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{faceitResult.faceit.win_rate}%</span>
              <span className="stat-label">Win Rate</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{faceitResult.faceit.matches}</span>
              <span className="stat-label">Matches</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{faceitResult.faceit.wins}</span>
              <span className="stat-label">Wins</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{faceitResult.faceit.headshots}%</span>
              <span className="stat-label">Headshots</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{parseInt(faceitResult.faceit.matches) - parseInt(faceitResult.faceit.wins)}</span>
              <span className="stat-label">Losses</span>
            </div>
          </div>

          <EloChart history={eloHistory} username={faceitResult.player.display_name} />
        </div>
      )}

      {steamResult && activeTab === 'steam' && (
        <div className="player-card">
          <div className="player-header">
            <img
              src={steamResult.player.avatar_url}
              alt={steamResult.player.display_name}
              className="avatar"
            />
            <div className="player-info">
              <h2>{steamResult.player.display_name}</h2>
              <p className="steam-id">Steam ID: {steamResult.player.steam_id}</p>
              <p className="last-updated">
                Last updated: {new Date(steamResult.player.last_updated).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;