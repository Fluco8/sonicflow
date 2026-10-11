import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import NodeCache from 'node-cache';

const app = express();
const PORT = 3001;

// Cache en mémoire (4h)
const cache = new NodeCache({ stdTTL: 14400, checkperiod: 600 });

app.use(cors());
app.use(express.json());

// 1. Recherche via Deezer
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
        trackId: t.id,
        artistId: t.artist?.id
      };
    });

    res.json({ tracks });

    // Pré-extraction en parallèle des 3 premiers titres
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

// 2. Recommandations
app.get('/api/recommendations', async (req, res) => {
  const { artistId, trackId, artist, title } = req.query;

  try {
    let similarTracks = [];

    if (artistId) {
      const r = await fetch(`https://api.deezer.com/artist/${artistId}/top?limit=10`);
      const data = await r.json();
      if (data.data && data.data.length > 0) {
        similarTracks = data.data.filter(t => t.id.toString() !== trackId?.toString());
      }
    }

    if (similarTracks.length < 5 && artist) {
      const r = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(artist)}&limit=10`);
      const data = await r.json();
      if (data.data) {
        const extra = data.data.filter(t => t.id.toString() !== trackId?.toString() && !similarTracks.some(s => s.id === t.id));
        similarTracks = [...similarTracks, ...extra];
      }
    }

    const mapped = similarTracks.map(t => ({
      id: t.id.toString(),
      title: t.title,
      artist: t.artist?.name || artist || 'Inconnu',
      duration: t.duration || 0,
      thumbnail: t.album?.cover_medium || t.album?.cover || '',
      searchKey: `${t.title} ${t.artist?.name || artist || ''} audio`,
      trackId: t.id,
      artistId: t.artist?.id || artistId
    }));

    res.json({ tracks: mapped });

    if (mapped.length > 0 && !cache.has(mapped[0].searchKey)) {
      getOrFetchAudioUrl(mapped[0].searchKey).catch(() => {});
    }
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ tracks: [] });
  }
});

// Extraction tout-terrain avec contournement de la restriction d'âge
function getOrFetchAudioUrl(searchKey) {
  if (cache.has(searchKey)) {
    return Promise.resolve(cache.get(searchKey));
  }

  return new Promise((resolve, reject) => {
    // On scanne jusqu'à 5 résultats et on filtre toute vidéo restreinte par l'âge
    // Ainsi, si le clip officiel a une restriction d'âge, yt-dlp prend l'audio officiel/album immédiatement !
    const args = [
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '--no-abort-on-error',
      '--match-filter', '!is_age_limit',
      '-g',
      '-f', '251/140/ba/b',
      `ytsearch5:${searchKey}`
    ];

    const ytdlp = spawn('yt-dlp', args);
    let output = '';

    ytdlp.stdout.on('data', d => { output += d.toString(); });
    ytdlp.on('close', code => {
      // Récupère la 1ère URL valide retournée parmi les résultats non bloqués
      const lines = output.trim().split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
      if (lines.length > 0) {
        const bestUrl = lines[0];
        cache.set(searchKey, bestUrl);
        resolve(bestUrl);
      } else {
        reject(new Error('Extraction failed'));
      }
    });
    ytdlp.on('error', reject);
  });
}

// 3. Endpoint Stream
app.get('/api/stream', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  if (cache.has(query)) {
    return res.json({ streamUrl: cache.get(query), cached: true });
  }

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
