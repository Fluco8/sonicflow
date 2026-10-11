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
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="relative group">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-white transition-colors"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Rechercher des artistes, titres ou albums"
          className="w-full pl-11 pr-10 py-3.5 bg-neutral-900/80 apple-glass-subtle text-white rounded-2xl 
                     placeholder-neutral-500 focus:outline-none focus:ring-1 
                     focus:ring-white/30 focus:bg-neutral-800/90 transition-all text-sm tracking-tight shadow-inner"
          autoFocus
        />

        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); onSearch(''); }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-neutral-700/60 hover:bg-neutral-600 text-neutral-300 flex items-center justify-center text-xs apple-press"
          >
            ✕
          </button>
        )}
      </div>
    </form>
  );
}
