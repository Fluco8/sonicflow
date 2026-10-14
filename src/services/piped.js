const API_BASE = 'http://localhost:3001/api';

export async function searchTracks(query) {
  if (!query.trim()) return [];
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data.tracks || [];
}

export async function getRecommendations(track) {
  if (!track) return [];
  const params = new URLSearchParams();
  if (track.artistId) params.append('artistId', track.artistId);
  if (track.trackId) params.append('trackId', track.trackId);
  if (track.artist) params.append('artist', track.artist);
  if (track.title) params.append('title', track.title);

  const res = await fetch(`${API_BASE}/recommendations?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.tracks || [];
}

export async function getDailyMixes() {
  const res = await fetch(`${API_BASE}/mixes`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.mixes || [];
}

export async function getStreamUrl(searchKey) {
  const res = await fetch(`${API_BASE}/stream?q=${encodeURIComponent(searchKey)}`);
  if (!res.ok) throw new Error('Streaming extraction failed');
  const data = await res.json();
  if (!data.streamUrl) throw new Error('No stream URL');
  return data.streamUrl;
}

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
