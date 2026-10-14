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

  // Vues : 'home' | 'liked' | 'playlist'
  const [activeTab, setActiveTab] = useState('home');
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
    setActiveTab('home');
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
    <div className="h-screen w-screen flex flex-col bg-black text-[#f5f5f7] select-none overflow-hidden font-sans">
      
      {/* 1. Header supérieur Spotify/Apple avec recherche épurée */}
      <header className="h-16 shrink-0 px-6 bg-black flex items-center justify-between gap-4 border-b border-white/[0.05] z-30">
        {/* Logo / Nav arrows */}
        <div className="flex items-center gap-4 w-64 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-white to-neutral-400 p-[1px] shadow">
              <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-black">▶</span>
              </div>
            </div>
            <span className="text-base font-bold tracking-tight text-white">SonicFlow</span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto text-neutral-400">
            <button className="w-7 h-7 rounded-full bg-[#121212] hover:bg-[#1e1e1e] flex items-center justify-center text-xs text-neutral-400 hover:text-white transition-colors">‹</button>
            <button className="w-7 h-7 rounded-full bg-[#121212] hover:bg-[#1e1e1e] flex items-center justify-center text-xs text-neutral-400 hover:text-white transition-colors">›</button>
          </div>
        </div>

        {/* Centre : Bouton Accueil + Barre de Recherche ultra-clean */}
        <div className="flex-1 max-w-xl flex items-center gap-2.5 justify-center">
          <button
            onClick={() => { setActiveTab('home'); setHasSearched(false); }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all apple-press ${
              activeTab === 'home' && !hasSearched ? 'bg-white text-black' : 'bg-[#1f1f1f] text-neutral-300 hover:text-white hover:bg-[#282828]'
            }`}
            title="Accueil"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </button>

          <div className="flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>

        {/* Profil & Actions droite */}
        <div className="flex items-center gap-3 w-64 justify-end shrink-0">
          <button
            onClick={() => {
              const name = prompt('Nom de la playlist :');
              if (name && name.trim()) handleCreatePlaylist(name.trim(), null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1f1f1f] hover:bg-[#282828] text-xs font-semibold text-white transition-all apple-press border border-white/[0.06]"
          >
            <span>+</span>
            <span>Playlist</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow">
            A
          </div>
        </div>
      </header>

      {/* 2. Corps de page : Barre latérale gauche + Contenu principal */}
      <div className="flex-1 flex overflow-hidden p-2 gap-2">
        
        {/* BARRE LATÉRALE GAUCHE (Spotify Library Clean) */}
        <aside className="w-64 shrink-0 bg-[#121212] rounded-xl flex flex-col overflow-hidden border border-white/[0.04] p-3 shadow-sm">
          
          {/* Navigation haute */}
          <div className="space-y-1 mb-4 pb-3 border-b border-white/[0.06]">
            <button
              onClick={() => { setActiveTab('home'); setHasSearched(false); }}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'home' && !hasSearched
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span>Accueil</span>
            </button>

            <button
              onClick={() => setActiveTab('liked')}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'liked'
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-400 flex items-center justify-center text-white text-[10px] shadow">
                ♥
              </div>
              <span className="flex-1 text-left">Titres likés</span>
              <span className="text-[10px] font-mono text-neutral-500">{likedTracks.length}</span>
            </button>
          </div>

          {/* Section Playlists */}
          <div className="flex items-center justify-between px-3 py-1 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Vos Playlists</span>
            <button
              onClick={() => {
                const name = prompt('Nom de la playlist :');
                if (name && name.trim()) handleCreatePlaylist(name.trim(), null);
              }}
              className="text-neutral-400 hover:text-white text-base hover:scale-110 transition-transform"
              title="Nouvelle playlist"
            >
              +
            </button>
          </div>

          {/* Liste déroulante des playlists */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {playlists.length === 0 ? (
              <p className="text-xs text-neutral-500 px-3 py-4 text-center">Aucune playlist créée.</p>
            ) : (
              playlists.map(pl => {
                const isActive = activeTab === 'playlist' && selectedPlaylistId === pl.id;
                return (
                  <button
                    key={pl.id}
                    onClick={() => { setSelectedPlaylistId(pl.id); setActiveTab('playlist'); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all text-left group ${
                      isActive
                        ? 'bg-white/10 text-white font-semibold'
                        : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-md bg-neutral-800 flex items-center justify-center text-xs text-neutral-300 shrink-0 group-hover:bg-neutral-700">
                      🎵
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{pl.name}</p>
                      <p className="text-[10px] text-neutral-500 truncate">{pl.tracks?.length || 0} titre(s)</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ZONE DE CONTENU PRINCIPALE (CENTRE) */}
        <main className={`flex-1 bg-[#121212] rounded-xl overflow-y-auto border border-white/[0.04] p-6 relative ${currentTrack ? 'pb-32' : 'pb-10'}`}>
          
          {/* En-tête de la vue Accueil (Quick Access) */}
          {activeTab === 'home' && !hasSearched && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4 tracking-tight">Bonjour</h2>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Carte Favoris */}
                <div
                  onClick={() => setActiveTab('liked')}
                  className="bg-[#242424] hover:bg-[#2c2c2c] rounded-md flex items-center gap-3 overflow-hidden cursor-pointer group transition-all border border-white/[0.02]"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-400 flex items-center justify-center text-white text-lg shrink-0 shadow">
                    ♥
                  </div>
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-xs font-bold text-white truncate">Titres likés</p>
                    <p className="text-[10px] text-neutral-400">{likedTracks.length} titres</p>
                  </div>
                </div>

                {/* Raccourcis playlists */}
                {playlists.slice(0, 5).map(pl => (
                  <div
                    key={pl.id}
                    onClick={() => { setSelectedPlaylistId(pl.id); setActiveTab('playlist'); }}
                    className="bg-[#242424] hover:bg-[#2c2c2c] rounded-md flex items-center gap-3 overflow-hidden cursor-pointer group transition-all border border-white/[0.02]"
                  >
                    <div className="w-14 h-14 bg-neutral-800 flex items-center justify-center text-white shrink-0 text-lg shadow">
                      🎵
                    </div>
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-xs font-bold text-white truncate">{pl.name}</p>
                      <p className="text-[10px] text-neutral-400">{pl.tracks?.length || 0} titres</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* En-tête Favoris */}
          {activeTab === 'liked' && (
            <div className="mb-8 flex items-end gap-5">
              <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center text-white text-4xl shadow-xl">
                ♥
              </div>
              <div>
                <p className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider">Playlist</p>
                <h2 className="text-3xl font-bold text-white tracking-tight mt-0.5">Titres likés</h2>
                <p className="text-xs text-neutral-400 mt-1 font-mono">{likedTracks.length} titre(s)</p>
              </div>
            </div>
          )}

          {/* En-tête Playlist sélectionnée */}
          {activeTab === 'playlist' && currentDisplayedPlaylist && (
            <div className="mb-8 flex items-end gap-5">
              <div className="w-24 h-24 rounded-lg bg-[#242424] flex items-center justify-center text-white text-4xl shadow-xl border border-white/5">
                🎵
              </div>
              <div>
                <p className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider">Playlist</p>
                <h2 className="text-3xl font-bold text-white tracking-tight mt-0.5">{currentDisplayedPlaylist.name}</h2>
                <p className="text-xs text-neutral-400 mt-1 font-mono">{currentDisplayedPlaylist.tracks.length} titre(s)</p>
              </div>
            </div>
          )}

          {/* Liste des titres */}
          <TrackList
            tracks={displayedTracks}
            onPlay={(t) => handlePlay(t, displayedTracks)}
            currentTrack={currentTrack}
            isLoading={isLoading}
            onToggleLike={handleToggleLike}
            likedTrackIds={likedTracks.map(t => t.id)}
            onAddToPlaylist={(t) => setModalTrack(t)}
          />

          {displayedTracks.length === 0 && !isLoading && (hasSearched || activeTab !== 'home') && (
            <p className="text-center text-neutral-500 text-xs mt-16">
              {activeTab === 'liked' ? 'Vous n’avez encore aucun coup de cœur.' :
               activeTab === 'playlist' ? 'Cette playlist est vide. Ajoutez des titres depuis la recherche !' :
               'Aucun résultat.'}
            </p>
          )}
        </main>
      </div>

      {/* 3. LECTEUR AUDIO FLOTTANT CENTRÉ EN BAS */}
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
