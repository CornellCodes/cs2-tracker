import { Router, Request, Response } from 'express';
import axios from 'axios';
import { query } from '../db/index';

const router = Router();

router.get('/player/:username', async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    // Get player info from FACEIT
    const playerResponse = await axios.get(
      `https://open.faceit.com/data/v4/players?nickname=${username}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FACEIT_API_KEY}`
        }
      }
    );

    const faceitPlayer = playerResponse.data;
    const playerId = faceitPlayer.player_id;
    const csgoStats = faceitPlayer.games?.cs2 || faceitPlayer.games?.csgo;

    if (!csgoStats) {
      return res.status(404).json({ error: 'No CS2 stats found for this player' });
    }

    // Get detailed stats
    const statsResponse = await axios.get(
      `https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FACEIT_API_KEY}`
        }
      }
    );

    const stats = statsResponse.data.lifetime;

    // Find player in our database by faceit username
    const existing = await query(
      'SELECT * FROM players WHERE faceit_username = $1',
      [username]
    );

    let dbPlayer;

    if (existing.rows.length > 0) {
      dbPlayer = existing.rows[0];

      // Update faceit stats
      await query(
        `INSERT INTO faceit_stats (player_id, elo, level, wins, matches, kd_ratio)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          dbPlayer.id,
          csgoStats.faceit_elo,
          csgoStats.skill_level,
          parseInt(stats.Wins),
          parseInt(stats.Matches),
          parseFloat(stats['Average K/D Ratio'])
        ]
      );
    } else {
      // Insert new player
      const newPlayer = await query(
        `INSERT INTO players (faceit_username, display_name, avatar_url)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [username, faceitPlayer.nickname, faceitPlayer.avatar]
      );
      dbPlayer = newPlayer.rows[0];

      await query(
        `INSERT INTO faceit_stats (player_id, elo, level, wins, matches, kd_ratio)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          dbPlayer.id,
          csgoStats.faceit_elo,
          csgoStats.skill_level,
          parseInt(stats.Wins),
          parseInt(stats.Matches),
          parseFloat(stats['Average K/D Ratio'])
        ]
      );
    }

    res.json({
      player: dbPlayer,
      faceit: {
        elo: csgoStats.faceit_elo,
        level: csgoStats.skill_level,
        wins: stats.Wins,
        matches: stats.Matches,
        kd_ratio: stats['Average K/D Ratio'],
        win_rate: stats['Win Rate %'],
        headshots: stats['Average Headshots %']
      }
    });

  } catch (error) {
    console.error('FACEIT Error:', error);
    res.status(500).json({ error: 'Failed to fetch FACEIT data' });
  }
});

export default router;