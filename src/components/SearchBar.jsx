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
      <div className="relative flex items-center">
        {/* Loupe de recherche */}
        <div className="absolute left-3.5 pointer-events-none text-neutral-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Input pilule sombre fidèle à la capture */}
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Que souhaitez-vous écouter ?"
          className="w-full pl-10 pr-10 py-2.5 bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white rounded-full 
                     placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-white/40 
                     transition-all text-xs tracking-tight shadow-inner"
        />

        {/* Bouton effacer */}
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); onSearch(''); }}
            className="absolute right-3 w-4 h-4 rounded-full bg-neutral-600 hover:bg-neutral-500 text-white flex items-center justify-center text-[10px] apple-press"
          >
            ✕
          </button>
        )}
      </div>
    </form>
  );
}
