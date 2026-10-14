import { useState, useEffect, useRef } from 'react';
import SearchBar from './components/SearchBar';
import TrackList from './components/TrackList';
import Player from './components/Player';
import PlaylistModal from './components/PlaylistModal';
import PlaylistCover from './components/PlaylistCover';
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

  // Filtres et options style Spotify pour la barre latérale
  const [sidebarFilter, setSidebarFilter] = useState('Playlists');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [isSidebarSearchOpen, setIsSidebarSearchOpen] = useState(false);
  const [sidebarSort, setSidebarSort] = useState('recent');
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

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
    const closeMenu = () => {
      setContextMenu(null);
      setIsPlusMenuOpen(false);
    };
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
        url: importUrl.trim(),
        cover: data.cover || (data.tracks?.[0]?.thumbnail) || '',
        tracks: data.tracks || []
      };

      setPlaylists(prev => {
        // Si une playlist avec le même nom existe déjà, on la met à jour avec les vraies pochettes
        const existingIndex = prev.findIndex(p => p.name.toLowerCase() === newPlaylist.name.toLowerCase());
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...newPlaylist, id: updated[existingIndex].id };
          return updated;
        }
        return [newPlaylist, ...prev];
      });

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
  const displayedSidebarPlaylists = playlists
    .filter(pl => {
      if (sidebarFilter === 'Playlists') return true;
      if (sidebarFilter === 'Podcasts') return false;
      if (sidebarFilter === 'Albums') return false;
      return true;
    })
    .filter(pl => {
      if (!sidebarSearchQuery.trim()) return true;
      return pl.name.toLowerCase().includes(sidebarSearchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sidebarSort === 'alpha') return a.name.localeCompare(b.name);
      return 0;
    });

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

        {/* Boutons Créer & Importer droite - Style Capsule Spotify sans débordement */}
        <div className="flex items-center gap-2 justify-end shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-8 px-4.5 rounded-full bg-[#242424] hover:bg-[#2e2e2e] active:scale-95 text-white text-xs font-bold transition-all apple-press shadow-sm whitespace-nowrap shrink-0"
            title="Créer une nouvelle playlist"
          >
            <svg className="w-3.5 h-3.5 text-white stroke-[2.5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="leading-none">Playlist</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-8 px-4.5 rounded-full bg-[#242424] hover:bg-[#2e2e2e] active:scale-95 text-white text-xs font-bold transition-all apple-press shadow-sm whitespace-nowrap shrink-0"
            title="Importer une playlist Spotify, Apple Music ou Deezer"
          >
            <svg className="w-3.5 h-3.5 text-white stroke-[2.2] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="leading-none">Importer</span>
          </button>
          
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-md ml-1 select-none shrink-0">
            A
          </div>
        </div>
      </header>

      {/* 2. Corps de page */}
      <div className="flex-1 flex overflow-hidden p-2 gap-0 relative">
        
        {/* BARRE LATÉRALE STYLE SPOTIFY */}
        <aside
          style={{ width: `${sidebarWidth}px` }}
          className="shrink-0 bg-[#121212] rounded-xl flex flex-col overflow-hidden border border-white/[0.04] p-3 shadow-sm select-none"
        >
          {/* 1. En-tête Bibliothèque avec + et ⤢ */}
          <div className="flex items-center justify-between px-2 pt-1 pb-2.5">
            <div
              className="flex items-center gap-2.5 text-neutral-200 hover:text-white transition-colors cursor-pointer group"
              onClick={() => { setActiveTab('home'); setHasSearched(false); }}
            >
              <svg className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 22a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v18a1 1 0 0 1-1 1zM15.5 2.1a1 1 0 0 1 .5.9v18a1 1 0 0 1-2 0V3a1 1 0 0 1 1.5-.9zM7 2a1 1 0 0 1 1 1v18a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm14 0a1 1 0 0 1 1 1v18a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1z" />
              </svg>
              <span className="text-base font-bold text-white tracking-tight">Bibliothèque</span>
            </div>

            <div className="flex items-center gap-1">
              {/* Bouton + avec menu déroulant pour Créer / Importer */}
              <div className="relative">
                <button
                  onClick={() => setIsPlusMenuOpen(prev => !prev)}
                  className="w-8 h-8 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white flex items-center justify-center text-lg font-medium transition-colors apple-press"
                  title="Ajouter une playlist"
                >
                  +
                </button>

                {isPlusMenuOpen && (
                  <div className="absolute right-0 top-10 w-52 bg-[#282828] border border-white/10 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => { setIsPlusMenuOpen(false); setIsCreateModalOpen(true); }}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-neutral-200 hover:bg-white/10 hover:text-white flex items-center gap-2.5 transition-colors font-medium"
                    >
                      <span className="text-sm">🎵</span>
                      <span>Créer une playlist</span>
                    </button>
                    <button
                      onClick={() => { setIsPlusMenuOpen(false); setIsImportModalOpen(true); }}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-neutral-200 hover:bg-white/10 hover:text-white flex items-center gap-2.5 transition-colors font-medium"
                    >
                      <span className="text-sm">📥</span>
                      <span>Importer Spotify / Apple / Deezer</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bouton Agrandir / Réduire la barre */}
              <button
                onClick={() => setSidebarWidth(prev => prev > 300 ? 240 : 360)}
                className="w-8 h-8 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center text-xs transition-colors apple-press"
                title="Agrandir / réduire la barre"
              >
                ⤢
              </button>
            </div>
          </div>

          {/* 3. Ligne Recherche & Récents */}
          <div className="flex items-center justify-between px-2 pb-2 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5 flex-1 mr-2">
              <button
                onClick={() => setIsSidebarSearchOpen(prev => !prev)}
                className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                title="Rechercher dans la bibliothèque"
              >
                🔍
              </button>
              {isSidebarSearchOpen && (
                <input
                  type="text"
                  value={sidebarSearchQuery}
                  onChange={(e) => setSidebarSearchQuery(e.target.value)}
                  placeholder="Filtrer..."
                  autoFocus
                  className="w-full bg-[#242424] text-xs text-white px-2.5 py-1 rounded-lg border border-white/10 focus:outline-none placeholder:text-neutral-500"
                />
              )}
            </div>

            <button
              onClick={() => setSidebarSort(prev => prev === 'recent' ? 'alpha' : 'recent')}
              className="flex items-center gap-1.5 hover:text-white transition-colors text-xs font-medium"
              title="Trier"
            >
              <span>{sidebarSort === 'recent' ? 'Récents' : 'A-Z'}</span>
              <span className="text-sm">≡</span>
            </button>
          </div>

          {/* 4. Liste des Playlists avec Vraies Pochettes et Style Exact */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {/* Titres Likés */}
            <div
              onClick={() => setActiveTab('liked')}
              className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all cursor-pointer group select-none ${
                activeTab === 'liked'
                  ? 'bg-[#242424] text-white shadow-inner'
                  : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <PlaylistCover playlist={{ id: 'liked' }} size="md" />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate tracking-tight ${activeTab === 'liked' ? 'text-[#1ed760]' : 'text-white'}`}>
                  Titres likés
                </p>
                <p className="text-xs text-neutral-400 truncate mt-0.5 flex items-center gap-1">
                  <span className="text-emerald-400 text-[10px]">📌</span>
                  <span>Playlist • Antoine</span>
                </p>
              </div>
            </div>

            {/* Daily Mixes */}
            <div
              onClick={() => { setActiveTab('mixes'); setSelectedMix(dailyMixes[0] || null); }}
              className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all cursor-pointer group select-none ${
                activeTab === 'mixes'
                  ? 'bg-[#242424] text-white shadow-inner'
                  : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <PlaylistCover playlist={{ id: 'mixes' }} size="md" />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate tracking-tight ${activeTab === 'mixes' ? 'text-[#1ed760]' : 'text-white'}`}>
                  Daily Mixes
                </p>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  Playlist • Conçue pour Antoine
                </p>
              </div>
            </div>

            {/* Playlists Utilisateur */}
            {displayedSidebarPlaylists.map(pl => {
              const isSelected = activeTab === 'playlist' && selectedPlaylistId === pl.id;
              const isPlayingFromThis = currentTrack && pl.tracks?.some(t => t.id === currentTrack.id);

              return (
                <div
                  key={pl.id}
                  onContextMenu={(e) => handleContextMenu(e, pl)}
                  onClick={() => { setSelectedPlaylistId(pl.id); setActiveTab('playlist'); }}
                  className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all cursor-pointer group select-none ${
                    isSelected
                      ? 'bg-[#242424] text-white shadow-inner'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <PlaylistCover playlist={pl} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate tracking-tight ${
                      isPlayingFromThis ? 'text-[#1ed760]' : isSelected ? 'text-white' : 'text-neutral-200'
                    }`}>
                      {pl.name}
                    </p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      Playlist • Antoine
                    </p>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); setPlaylistToDelete(pl); }}
                    className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-400 text-xs transition-all shrink-0"
                    title="Supprimer la playlist"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* 5. Aperçu en cours de lecture en bas de la barre latérale comme Spotify */}
          {currentTrack && (
            <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center gap-2.5 px-1 animate-in fade-in duration-200">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-10 h-10 rounded-lg object-cover shrink-0 shadow border border-white/5"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate tracking-tight">{currentTrack.title}</p>
                <p className="text-[11px] text-neutral-400 truncate">{currentTrack.artist}</p>
              </div>
              <div className="w-4 h-4 rounded-full bg-[#1ed760] text-black flex items-center justify-center text-[10px] font-black shrink-0 shadow" title="En cours de lecture">
                ✓
              </div>
            </div>
          )}
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
                  <div className="w-16 h-16 bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center text-white text-xl shrink-0 shadow">
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
                    <PlaylistCover playlist={pl} size="sm" className="w-16 h-16 rounded-none" />
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

          {/* HERO HEADER TITRES LIKÉS AVEC DÉGRADÉ VIOLET-INDIGO STYLE SPOTIFY */}
          {activeTab === 'liked' && (
            <div className="relative mb-6 -mx-6 -mt-6 p-6 pb-6 bg-gradient-to-b from-[#450af5]/85 via-[#181818]/95 to-[#121212] border-b border-white/[0.06]">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pt-4">
                <PlaylistCover playlist={{ id: 'liked' }} size="lg" />
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <p className="text-xs uppercase font-extrabold text-neutral-300 tracking-wider">Playlist</p>
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight mt-1 mb-3 truncate">
                    Titres likés
                  </h1>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-neutral-300">
                    <span className="font-bold text-white">Antoine</span>
                    <span>•</span>
                    <span>{likedTracks.length} titres</span>
                    <span>•</span>
                    <span>~{Math.round((likedTracks.reduce((acc, t) => acc + (t.duration || 0), 0)) / 60)} min</span>
                  </div>
                </div>
              </div>

              {likedTracks.length > 0 && (
                <div className="flex items-center gap-4 mt-6">
                  <button
                    onClick={() => handlePlay(likedTracks[0], likedTracks)}
                    className="w-14 h-14 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all shadow-green-500/25"
                    title="Lire tous les titres likés"
                  >
                    <svg className="w-6 h-6 fill-black ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* HERO HEADER PLAYLIST AVEC DÉGRADÉ VIBRANT STYLE SPOTIFY */}
          {activeTab === 'playlist' && currentDisplayedPlaylist && (
            <div className="relative mb-6 -mx-6 -mt-6 p-6 pb-6 bg-gradient-to-b from-[#a33804]/90 via-[#181818]/95 to-[#121212] border-b border-white/[0.06]">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pt-4">
                <PlaylistCover playlist={currentDisplayedPlaylist} size="lg" />
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <p className="text-xs uppercase font-extrabold text-neutral-300 tracking-wider">Playlist publique</p>
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight mt-1 mb-3 truncate">
                    {currentDisplayedPlaylist.name}
                  </h1>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-neutral-300">
                    <span className="font-bold text-white">Antoine</span>
                    <span>•</span>
                    <span>{currentDisplayedPlaylist.tracks?.length || 0} titres</span>
                    <span>•</span>
                    <span>~{Math.round((currentDisplayedPlaylist.tracks?.reduce((acc, t) => acc + (t.duration || 0), 0) || 0) / 60)} min</span>
                  </div>
                </div>
              </div>

              {/* Action Bar Spotify : Grand bouton vert Play + Ajouter + Supprimer */}
              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={() => {
                    if (currentDisplayedPlaylist.tracks && currentDisplayedPlaylist.tracks.length > 0) {
                      handlePlay(currentDisplayedPlaylist.tracks[0], currentDisplayedPlaylist.tracks);
                    }
                  }}
                  className="w-14 h-14 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all shadow-green-500/25"
                  title="Lire la playlist"
                >
                  <svg className="w-6 h-6 fill-black ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>

                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 apple-press transition-all"
                  title="Ajouter ou importer des titres"
                >
                  <span className="text-sm font-black">+</span>
                  <span>Ajouter</span>
                </button>

                <button
                  onClick={() => setPlaylistToDelete(currentDisplayedPlaylist)}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-neutral-400 flex items-center justify-center transition-all apple-press ml-auto border border-white/10"
                  title="Supprimer la playlist"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
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
              Collez le lien de partage d'une playlist publique <span className="text-white font-medium">Spotify</span>, <span className="text-white font-medium">Apple Music</span> ou <span className="text-white font-medium">Deezer</span>.
            </p>

            <form onSubmit={handleImportSubmit} className="space-y-3">
              <input
                type="url"
                required
                placeholder="https://open.spotify.com/... ou https://music.apple.com/... ou https://deezer.com/..."
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
