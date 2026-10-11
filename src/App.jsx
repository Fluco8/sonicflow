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

  // Vues : 'search' | 'liked' | 'playlist'
  const [activeTab, setActiveTab] = useState('search');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);

  // Playlists et Titres likés (persistés dans localStorage)
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

  // Modal Playlist
  const [modalTrack, setModalTrack] = useState(null);

  // File d'attente
  const queueRef = useRef([]);
  const historyRef = useRef([]);

  // Sauvegardes localStorage
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

    // Mettre à jour la file d'attente
    const currentIndex = sourceList.findIndex(t => t.id === track.id);
    if (currentIndex !== -1 && currentIndex < sourceList.length - 1) {
      const remaining = sourceList.slice(currentIndex + 1);
      queueRef.current = remaining;
      setNextTrack(remaining[0]);
    } else {
      // Plus rien dans la liste : chercher des recommandations
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

  // Gestion des Likes
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

  // Gestion des Playlists
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

  // Titres à afficher selon la vue active
  const currentDisplayedPlaylist = playlists.find(p => p.id === selectedPlaylistId);
  const displayedTracks =
    activeTab === 'liked' ? likedTracks :
    activeTab === 'playlist' ? (currentDisplayedPlaylist?.tracks || []) :
    tracks;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-neutral-900 via-neutral-950 to-black select-none">
      {/* Barre de navigation Spotify */}
      <div className="border-b border-neutral-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="SonicFlow" className="w-8 h-8 drop-shadow" />
          <h1 className="text-xl font-bold tracking-tight text-white">SonicFlow</h1>
        </div>

        {/* Onglets Bibliothèque */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'search' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            🔍 Découvrir
          </button>

          <button
            onClick={() => setActiveTab('liked')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'liked' ? 'bg-green-500 text-black' : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            <span>♥</span> Titres likés ({likedTracks.length})
          </button>

          {/* Menus Playlists */}
          <div className="flex items-center gap-1">
            {playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => { setSelectedPlaylistId(pl.id); setActiveTab('playlist'); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium max-w-xs truncate transition-all ${
                  activeTab === 'playlist' && selectedPlaylistId === pl.id
                    ? 'bg-neutral-200 text-black font-semibold'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
                }`}
              >
                {pl.name}
              </button>
            ))}

            <button
              onClick={() => {
                const name = prompt('Nom de la nouvelle playlist :');
                if (name && name.trim()) handleCreatePlaylist(name.trim(), null);
              }}
              className="px-2 py-1.5 rounded-full bg-neutral-800/50 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs font-bold"
              title="Créer une playlist"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className={`flex-1 overflow-y-auto ${currentTrack ? 'pb-28' : 'pb-8'}`}>
        <div className="px-6 pt-6">
          {activeTab === 'search' && (
            <>
              <SearchBar onSearch={handleSearch} />

              {!hasSearched && (
                <div className="text-center mt-20">
                  <p className="text-neutral-400 text-lg">Recherche un titre pour commencer la session</p>
                  <p className="text-neutral-600 text-sm mt-2">Pré-buffering actif : les titres s'enchaînent instantanément</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'liked' && (
            <div className="max-w-4xl mx-auto mb-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-green-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                ♥
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-neutral-400">Playlist</p>
                <h2 className="text-2xl font-bold text-white">Titres likés</h2>
                <p className="text-xs text-neutral-500 mt-1">{likedTracks.length} titre(s)</p>
              </div>
            </div>
          )}

          {activeTab === 'playlist' && currentDisplayedPlaylist && (
            <div className="max-w-4xl mx-auto mb-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                🎵
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-neutral-400">Playlist</p>
                <h2 className="text-2xl font-bold text-white">{currentDisplayedPlaylist.name}</h2>
                <p className="text-xs text-neutral-500 mt-1">{currentDisplayedPlaylist.tracks.length} titre(s)</p>
              </div>
            </div>
          )}

          {/* Liste de titres */}
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
            <p className="text-center text-neutral-500 mt-12">
              {activeTab === 'liked' ? 'Tu n’as liké aucun titre pour le moment.' :
               activeTab === 'playlist' ? 'Cette playlist est vide. Ajoute des titres depuis la recherche !' :
               'Aucun résultat trouvé.'}
            </p>
          )}
        </div>
      </div>

      {/* Lecteur avec Pré-chargement automatique */}
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
