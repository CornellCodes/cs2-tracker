import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface HistoryPoint {
  elo: number;
  level: number;
  kd_ratio: string;
  wins: number;
  matches: number;
  fetched_at: string;
}

interface EloChartProps {
  history: HistoryPoint[];
  username: string;
}

function EloChart({ history, username }: EloChartProps) {
  const data = history.map((point, index) => ({
    name: index === 0 ? 'Start' : new Date(point.fetched_at).toLocaleDateString(),
    elo: point.elo,
    matches: point.matches
  }));

  const minElo = Math.min(...history.map(p => p.elo)) - 50;
  const maxElo = Math.max(...history.map(p => p.elo)) + 50;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '10px 14px'
        }}>
          <p style={{ color: '#e8b04b', fontWeight: 700 }}>
            ELO: {payload[0].value}
          </p>
          <p style={{ color: '#666', fontSize: '0.8rem' }}>
            {payload[0].payload.name}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">ELO History — {username}</h3>
      {history.length < 2 ? (
        <p className="chart-empty">
          Search again over multiple sessions to build your ELO history graph.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis
              dataKey="name"
              stroke="#555"
              tick={{ fill: '#666', fontSize: 11 }}
            />
            <YAxis
              domain={[minElo, maxElo]}
              stroke="#555"
              tick={{ fill: '#666', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="elo"
              stroke="#e8b04b"
              strokeWidth={2}
              dot={{ fill: '#e8b04b', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default EloChart;