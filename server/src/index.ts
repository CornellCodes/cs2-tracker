import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/index';
import playerRoutes from './routes/players';
import faceitRoutes from './routes/faceit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:3000',
  'https://cs2-tracker-self.vercel.app'
];
// Also allow Vercel preview deployments, e.g. cs2-tracker-git-<branch>-<team>.vercel.app
const vercelPreviewPattern = /^https:\/\/cs2-tracker-[a-z0-9-]+\.vercel\.app$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CS2 Tracker API is running' });
});

app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ connected: true, time: result.rows[0].now });
  } catch (error) {
    res.json({ connected: false, error: String(error) });
  }
});

app.use('/api/players', playerRoutes);
app.use('/api/faceit', faceitRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;