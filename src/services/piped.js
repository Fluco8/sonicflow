// Chemins locaux relayés par le proxy (voir vite.config.js)
const PIPED_INSTANCES = [
  '/piped/kavin',
  '/piped/adminforge',
  '/piped/segfau',
];

const TIMEOUT_MS = 8000;

let currentInstance = 0;

async function pipedFetch(path) {
  let lastError;
  for (let i = 0; i < PIPED_INSTANCES.length; i++) {
    const idx = (currentInstance + i) % PIPED_INSTANCES.length;
    const url = PIPED_INSTANCES[idx] + path;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      currentInstance = idx;
      return await res.json();
    } catch (e) {
      lastError = e;
      console.warn(`Instance ${PIPED_INSTANCES[idx]} failed:`, e.message);
    }
  }
  throw lastError;
}

export async function searchTracks(query) {
  if (!query.trim()) return [];
  const data = await pipedFetch(
    `/search?q=${encodeURIComponent(query)}&filter=music_songs`
  );
  return (data.items || []).filter(item => item.url).map(item => ({
    id: item.url.replace('/watch?v=', ''),
    title: item.title || 'Unknown',
    artist: item.uploaderName || 'Unknown',
    thumbnail: item.thumbnail || '',
    duration: item.duration || 0,
  }));
}

export async function getStreamUrl(videoId) {
  const data = await pipedFetch(`/streams/${videoId}`);
  const audioStreams = (data.audioStreams || [])
    .filter(s => s.mimeType && s.mimeType.startsWith('audio/'))
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  if (audioStreams.length === 0) {
    throw new Error('No audio stream found');
  }

  return {
    url: audioStreams[0].url,
    title: data.title || 'Unknown',
    artist: data.uploader || 'Unknown',
    thumbnail: data.thumbnailUrl || '',
    duration: data.duration || 0,
  };
}

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
