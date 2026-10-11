import { useState, useEffect, useRef } from 'react';
import SearchBar from './components/SearchBar';
import TrackList from './components/TrackList';
import Player from './components/Player';
import PlaylistModal from './components/PlaylistModal';
import { searchTracks, getRecommendations } from './services/piped';

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [nextTrack, setNextTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Tabs: 'search' | 'liked' | 'playlist'
  const [activeTab, setActiveTab] = useState('search');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);

  const [likedTracks, setLikedTracks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sf_liked_tracks') || '[]');
    } catch { return []; }
  });

  const [playlists, setPlaylists] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sf_playlists') || '[]');
    } catch { return []; }
  });

  const [modalTrack, setModalTrack] = useState(null);
  const queueRef = useRef([]);
  const historyRef = useRef([]);

  useEffect(() => {
    localStorage.setItem('sf_liked_tracks', JSON.stringify(likedTracks));
  }, [likedTracks]);

  useEffect(() => {
    localStorage.setItem('sf_playlists', JSON.stringify(playlists));
  }, [playlists]);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setTracks([]);
      setHasSearched(false);
      return;
    }
    setActiveTab('search');
    setIsLoading(true);
    setHasSearched(true);
    try {
      const results = await searchTracks(query);
      setTracks(results);
    } catch (e) {
      console.error('Search failed:', e);
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = (track, sourceList = tracks) => {
    if (currentTrack) {
      historyRef.current.push(currentTrack);
    }
    setCurrentTrack(track);

    const currentIndex = sourceList.findIndex(t => t.id === track.id);
    if (currentIndex !== -1 && currentIndex < sourceList.length - 1) {
      const remaining = sourceList.slice(currentIndex + 1);
      queueRef.current = remaining;
      setNextTrack(remaining[0]);
    } else {
      fetchMoreRecommendations(track);
    }
  };

  const fetchMoreRecommendations = async (track) => {
    try {
      const recs = await getRecommendations(track);
      if (recs && recs.length > 0) {
        queueRef.current = recs;
        setNextTrack(recs[0]);
      }
    } catch (e) {
      console.error('Failed to get recommendations', e);
    }
  };

  const handleNext = async () => {
    if (queueRef.current.length > 0) {
      const nTrack = queueRef.current.shift();
      if (currentTrack) historyRef.current.push(currentTrack);
      setCurrentTrack(nTrack);
      setNextTrack(queueRef.current[0] || null);

      if (queueRef.current.length <= 1) {
        fetchMoreRecommendations(nTrack);
      }
    } else if (currentTrack) {
      const recs = await getRecommendations(currentTrack);
      if (recs && recs.length > 0) {
        const nTrack = recs[0];
        queueRef.current = recs.slice(1);
        setNextTrack(recs[1] || null);
        if (currentTrack) historyRef.current.push(currentTrack);
        setCurrentTrack(nTrack);
      }
    }
  };

  const handlePrevious = () => {
    if (historyRef.current.length > 0) {
      const prevTrack = historyRef.current.pop();
      if (currentTrack) {
        queueRef.current.unshift(currentTrack);
        setNextTrack(currentTrack);
      }
      setCurrentTrack(prevTrack);
    }
  };

  const handleToggleLike = (track) => {
    setLikedTracks(prev => {
      const exists = prev.some(t => t.id === track.id);
      if (exists) {
        return prev.filter(t => t.id !== track.id);
      } else {
        return [track, ...prev];
      }
    });
  };

  const handleCreatePlaylist = (name, initialTrack) => {
    const newPl = {
      id: Date.now().toString(),
      name,
      tracks: initialTrack ? [initialTrack] : []
    };
    setPlaylists(prev => [...prev, newPl]);
  };

  const handleAddToPlaylist = (playlistId, track) => {
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        const alreadyIn = pl.tracks.some(t => t.id === track.id);
        if (!alreadyIn) {
          return { ...pl, tracks: [...pl.tracks, track] };
        }
      }
      return pl;
    }));
  };

  const currentDisplayedPlaylist = playlists.find(p => p.id === selectedPlaylistId);
  const displayedTracks =
    activeTab === 'liked' ? likedTracks :
    activeTab === 'playlist' ? (currentDisplayedPlaylist?.tracks || []) :
    tracks;

  return (
    <div className="h-full flex flex-col bg-[#050505] text-[#f5f5f7] select-none">
      {/* Apple Frosted Floating Navigation Bar */}
      <header className="sticky top-0 z-40 px-6 py-4 border-b border-white/[0.06] apple-glass flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-white to-neutral-400 p-[1px] shadow-sm">
            <div className="w-full h-full bg-black rounded-[11px] flex items-center justify-center">
              <span className="text-white text-xs font-black">▶</span>
            </div>
          </div>
          <h1 className="text-base font-semibold tracking-tight text-white">SonicFlow</h1>
        </div>

        {/* Apple Segmented Pill Navigation */}
        <div className="flex items-center gap-1.5 bg-neutral-900/90 p-1 rounded-full border border-white/[0.08] shadow-inner">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all apple-press ${
              activeTab === 'search' 
                ? 'bg-white text-black shadow-sm font-semibold' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Explorer
          </button>

          <button
            onClick={() => setActiveTab('liked')}
            className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all apple-press flex items-center gap-1.5 ${
              activeTab === 'liked' 
                ? 'bg-white text-black shadow-sm font-semibold' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span className={activeTab === 'liked' ? 'text-red-500' : ''}>♥</span>
            <span>Favoris ({likedTracks.length})</span>
          </button>

          {playlists.map(pl => (
            <button
              key={pl.id}
              onClick={() => { setSelectedPlaylistId(pl.id); setActiveTab('playlist'); }}
              className={`px-3 py-1 rounded-full text-xs font-medium max-w-xs truncate transition-all apple-press ${
                activeTab === 'playlist' && selectedPlaylistId === pl.id
                  ? 'bg-white text-black shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {pl.name}
            </button>
          ))}

          <button
            onClick={() => {
              const name = prompt('Nom de la playlist :');
              if (name && name.trim()) handleCreatePlaylist(name.trim(), null);
            }}
            className="w-6 h-6 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center text-xs apple-press transition-colors"
            title="Créer une playlist"
          >
            +
          </button>
        </div>
      </header>

      {/* Main Surface */}
      <main className={`flex-1 overflow-y-auto ${currentTrack ? 'pb-36' : 'pb-12'}`}>
        <div className="max-w-4xl mx-auto px-6 pt-8">
          {activeTab === 'search' && (
            <div className="mb-8">
              <SearchBar onSearch={handleSearch} />

              {!hasSearched && (
                <div className="text-center mt-28 max-w-sm mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-white/10 mx-auto flex items-center justify-center mb-4 text-2xl shadow-xl">
                    🎧
                  </div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">Votre musique, instantanément</h2>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                    Recherchez vos morceaux favoris. Enchaînement et bufferisation continue sans interruption.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'liked' && (
            <div className="mb-8 flex items-end gap-5">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-950 border border-white/10 flex items-center justify-center text-red-500 text-3xl shadow-2xl">
                ♥
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-neutral-400">Bibliothèque</p>
                <h2 className="text-3xl font-bold text-white tracking-tight mt-0.5">Titres likés</h2>
                <p className="text-xs text-neutral-400 mt-1 font-mono">{likedTracks.length} morceau(x)</p>
              </div>
            </div>
          )}

          {activeTab === 'playlist' && currentDisplayedPlaylist && (
            <div className="mb-8 flex items-end gap-5">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-950 border border-white/10 flex items-center justify-center text-white text-3xl shadow-2xl">
                🎵
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-neutral-400">Playlist</p>
                <h2 className="text-3xl font-bold text-white tracking-tight mt-0.5">{currentDisplayedPlaylist.name}</h2>
                <p className="text-xs text-neutral-400 mt-1 font-mono">{currentDisplayedPlaylist.tracks.length} morceau(x)</p>
              </div>
            </div>
          )}

          <TrackList
            tracks={displayedTracks}
            onPlay={(t) => handlePlay(t, displayedTracks)}
            currentTrack={currentTrack}
            isLoading={isLoading}
            onToggleLike={handleToggleLike}
            likedTrackIds={likedTracks.map(t => t.id)}
            onAddToPlaylist={(t) => setModalTrack(t)}
          />

          {displayedTracks.length === 0 && !isLoading && (hasSearched || activeTab !== 'search') && (
            <p className="text-center text-neutral-500 text-xs mt-16">
              {activeTab === 'liked' ? 'Aucun titre dans vos favoris.' :
               activeTab === 'playlist' ? 'Cette playlist ne contient aucun titre pour l’instant.' :
               'Aucun résultat.'}
            </p>
          )}
        </div>
      </main>

      {/* Floating Apple Island Player */}
      <Player
        track={currentTrack}
        nextTrack={nextTrack}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onToggleLike={handleToggleLike}
        isLiked={currentTrack ? likedTracks.some(t => t.id === currentTrack.id) : false}
      />

      {/* Modal */}
      <PlaylistModal
        isOpen={!!modalTrack}
        onClose={() => setModalTrack(null)}
        track={modalTrack}
        playlists={playlists}
        onCreatePlaylist={handleCreatePlaylist}
        onSelectPlaylist={handleAddToPlaylist}
      />
    </div>
  );
}
