import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 1. Rechercher via Deezer pour avoir des métadonnées propres et ultra rapides
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ tracks: [] });

  try {
    const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`);
    const data = await response.json();
    const tracks = (data.data || []).map(t => ({
      id: t.id.toString(),
      title: t.title,
      artist: t.artist?.name || 'Inconnu',
      duration: t.duration || 0,
      thumbnail: t.album?.cover_medium || t.album?.cover || '',
      searchKey: `${t.title} ${t.artist?.name || ''} official audio`
    }));
    res.json({ tracks });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 2. Extraire l'URL audio directe complète sans pub via yt-dlp
app.get('/api/stream', (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  // Recherche le top résultat YouTube et extrait l'URL audio directement
  const ytdlp = spawn('yt-dlp', ['-g', '-f', 'ba', `ytsearch1:${query}`]);
  let output = '';
  let errorOutput = '';

  ytdlp.stdout.on('data', data => {
    output += data.toString();
  });

  ytdlp.stderr.on('data', data => {
    errorOutput += data.toString();
  });

  ytdlp.on('close', code => {
    if (code === 0 && output.trim()) {
      const audioUrl = output.trim().split('\n')[0];
      res.json({ streamUrl: audioUrl });
    } else {
      console.error('yt-dlp error:', errorOutput);
      res.status(500).json({ error: 'Failed to extract stream' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🎵 SonicFlow Server running on http://localhost:${PORT}`);
});
