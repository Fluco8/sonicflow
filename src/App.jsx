import { useState, useRef } from 'react';
import SearchBar from './components/SearchBar';
import TrackList from './components/TrackList';
import Player from './components/Player';
import { searchTracks, getRecommendations } from './services/piped';

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // File d'attente intelligente
  const queueRef = useRef([]);
  const historyRef = useRef([]);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setTracks([]);
      setHasSearched(false);
      return;
    }
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

  const handlePlay = async (track) => {
    if (currentTrack) {
      historyRef.current.push(currentTrack);
    }
    setCurrentTrack(track);

    // Préparer automatiquement la file d'attente (titres de la recherche ou similaires)
    const currentIndex = tracks.findIndex(t => t.id === track.id);
    if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
      // S'il reste des morceaux dans la liste de recherche, on les met en queue
      queueRef.current = tracks.slice(currentIndex + 1);
    } else {
      // Sinon on va chercher des recommandations du même style !
      fetchMoreRecommendations(track);
    }
  };

  const fetchMoreRecommendations = async (track) => {
    try {
      const recs = await getRecommendations(track);
      if (recs && recs.length > 0) {
        queueRef.current = recs;
      }
    } catch (e) {
      console.error('Failed to get recommendations', e);
    }
  };

  const handleNext = async () => {
    if (queueRef.current.length > 0) {
      const nextTrack = queueRef.current.shift();
      if (currentTrack) historyRef.current.push(currentTrack);
      setCurrentTrack(nextTrack);

      // Si la file d'attente commence à être vide, on recharge des morceaux du même style
      if (queueRef.current.length <= 1) {
        fetchMoreRecommendations(nextTrack);
      }
    } else if (currentTrack) {
      // Chercher des morceaux du même genre
      const recs = await getRecommendations(currentTrack);
      if (recs && recs.length > 0) {
        const nextTrack = recs[0];
        queueRef.current = recs.slice(1);
        historyRef.current.push(currentTrack);
        setCurrentTrack(nextTrack);
      }
    }
  };

  const handlePrevious = () => {
    if (historyRef.current.length > 0) {
      const prevTrack = historyRef.current.pop();
      if (currentTrack) queueRef.current.unshift(currentTrack);
      setCurrentTrack(prevTrack);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-neutral-900 via-neutral-950 to-black select-none">
      {/* Main content */}
      <div className={`flex-1 overflow-y-auto ${currentTrack ? 'pb-28' : 'pb-8'}`}>
        <div className="px-6 pt-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src="/favicon.svg" alt="SonicFlow" className="w-10 h-10 drop-shadow-md" />
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              SonicFlow <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-medium">Auto-Radio</span>
            </h1>
          </div>

          {/* Search */}
          <SearchBar onSearch={handleSearch} />

          {/* Results */}
          <TrackList
            tracks={tracks}
            onPlay={handlePlay}
            currentTrack={currentTrack}
            isLoading={isLoading}
          />

          {/* Empty state */}
          {!isLoading && hasSearched && tracks.length === 0 && (
            <p className="text-center text-neutral-500 mt-12">
              Aucun résultat trouvé. Essaie un autre titre.
            </p>
          )}

          {/* Welcome state */}
          {!hasSearched && (
            <div className="text-center mt-20">
              <p className="text-neutral-400 text-lg">Recherche un titre pour commencer la session</p>
              <p className="text-neutral-600 text-sm mt-2">Les titres du même genre s'enchaîneront automatiquement sans coupure</p>
            </div>
          )}
        </div>
      </div>

      {/* Player avec Autoplay et Next/Prev */}
      <Player
        track={currentTrack}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    </div>
  );
}
