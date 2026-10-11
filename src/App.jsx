import { useState } from 'react';
import SearchBar from './components/SearchBar';
import TrackList from './components/TrackList';
import Player from './components/Player';
import { searchTracks } from './services/piped';

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  const handlePlay = (track) => {
    setCurrentTrack(track);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-neutral-900 to-black">
      {/* Main content */}
      <div className={`flex-1 overflow-y-auto ${currentTrack ? 'pb-24' : 'pb-8'}`}>
        <div className="px-6 pt-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src="/favicon.svg" alt="SonicFlow" className="w-10 h-10" />
            <h1 className="text-2xl font-bold tracking-tight">SonicFlow</h1>
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
              <p className="text-neutral-400 text-lg">Recherche un titre pour commencer</p>
              <p className="text-neutral-600 text-sm mt-2">Tape le nom d'un artiste ou d'une chanson</p>
            </div>
          )}
        </div>
      </div>

      {/* Player */}
      <Player track={currentTrack} />
    </div>
  );
}
