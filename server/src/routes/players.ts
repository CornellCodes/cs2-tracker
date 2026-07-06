import { Router, Request, Response } from 'express';
import axios from 'axios';
import { query } from '../db/index';

const router = Router();

// Search for a player by Steam ID
router.get('/search/:steamId', async (req: Request, res: Response) => {
  const { steamId } = req.params;

  try {
    // Call Steam API to get player info
    const steamResponse = await axios.get(
      `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`
    );

    const players = steamResponse.data.response.players;

    if (players.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const steamPlayer = players[0];

    // Check if player already exists in our database
    const existing = await query(
      'SELECT * FROM players WHERE steam_id = $1',
      [steamId]
    );

    let player;

    if (existing.rows.length > 0) {
      // Update existing player
      const updated = await query(
        `UPDATE players 
         SET display_name = $1, avatar_url = $2, last_updated = NOW()
         WHERE steam_id = $3
         RETURNING *`,
        [steamPlayer.personaname, steamPlayer.avatarfull, steamId]
      );
      player = updated.rows[0];
    } else {
      // Insert new player
      const inserted = await query(
        `INSERT INTO players (steam_id, display_name, avatar_url)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [steamId, steamPlayer.personaname, steamPlayer.avatarfull]
      );
      player = inserted.rows[0];
    }

    res.json({
      player,
      steam_profile: steamPlayer
    });

  } catch (error) {
    console.error('Steam API Error:', error);
    res.status(500).json({ error: 'Failed to fetch player data' });
  }
});

// Get all saved players
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM players ORDER BY last_updated DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

export default router;