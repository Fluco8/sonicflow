import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import NodeCache from 'node-cache';

const app = express();
const PORT = 3001;

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

// 2. Importation de Playlists (Deezer & Spotify URL) avec extraction haute fidélité
app.post('/api/import-playlist', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL manquante' });

  try {
    // Cas 1 : URL Deezer
    if (url.includes('deezer.com')) {
      const match = url.match(/playlist\/(\d+)/);
      if (!match) return res.status(400).json({ error: 'Lien de playlist Deezer invalide' });
      const playlistId = match[1];

      const r = await fetch(`https://api.deezer.com/playlist/${playlistId}`);
      const data = await r.json();

      if (!data || !data.tracks || !data.tracks.data) {
        return res.status(404).json({ error: 'Playlist Deezer introuvable ou privée' });
      }

      const tracks = data.tracks.data.map(t => ({
        id: t.id.toString(),
        title: t.title,
        artist: t.artist?.name || 'Inconnu',
        duration: t.duration || 0,
        thumbnail: t.album?.cover_medium || t.album?.cover || '',
        searchKey: `${t.title} ${t.artist?.name || ''} audio`,
        trackId: t.id,
        artistId: t.artist?.id
      }));

      return res.json({
        name: data.title || 'Playlist Deezer Importée',
        cover: data.picture_xl || data.picture_medium || data.picture || (tracks[0]?.thumbnail) || '',
        tracks
      });
    }

    // Cas 2 : URL Spotify (extraction directe depuis l'embed JSON complet de Spotify + covers oEmbed HD)
    if (url.includes('spotify.com')) {
      const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!match) return res.status(400).json({ error: 'Lien de playlist Spotify invalide' });
      const playlistId = match[1];

      // Extraction via le point d'accès embed officiel
      const embedRes = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const html = await embedRes.text();
      const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);

      if (!nextMatch) {
        return res.status(500).json({ error: 'Impossible de lire les données Spotify' });
      }

      const spotifyData = JSON.parse(nextMatch[1]);
      const entity = spotifyData.props?.pageProps?.state?.data?.entity;
      const playlistName = entity?.name || 'Playlist Spotify Importée';
      const playlistCover = entity?.coverArt?.sources?.[0]?.url || entity?.visualIdentity?.image?.[0]?.url || '';
      const rawTrackList = entity?.trackList || [];

      // Récupération concurrente des vraies pochettes d'albums Spotify en paquets
      const chunkSize = 15;
      const coversMap = {};
      for (let i = 0; i < rawTrackList.length; i += chunkSize) {
        const chunk = rawTrackList.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async t => {
          const trackId = (t.uri || '').replace('spotify:track:', '');
          if (!trackId) return;
          try {
            const oRes = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
            if (oRes.ok) {
              const oData = await oRes.json();
              if (oData?.thumbnail_url) {
                coversMap[t.uri] = oData.thumbnail_url;
              }
            }
          } catch {}
        }));
      }

      // Mappage de chaque titre avec sa vraie pochette HD
      const tracks = rawTrackList.map((t, idx) => {
        const cleanArtist = (t.subtitle || '').replace(/\u00a0/g, ' ').split(',')[0].trim();
        const cleanTitle = (t.title || '').trim();
        const realCover = coversMap[t.uri] || playlistCover || 'https://cdn-images.dzcdn.net/images/cover/d41d8cd98f00b204e9800998ecf8427e/250x250-000000-80-0-0.jpg';

        return {
          id: `sp_${playlistId}_${idx}`,
          title: cleanTitle,
          artist: cleanArtist || t.subtitle || 'Artiste inconnu',
          duration: Math.round((t.duration || 180000) / 1000),
          thumbnail: realCover,
          searchKey: `${cleanTitle} ${cleanArtist} audio`
        };
      });

      return res.json({
        name: playlistName,
        cover: playlistCover || tracks[0]?.thumbnail || '',
        tracks
      });
    }

    // Cas 3 : URL Apple Music (music.apple.com)
    if (url.includes('music.apple.com')) {
      const appleRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const html = await appleRes.text();
      const shoebox = html.match(/id="serialized-server-data"[^>]*>([\s\S]+?)<\/script>/);

      if (!shoebox) {
        return res.status(500).json({ error: 'Impossible de lire les données Apple Music' });
      }

      const raw = JSON.parse(shoebox[1]);
      const itemsList = Array.isArray(raw) ? raw : raw.data || [];
      const payload = itemsList[0]?.data;
      const sections = payload?.sections || [];

      // Récupérer le header (titre et cover)
      const headerSec = sections.find(s => s.id?.includes('header') || s.itemKind?.includes('Header'));
      const headerItem = headerSec?.items?.[0] || {};
      const playlistName = headerItem.title || 'Playlist Apple Music';
      const playlistCover = headerItem.artwork?.dictionary?.url
        ? headerItem.artwork.dictionary.url.replace('{w}', '600').replace('{h}', '600').replace('{f}', 'jpg')
        : '';

      // Récupérer la liste des pistes
      const trackSec = sections.find(s => s.items && s.items.length > 1 && (s.itemKind === 'trackLockup' || s.itemKind === 'song'));
      const rawTracks = trackSec?.items || [];

      const tracks = rawTracks.map((t, idx) => {
        const title = (t.title || '').trim();
        const artist = (t.artistName || t.subtitleLinks?.[0]?.title || 'Artiste inconnu').trim();
        const duration = Math.round((t.duration || 180000) / 1000);
        let thumbnail = playlistCover;
        if (t.artwork?.dictionary?.url) {
          thumbnail = t.artwork.dictionary.url.replace('{w}', '300').replace('{h}', '300').replace('{f}', 'jpg');
        }

        return {
          id: `am_${Date.now()}_${idx}`,
          title,
          artist,
          duration,
          thumbnail,
          searchKey: `${title} ${artist} audio`
        };
      });

      return res.json({
        name: playlistName,
        cover: playlistCover || tracks[0]?.thumbnail || '',
        tracks
      });
    }

    return res.status(400).json({ error: 'Collez un lien Spotify, Apple Music ou Deezer valide' });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Échec de l’importation de la playlist' });
  }
});

// 3. Recommandations
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

// 4. Daily Mixes
app.get('/api/mixes', async (req, res) => {
  const styles = [
    { id: 'mix_chill', title: 'Daily Mix 1 • Chill & Indie', query: 'La Femme Mac DeMarco Men I Trust' },
    { id: 'mix_hiphop', title: 'Daily Mix 2 • Rap & Trap', query: 'Drake Travis Scott Kendrick Lamar' },
    { id: 'mix_electro', title: 'Daily Mix 3 • Electro & Synthwave', query: 'Daft Punk Kavinsky Justice' },
    { id: 'mix_pop', title: 'Daily Mix 4 • Pop Hits', query: 'The Weeknd Dua Lipa Harry Styles' },
    { id: 'mix_french', title: 'Daily Mix 5 • Scène Française', query: 'PNL Damso Lomepal Orelsan' }
  ];

  try {
    const mixesWithTracks = await Promise.all(
      styles.map(async (mix) => {
        const r = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(mix.query)}&limit=12`);
        const data = await r.json();
        const tracks = (data.data || []).map(t => ({
          id: t.id.toString(),
          title: t.title,
          artist: t.artist?.name || 'Inconnu',
          duration: t.duration || 0,
          thumbnail: t.album?.cover_medium || t.album?.cover || '',
          searchKey: `${t.title} ${t.artist?.name || ''} audio`,
          trackId: t.id,
          artistId: t.artist?.id
        }));

        return {
          id: mix.id,
          title: mix.title,
          cover: tracks[0]?.thumbnail || '',
          tracks
        };
      })
    );

    res.json({ mixes: mixesWithTracks });
  } catch (err) {
    console.error('Mix error:', err);
    res.status(500).json({ mixes: [] });
  }
});

function getOrFetchAudioUrl(searchKey) {
  if (cache.has(searchKey)) {
    return Promise.resolve(cache.get(searchKey));
  }

  return new Promise((resolve, reject) => {
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
