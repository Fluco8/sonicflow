import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Cache en mémoire des flux extraits : clé = query, valeur = { url, timestamp }
const streamCache = new Map();

// 1. Recherche Deezer instantanée
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ tracks: [] });

  try {
    const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`);
    const data = await response.json();
    const tracks = (data.data || []).map(t => {
      const searchKey = `${t.title} ${t.artist?.name || ''} audio`;
      return {
        id: t.id.toString(),
        title: t.title,
        artist: t.artist?.name || 'Inconnu',
        duration: t.duration || 0,
        thumbnail: t.album?.cover_medium || t.album?.cover || '',
        searchKey
      };
    });

    res.json({ tracks });

    // Pré-chauffe automatiquement le 1er résultat en arrière-plan pour du 0-délai au clic !
    if (tracks.length > 0) {
      prefetchStream(tracks[0].searchKey);
    }
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

function prefetchStream(searchKey) {
  if (streamCache.has(searchKey)) return;
  extractStreamFast(searchKey).then(url => {
    if (url) streamCache.set(searchKey, { url, time: Date.now() });
  }).catch(() => {});
}

function extractStreamFast(query) {
  return new Promise((resolve, reject) => {
    // Flags ultra-rapides pour yt-dlp :
    // --no-playlist, --no-warnings, pas de check format lourd, format 251 ou ba
    const args = [
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '--prefer-free-formats',
      '-g',
      '-f', '251/ba/b',
      `ytsearch1:${query}`
    ];

    const ytdlp = spawn('yt-dlp', args);
    let output = '';

    ytdlp.stdout.on('data', d => { output += d.toString(); });
    ytdlp.on('close', code => {
      const url = output.trim().split('\n')[0];
      if (code === 0 && url && url.startsWith('http')) {
        resolve(url);
      } else {
        reject(new Error('Extraction failed'));
      }
    });
    ytdlp.on('error', reject);
  });
}

// 2. Récupération du flux ultra-rapide (avec cache immédiat)
app.get('/api/stream', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  // 1. Hit cache ? Instantané (< 1ms)
  const cached = streamCache.get(query);
  if (cached && (Date.now() - cached.time < 3600000)) { // 1h validité
    return res.json({ streamUrl: cached.url });
  }

  try {
    const streamUrl = await extractStreamFast(query);
    streamCache.set(query, { url: streamUrl, time: Date.now() });
    res.json({ streamUrl });
  } catch (err) {
    console.error('Stream extraction error:', err.message);
    res.status(500).json({ error: 'Failed to extract stream' });
  }
});

app.listen(PORT, () => {
  console.log(`⚡ SonicFlow Turbo Server on http://localhost:${PORT}`);
});
