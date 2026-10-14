import { useState, useRef } from 'react';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const debounceRef = useRef(null);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center w-full bg-[#1f1f1f] hover:bg-[#282828] focus-within:bg-[#282828] focus-within:ring-2 focus-within:ring-white rounded-full px-4 py-2.5 transition-all shadow-inner border border-white/[0.04]">
        
        {/* Loupe Spotify grise claire */}
        <div className="shrink-0 text-[#b3b3b3] mr-3 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Texte placeholder exact */}
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Que souhaitez-vous écouter ou regarder ?"
          className="flex-1 bg-transparent text-white placeholder-[#b3b3b3] text-sm focus:outline-none tracking-normal font-normal leading-none truncate"
        />

        {/* Bouton croix pour effacer si texte saisi */}
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); onSearch(''); }}
            className="shrink-0 ml-2 w-4 h-4 rounded-full bg-neutral-600 hover:bg-neutral-500 text-white flex items-center justify-center text-[10px] apple-press"
          >
            ✕
          </button>
        )}

      </div>
    </form>
  );
}
