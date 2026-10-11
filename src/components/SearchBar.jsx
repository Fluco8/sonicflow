import { useState, useRef } from 'react';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 400);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearch(query);
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && query) handleClear();
  };

  return (
    <div className="flex w-full justify-center px-4">
      <form
        onSubmit={handleSubmit}
        role="search"
        className="group relative w-full max-w-[480px]"
      >
        {/* Loupe */}
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2
                     text-neutral-400 transition-colors group-hover:text-white
                     group-focus-within:text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Que souhaitez-vous écouter ?"
          aria-label="Rechercher un titre"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full rounded-full border border-transparent bg-[#242424]
                     pl-12 pr-12 text-[15px] font-medium text-white
                     placeholder:font-medium placeholder:text-neutral-400
                     outline-none transition
                     hover:border-neutral-600 hover:bg-[#2a2a2a]
                     focus:border-white focus:bg-[#2a2a2a]"
        />

        {/* Bouton effacer */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Effacer la recherche"
            className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center
                       justify-center rounded-full text-neutral-400 transition
                       hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}
