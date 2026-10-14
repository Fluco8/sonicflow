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
      <div className="relative flex items-center w-full">
        {/* Loupe bien espacée à gauche */}
        <div className="absolute left-4 pointer-events-none text-neutral-400 flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Input pilule épuré avec padding gauche généreux (pl-12) pour éviter TOUT chevauchement */}
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Que souhaitez-vous écouter ?"
          className="w-full pl-12 pr-10 py-3 bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white rounded-full 
                     placeholder:text-neutral-400 placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-white/40 
                     transition-all text-[13px] tracking-normal shadow-inner leading-normal"
        />

        {/* Bouton croix pour effacer */}
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); onSearch(''); }}
            className="absolute right-3.5 w-4 h-4 rounded-full bg-neutral-600 hover:bg-neutral-500 text-white flex items-center justify-center text-[10px] apple-press"
          >
            ✕
          </button>
        )}
      </div>
    </form>
  );
}
