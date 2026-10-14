import { useState, useEffect, useRef } from 'react';
import SearchBar from './components/SearchBar';
import TrackList from './components/TrackList';
import Player from './components/Player';
import PlaylistModal from './components/PlaylistModal';
import { searchTracks, getRecommendations, getDailyMixes, importPlaylist } from './services/piped';

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [nextTrack, setNextTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Vues : 'home' | 'mixes' | 'liked' | 'playlist'
  const [activeTab, setActiveTab] = useState('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [selectedMix, setSelectedMix] = useState(null);

  // Daily Mixes
  const [dailyMixes, setDailyMixes] = useState([]);

  // Modales in-page
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  // Modale création de playlist in-page
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Modale confirmation de suppression in-page
  const [playlistToDelete, setPlaylistToDelete] = useState(null);

  // Menu contextuel clic droit sur playlist
  const [contextMenu, setContextMenu] = useState(null);

  // Largeur dynamique ajustable de la barre latérale
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('sf_sidebar_width');
      return saved ? parseInt(saved, 10) : 280;
    } catch {
      return 280;
    }
  });

  const isResizingRef = useRef(false);

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

  useEffect(() => {
    localStorage.setItem('sf_sidebar_width', sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    getDailyMixes().then(mixes => {
      if (mixes && mixes.length > 0) setDailyMixes(mixes);
    }).catch(() => {});
  }, []);

  const startResizing = (e) => {
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.min(Math.max(200, moveEvent.clientX), 500);
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

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

  const submitCreatePlaylist = (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const newPl = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      tracks: []
    };
    setPlaylists(prev => [...prev, newPl]);
    setSelectedPlaylistId(newPl.id);
    setActiveTab('playlist');
    setNewPlaylistName('');
    setIsCreateModalOpen(false);
  };

  const confirmDeletePlaylist = () => {
    if (!playlistToDelete) return;
    setPlaylists(prev => prev.filter(p => p.id !== playlistToDelete.id));
    if (selectedPlaylistId === playlistToDelete.id) {
      setActiveTab('home');
      setSelectedPlaylistId(null);
    }
    setPlaylistToDelete(null);
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

  const handleContextMenu = (e, pl) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      playlist: pl
    });
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importUrl.trim()) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const data = await importPlaylist(importUrl.trim());
      const newPlaylist = {
        id: Date.now().toString(),
        name: data.name || 'Playlist importée',
        tracks: data.tracks || []
      };

      setPlaylists(prev => [newPlaylist, ...prev]);
      setSelectedPlaylistId(newPlaylist.id);
      setActiveTab('playlist');
      setIsImportModalOpen(false);
      setImportUrl('');
    } catch (err) {
      setImportError(err.message || 'Impossible d’importer cette playlist');
    } finally {
      setIsImporting(false);
    }
  };

  const currentDisplayedPlaylist = playlists.find(p => p.id === selectedPlaylistId);
  const displayedTracks =
    activeTab === 'liked' ? likedTracks :
    activeTab === 'playlist' ? (currentDisplayedPlaylist?.tracks || []) :
    activeTab === 'mixes' && selectedMix ? selectedMix.tracks :
    tracks;

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-[#f5f5f7] select-none overflow-hidden">
      
      {/* 1. Header supérieur épuré */}
      <header className="h-16 shrink-0 px-6 bg-black flex items-center justify-between gap-4 border-b border-white/[0.05] z-30">
        <div className="flex items-center gap-4 w-72 shrink-0">
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

        {/* Centre : Bouton Accueil + Barre de Recherche */}
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

        {/* Boutons Créer & Importer droite - Harmonisés et parfaitement centrés */}
        <div className="flex items-center gap-2.5 w-72 justify-end shrink-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] text-xs font-semibold text-neutral-200 hover:text-white transition-all apple-press border border-white/[0.08] shadow-sm"
            title="Importer une playlist Spotify ou Deezer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Importer</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-white hover:bg-neutral-200 text-xs font-bold text-black transition-all apple-press shadow-sm"
          >
            <span className="text-sm font-black leading-none">+</span>
            <span>Playlist</span>
          </button>
          
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-md ml-1">
            A
          </div>
        </div>
      </header>

      {/* 2. Corps de page */}
      <div className="flex-1 flex overflow-hidden p-2 gap-0 relative">
        
        {/* BARRE LATÉRALE */}
        <aside
          style={{ width: `${sidebarWidth}px` }}
          className="shrink-0 bg-[#121212] rounded-xl flex flex-col overflow-hidden border border-white/[0.04] p-3.5 shadow-sm select-none"
        >
          <div className="space-y-1 mb-4 pb-3 border-b border-white/[0.06]">
            <button
              onClick={() => { setActiveTab('home'); setHasSearched(false); }}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'home' && !hasSearched
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span className="text-[13px]">Accueil</span>
            </button>

            <button
              onClick={() => { setActiveTab('mixes'); setSelectedMix(dailyMixes[0] || null); }}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'mixes'
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-white text-xs font-bold shadow">
                ⚡
              </div>
              <span className="text-[13px] flex-1 text-left">Daily Mixes</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">Style</span>
            </button>

            <button
              onClick={() => setActiveTab('liked')}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'liked'
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-400 flex items-center justify-center text-white text-xs shadow">
                ♥
              </div>
              <span className="text-[13px] flex-1 text-left">Titres likés</span>
              <span className="text-xs font-mono text-neutral-400 font-medium">{likedTracks.length}</span>
            </button>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Vos Playlists</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="w-7 h-7 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center text-xs transition-colors apple-press"
                title="Importer depuis Spotify ou Deezer"
              >
                📥
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-7 h-7 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center text-sm font-bold transition-colors apple-press"
                title="Nouvelle playlist"
              >
                +
              </button>
            </div>
          </div>

          {/* Liste des playlists */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {playlists.length === 0 ? (
              <p className="text-xs text-neutral-500 px-3 py-6 text-center">Aucune playlist créée.</p>
            ) : (
              playlists.map(pl => {
                const isActive = activeTab === 'playlist' && selectedPlaylistId === pl.id;
                return (
                  <div
                    key={pl.id}
                    onContextMenu={(e) => handleContextMenu(e, pl)}
                    onClick={() => { setSelectedPlaylistId(pl.id); setActiveTab('playlist'); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group cursor-pointer ${
                      isActive
                        ? 'bg-white/10 text-white font-semibold'
                        : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-neutral-800 to-neutral-700 flex items-center justify-center text-base text-neutral-200 shrink-0 shadow-md group-hover:scale-105 transition-transform border border-white/5">
                      🎵
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white tracking-tight">{pl.name}</p>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">{pl.tracks?.length || 0} titre(s)</p>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); setPlaylistToDelete(pl); }}
                      className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-400 text-xs transition-all"
                      title="Supprimer la playlist"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* POIGNÉE REDIMENSIONNABLE */}
        <div
          onMouseDown={startResizing}
          className="w-2.5 hover:w-2.5 cursor-col-resize flex items-center justify-center group relative z-20 transition-colors"
          title="Glisser pour redimensionner"
        >
          <div className="w-[3px] h-8 rounded-full bg-neutral-700/60 group-hover:bg-white/80 transition-colors" />
        </div>

        {/* CONTENU PRINCIPAL */}
        <main className={`flex-1 bg-[#121212] rounded-xl overflow-y-auto border border-white/[0.04] p-6 relative ${currentTrack ? 'pb-32' : 'pb-10'}`}>
          
          {activeTab === 'home' && !hasSearched && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Bonjour</h2>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div
                  onClick={() => setActiveTab('liked')}
                  className="bg-[#242424] hover:bg-[#2c2c2c] rounded-md flex items-center gap-3.5 overflow-hidden cursor-pointer group transition-all border border-white/[0.02]"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-400 flex items-center justify-center text-white text-xl shrink-0 shadow">
                    ♥
                  </div>
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-bold text-white truncate">Titres likés</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{likedTracks.length} titres</p>
                  </div>
                </div>

                {playlists.slice(0, 5).map(pl => (
                  <div
                    key={pl.id}
                    onClick={() => { setSelectedPlaylistId(pl.id); setActiveTab('playlist'); }}
                    className="bg-[#242424] hover:bg-[#2c2c2c] rounded-md flex items-center gap-3.5 overflow-hidden cursor-pointer group transition-all border border-white/[0.02]"
                  >
                    <div className="w-16 h-16 bg-neutral-800 flex items-center justify-center text-white shrink-0 text-xl shadow">
                      🎵
                    </div>
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-sm font-bold text-white truncate">{pl.name}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{pl.tracks?.length || 0} titres</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'mixes' && (
            <div className="mb-8">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-white tracking-tight">Vos Daily Mixes</h2>
                <p className="text-xs text-neutral-400 mt-1">Musiques du même univers réunies automatiquement.</p>
              </div>

              <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2 scrollbar-none">
                {dailyMixes.map(mix => (
                  <button
                    key={mix.id}
                    onClick={() => setSelectedMix(mix)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-semibold shrink-0 transition-all apple-press flex items-center gap-2 border ${
                      selectedMix?.id === mix.id
                        ? 'bg-white text-black border-white shadow-lg'
                        : 'bg-[#1e1e1e] text-neutral-300 border-white/[0.06] hover:bg-[#282828] hover:text-white'
                    }`}
                  >
                    <span>⚡</span>
                    <span>{mix.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'liked' && (
            <div className="mb-8 flex items-end gap-5">
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center text-white text-4xl shadow-xl">
                ♥
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-neutral-400 tracking-wider">Playlist</p>
                <h2 className="text-3xl font-bold text-white tracking-tight mt-0.5">Titres likés</h2>
                <p className="text-xs text-neutral-400 mt-1 font-mono">{likedTracks.length} titre(s)</p>
              </div>
            </div>
          )}

          {/* En-tête Playlist sélectionnée avec bouton Supprimer parfaitement aligné */}
          {activeTab === 'playlist' && currentDisplayedPlaylist && (
            <div className="mb-8 flex items-end justify-between gap-5 border-b border-white/[0.06] pb-6">
              <div className="flex items-end gap-5">
                <div className="w-24 h-24 rounded-xl bg-[#242424] flex items-center justify-center text-white text-4xl shadow-xl border border-white/5">
                  🎵
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-neutral-400 tracking-wider">Playlist</p>
                  <h2 className="text-3xl font-bold text-white tracking-tight mt-0.5">{currentDisplayedPlaylist.name}</h2>
                  <p className="text-xs text-neutral-400 mt-1 font-mono">{currentDisplayedPlaylist.tracks.length} titre(s)</p>
                </div>
              </div>

              {/* Bouton Supprimer la playlist parfaitement centré */}
              <button
                onClick={() => setPlaylistToDelete(currentDisplayedPlaylist)}
                className="flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-xs font-semibold transition-all apple-press shadow-sm"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Supprimer la playlist</span>
              </button>
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
        onCreatePlaylist={(name, track) => {
          const newPl = { id: Date.now().toString(), name, tracks: track ? [track] : [] };
          setPlaylists(prev => [...prev, newPl]);
        }}
        onSelectPlaylist={handleAddToPlaylist}
      />

      {/* MODALE CRÉATION PLAYLIST IN-PAGE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="apple-glass rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-white tracking-tight">Nouvelle Playlist</h2>
              <button 
                onClick={() => { setIsCreateModalOpen(false); setNewPlaylistName(''); }} 
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center text-xs apple-press transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitCreatePlaylist} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                placeholder="Donnez un nom à votre playlist..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full bg-white/[0.06] px-4 py-2.5 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40 border border-white/[0.04]"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); setNewPlaylistName(''); }}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-white text-black font-bold text-xs px-5 py-2 rounded-xl apple-press transition-all shadow"
                >
                  Créer la playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CONFIRMATION SUPPRESSION AVEC BOUTON BIEN CENTRÉ */}
      {playlistToDelete && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="apple-glass rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-150">
            {/* Cercle d'icône rouge parfaitement centré */}
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto mb-3.5 border border-red-500/20">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h3 className="text-center text-base font-bold text-white tracking-tight mb-1">Supprimer la playlist ?</h3>
            <p className="text-center text-xs text-neutral-400 mb-5 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer <span className="text-white font-medium">« {playlistToDelete.name} »</span> ? Cette action est irréversible.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setPlaylistToDelete(null)}
                className="flex-1 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 text-xs text-neutral-200 font-semibold transition-all apple-press"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeletePlaylist}
                className="flex-1 h-10 flex items-center justify-center rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all apple-press shadow-lg shadow-red-500/20"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE D'IMPORTATION */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="apple-glass rounded-3xl w-full max-w-md p-6 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-white tracking-tight">Importer une Playlist</h2>
              <button 
                onClick={() => { setIsImportModalOpen(false); setImportError(null); }} 
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center text-xs apple-press transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Collez le lien de partage d'une playlist publique <span className="text-white font-medium">Spotify</span> ou <span className="text-white font-medium">Deezer</span>.
            </p>

            <form onSubmit={handleImportSubmit} className="space-y-3">
              <input
                type="url"
                required
                placeholder="https://open.spotify.com/playlist/... ou https://deezer.com/playlist/..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="w-full bg-white/[0.06] px-4 py-2.5 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40 border border-white/[0.04]"
              />

              {importError && (
                <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">{importError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsImportModalOpen(false); setImportError(null); }}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="bg-white text-black font-bold text-xs px-5 py-2 rounded-xl apple-press transition-all shadow disabled:opacity-50 flex items-center gap-2"
                >
                  {isImporting && <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                  <span>{isImporting ? 'Importation...' : 'Importer la playlist'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MENU CONTEXTUEL CLIC DROIT */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 bg-[#282828] border border-white/10 rounded-xl py-1 shadow-2xl min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setPlaylistToDelete(contextMenu.playlist);
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-white/10 hover:text-red-300 flex items-center gap-2 transition-colors font-medium"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Supprimer la playlist</span>
          </button>
        </div>
      )}

    </div>
  );
}
