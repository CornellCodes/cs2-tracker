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
router.get('/history/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const player = await query(
      'SELECT * FROM players WHERE faceit_username = $1',
      [username]
    );

    if (player.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found in database. Search for them first.' });
    }

    const history = await query(
      `SELECT elo, level, kd_ratio, wins, matches, fetched_at
       FROM faceit_stats
       WHERE player_id = $1
       ORDER BY fetched_at ASC`,
      [player.rows[0].id]
    );

    res.json({
      player: player.rows[0],
      history: history.rows
    });

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});
router.get('/matches/:username', async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    // Get player from our database
    const playerResult = await query(
      'SELECT * FROM players WHERE faceit_username = $1',
      [username]
    );

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found. Search for them on the FACEIT tab first.' });
    }

    const player = playerResult.rows[0];

    // Get FACEIT player ID
    const playerResponse = await axios.get(
      `https://open.faceit.com/data/v4/players?nickname=${username}`,
      { headers: { Authorization: `Bearer ${process.env.FACEIT_API_KEY}` } }
    );

    const faceitPlayerId = playerResponse.data.player_id;
    const currentElo = playerResponse.data.games?.cs2?.faceit_elo || 
                       playerResponse.data.games?.csgo?.faceit_elo;

    // Fetch match history in batches — only 5 API calls total
    let allMatches: any[] = [];
    let offset = 0;
    const batchSize = 20;
    const totalWanted = 100;

    while (allMatches.length < totalWanted) {
      const matchResponse = await axios.get(
        `https://open.faceit.com/data/v4/players/${faceitPlayerId}/history?game=cs2&offset=${offset}&limit=${batchSize}`,
        { headers: { Authorization: `Bearer ${process.env.FACEIT_API_KEY}` } }
      );

      const matches = matchResponse.data.items;
      if (!matches || matches.length === 0) break;

      allMatches = [...allMatches, ...matches];
      offset += batchSize;

      if (matches.length < batchSize) break;
    }

    // Save matches to database
    let savedCount = 0;

    for (const match of allMatches) {
      try {
        const existing = await query(
          'SELECT id FROM match_history WHERE faceit_match_id = $1',
          [match.match_id]
        );

        if (existing.rows.length > 0) continue;

        // Figure out if player won
        const playerTeam = match.teams?.faction1?.players?.find(
          (p: any) => p.player_id === faceitPlayerId
        ) ? 'faction1' : 'faction2';

        const won = match.results?.winner === playerTeam;
        const playedAt = new Date(match.started_at * 1000);
        const map = match.voting?.map?.pick?.[0] || 'Unknown';

        await query(
          `INSERT INTO match_history 
           (player_id, faceit_match_id, map, result, kills, deaths, assists, kd_ratio, played_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (faceit_match_id) DO NOTHING`,
          [
            player.id,
            match.match_id,
            map,
            won ? 'Win' : 'Loss',
            0,
            0,
            0,
            0,
            playedAt
          ]
        );

        savedCount++;
      } catch (err) {
        continue;
      }
    }

    // Return stored matches ordered by date
    const storedMatches = await query(
      `SELECT * FROM match_history 
       WHERE player_id = $1 
       ORDER BY played_at DESC 
       LIMIT 100`,
      [player.id]
    );

    res.json({
      player,
      matches: storedMatches.rows,
      current_elo: currentElo,
      total_fetched: allMatches.length,
      new_saved: savedCount
    });

  } catch (error) {
    console.error('Match history error:', error);
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
});
export default router;