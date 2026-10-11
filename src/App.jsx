import { useState } from 'react';
import SearchBar from './components/SearchBar';
import TrackList from './components/TrackList';
import Player from './components/Player';
import { searchTracks } from './services/piped';

function HomeIcon() {
  return (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.5 3.2a1 1 0 0 0-1 0L3 8.1a1 1 0 0 0-.5.9V20a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-5h4v5a1 1 0 0 0 1 1h5.5a1 1 0 0 0 1-1V9a1 1 0 0 0-.5-.9l-8.5-4.9z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchKey, setSearchKey] = useState(0); // remonte la SearchBar pour vider le champ

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

  const goHome = () => {
    setTracks([]);
    setHasSearched(false);
    setSearchKey((k) => k + 1);
  };

  return (
    <div className="flex h-full flex-col bg-black">
      <div className="flex min-h-0 flex-1 gap-2 p-2">
        {/* Sidebar */}
        <aside className="hidden w-[280px] shrink-0 flex-col gap-2 md:flex">
          <nav className="rounded-lg bg-[#121212] px-3 py-4">
            <button
              onClick={goHome}
              className="mb-4 flex items-center gap-3 px-3 py-1"
              aria-label="SonicFlow, retour à l'accueil"
            >
              <img src="/favicon.svg" alt="" className="h-8 w-8" />
              <span className="text-xl font-extrabold tracking-tight">SonicFlow</span>
            </button>

            <button
              onClick={goHome}
              className="flex w-full items-center gap-4 rounded-md px-3 py-2.5 font-bold text-white
                         transition-colors hover:bg-white/5"
            >
              <HomeIcon />
              Accueil
            </button>
            <button
              onClick={() => document.querySelector('input[type="text"]')?.focus()}
              className="flex w-full items-center gap-4 rounded-md px-3 py-2.5 font-bold text-neutral-400
                         transition-colors hover:text-white"
            >
              <SearchIcon />
              Rechercher
            </button>
          </nav>

          <div className="flex-1 rounded-lg bg-[#121212] p-4">
            <h2 className="px-2 py-1 font-bold text-neutral-400">Votre bibliothèque</h2>
            <div className="mt-4 rounded-lg bg-[#242424] p-4">
              <p className="font-bold">Vos titres favoris, bientôt ici</p>
              <p className="mt-2 text-sm text-neutral-400">
                Recherchez un morceau et lancez la lecture pour commencer.
              </p>
            </div>
          </div>
        </aside>

        {/* Panneau principal */}
        <main
          className={`relative min-w-0 flex-1 overflow-y-auto rounded-lg
                      bg-gradient-to-b from-[#1f1f1f] via-[#121212] to-[#121212]
                      ${currentTrack ? 'pb-24' : 'pb-8'}`}
        >
          {/* Barre du haut, collée en haut au scroll */}
          <div className="sticky top-0 z-10 bg-[#1f1f1f]/80 px-6 py-4 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-center gap-2 md:hidden">
              <img src="/favicon.svg" alt="" className="h-7 w-7" />
              <span className="text-lg font-extrabold tracking-tight">SonicFlow</span>
            </div>
            <SearchBar key={searchKey} onSearch={handleSearch} />
          </div>

          <div className="px-6 pt-4">
            {/* Résultats */}
            <TrackList
              tracks={tracks}
              onPlay={handlePlay}
              currentTrack={currentTrack}
              isLoading={isLoading}
            />

            {/* Aucun résultat */}
            {!isLoading && hasSearched && tracks.length === 0 && (
              <div className="mt-16 text-center">
                <p className="text-2xl font-bold">Aucun résultat trouvé</p>
                <p className="mt-2 text-neutral-400">
                  Vérifiez l'orthographe ou essayez un autre titre ou artiste.
                </p>
              </div>
            )}

            {/* Accueil */}
            {!hasSearched && (
              <div className="mt-24 text-center">
                <p className="text-3xl font-extrabold tracking-tight">
                  Quelle musique voulez-vous écouter ?
                </p>
                <p className="mt-3 text-neutral-400">
                  Saisissez le nom d'un artiste ou d'un morceau dans la barre de recherche.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Lecteur */}
      <Player track={currentTrack} />
    </div>
  );
}
