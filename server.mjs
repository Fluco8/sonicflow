import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import NodeCache from 'node-cache';

const app = express();
const PORT = 3001;

// Cache persistant en mémoire : TTL 4 heures
const cache = new NodeCache({ stdTTL: 14400, checkperiod: 600 });

app.use(cors());
app.use(express.json());

// 1. Recherche via Deezer + Résolution d'ID YouTube ultra-rapide
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
        searchKey,
        // Si déjà en cache, l'app sait qu'elle peut lancer à 0ms
        cached: cache.has(searchKey)
      };
    });

    res.json({ tracks });

    // Pré-extraction en parallèle des 3 premiers titres dès que l'utilisateur tape !
    tracks.slice(0, 3).forEach(track => {
      if (!cache.has(track.searchKey)) {
        getOrFetchAudioUrl(track.searchKey).catch(() => {});
      }
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Extraction optimisée : récupère direct l'ID + le stream en coupant tout scraping superflu
function getOrFetchAudioUrl(searchKey) {
  if (cache.has(searchKey)) {
    return Promise.resolve(cache.get(searchKey));
  }

  return new Promise((resolve, reject) => {
    // Flags d'extraction les plus véloces possibles dans yt-dlp :
    // --skip-download, --no-warnings, pas de lookup de playlist, format direct opus 251 ou m4a 140
    const args = [
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '--no-abort-on-error',
      '-g',
      '-f', '251/140/ba',
      `ytsearch1:${searchKey}`
    ];

    const ytdlp = spawn('yt-dlp', args);
    let output = '';

    ytdlp.stdout.on('data', d => { output += d.toString(); });
    ytdlp.on('close', code => {
      const url = output.trim().split('\n')[0];
      if (code === 0 && url && url.startsWith('http')) {
        cache.set(searchKey, url);
        resolve(url);
      } else {
        reject(new Error('Extraction failed'));
      }
    });
    ytdlp.on('error', reject);
  });
}

// 2. Endpoint Stream ultra-rapide
app.get('/api/stream', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  // 1. Si en cache -> Réponse immédiate (< 1ms)
  if (cache.has(query)) {
    return res.json({ streamUrl: cache.get(query), cached: true });
  }

  // 2. Sinon résolution rapide
  try {
    const streamUrl = await getOrFetchAudioUrl(query);
    res.json({ streamUrl, cached: false });
  } catch (err) {
    console.error('Stream error:', err.message);
    res.status(500).json({ error: 'Failed to extract stream' });
  }
});

app.listen(PORT, () => {
  console.log(`⚡ SonicFlow Turbo Server on http://localhost:${PORT}`);
});
