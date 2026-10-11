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

  // Tabs: 'all' | 'music' | 'liked' | 'playlist'
  const [activeTab, setActiveTab] = useState('all');
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
    setActiveTab('all');
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
    <div className="h-full flex flex-col bg-[#0f0f0f] text-[#f5f5f7] select-none">
      {/* Top Header avec DA Spotify de la capture : Home button + Search Pill centrée */}
      <header className="sticky top-0 z-40 px-6 py-2.5 bg-black flex items-center justify-between gap-4 border-b border-white/[0.04]">
        {/* Flèches et Logo gauche */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="text-sm font-bold tracking-widest cursor-pointer hover:text-white">•••</span>
            <div className="flex items-center gap-1 ml-2">
              <button className="w-7 h-7 rounded-full bg-[#121212] hover:bg-[#1a1a1a] flex items-center justify-center text-xs text-neutral-400 hover:text-white">‹</button>
              <button className="w-7 h-7 rounded-full bg-[#121212] hover:bg-[#1a1a1a] flex items-center justify-center text-xs text-neutral-400 hover:text-white">›</button>
            </div>
          </div>
        </div>

        {/* Centre : Bouton Accueil + Barre de Recherche fidèle à la capture */}
        <div className="flex-1 max-w-xl flex items-center gap-2 justify-center">
          {/* Bouton Home rond */}
          <button
            onClick={() => { setActiveTab('all'); setHasSearched(false); }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              activeTab === 'all' && !hasSearched ? 'bg-[#242424] text-white' : 'bg-[#1f1f1f] text-neutral-300 hover:scale-105'
            }`}
            title="Accueil"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </button>

          {/* SearchBar Input */}
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>

        {/* Profil / Actions droite */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const name = prompt('Nom de la playlist :');
              if (name && name.trim()) handleCreatePlaylist(name.trim(), null);
            }}
            className="w-8 h-8 rounded-full bg-[#1f1f1f] hover:bg-[#282828] text-neutral-300 hover:text-white flex items-center justify-center text-xs font-bold"
            title="Créer une playlist"
          >
            +
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow">
            A
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className={`flex-1 overflow-y-auto ${currentTrack ? 'pb-32' : 'pb-10'}`}>
        <div className="max-w-6xl mx-auto px-6 pt-5">
          {/* Rangée de filtres pilules (Tout, Musique, Titres likés, etc. de la capture) */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'all' ? 'bg-white text-black' : 'bg-[#242424] text-neutral-300 hover:bg-[#2a2a2a]'
              }`}
            >
              Tout
            </button>

            <button
              onClick={() => setActiveTab('liked')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'liked' ? 'bg-white text-black' : 'bg-[#242424] text-neutral-300 hover:bg-[#2a2a2a]'
              }`}
            >
              <span className="text-red-500">♥</span>
              <span>Titres likés ({likedTracks.length})</span>
            </button>

            {playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => { setSelectedPlaylistId(pl.id); setActiveTab('playlist'); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium max-w-xs truncate transition-all ${
                  activeTab === 'playlist' && selectedPlaylistId === pl.id
                    ? 'bg-white text-black font-semibold'
                    : 'bg-[#242424] text-neutral-300 hover:bg-[#2a2a2a]'
                }`}
              >
                {pl.name}
              </button>
            ))}
          </div>

          {/* Grille de raccourcis rapide (Quick Access Cards comme sur l'image) */}
          {activeTab === 'all' && !hasSearched && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {/* Carte Titres likés */}
              <div
                onClick={() => setActiveTab('liked')}
                className="bg-[#242424] hover:bg-[#2e2e2e] rounded-md flex items-center gap-3 overflow-hidden cursor-pointer group transition-all"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-400 flex items-center justify-center text-white shrink-0 shadow">
                  ♥
                </div>
                <span className="text-xs font-bold text-white truncate pr-2">Titres likés</span>
              </div>

              {/* Raccourcis playlists */}
              {playlists.slice(0, 7).map(pl => (
                <div
                  key={pl.id}
                  onClick={() => { setSelectedPlaylistId(pl.id); setActiveTab('playlist'); }}
                  className="bg-[#242424] hover:bg-[#2e2e2e] rounded-md flex items-center gap-3 overflow-hidden cursor-pointer group transition-all"
                >
                  <div className="w-12 h-12 bg-neutral-800 flex items-center justify-center text-white shrink-0 text-base shadow">
                    🎵
                  </div>
                  <span className="text-xs font-bold text-white truncate pr-2">{pl.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* En-tête des vues Favoris et Playlists */}
          {activeTab === 'liked' && (
            <div className="mb-6 flex items-end gap-5">
              <div className="w-20 h-20 rounded-md bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center text-white text-3xl shadow-xl">
                ♥
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Playlist</p>
                <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5">Titres likés</h2>
                <p className="text-xs text-neutral-400 mt-1 font-mono">{likedTracks.length} titre(s)</p>
              </div>
            </div>
          )}

          {activeTab === 'playlist' && currentDisplayedPlaylist && (
            <div className="mb-6 flex items-end gap-5">
              <div className="w-20 h-20 rounded-md bg-[#242424] flex items-center justify-center text-white text-3xl shadow-xl">
                🎵
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Playlist</p>
                <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5">{currentDisplayedPlaylist.name}</h2>
                <p className="text-xs text-neutral-400 mt-1 font-mono">{currentDisplayedPlaylist.tracks.length} titre(s)</p>
              </div>
            </div>
          )}

          {/* Liste de pistes */}
          <TrackList
            tracks={displayedTracks}
            onPlay={(t) => handlePlay(t, displayedTracks)}
            currentTrack={currentTrack}
            isLoading={isLoading}
            onToggleLike={handleToggleLike}
            likedTrackIds={likedTracks.map(t => t.id)}
            onAddToPlaylist={(t) => setModalTrack(t)}
          />

          {displayedTracks.length === 0 && !isLoading && (hasSearched || activeTab !== 'all') && (
            <p className="text-center text-neutral-500 text-xs mt-16">
              {activeTab === 'liked' ? 'Aucun titre dans vos favoris.' :
               activeTab === 'playlist' ? 'Cette playlist est vide.' :
               'Aucun résultat.'}
            </p>
          )}
        </div>
      </main>

      {/* Lecteur Audio centré en bas */}
      <Player
        track={currentTrack}
        nextTrack={nextTrack}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onToggleLike={handleToggleLike}
        isLiked={currentTrack ? likedTracks.some(t => t.id === currentTrack.id) : false}
      />

      {/* Modale d'ajout à une playlist */}
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
