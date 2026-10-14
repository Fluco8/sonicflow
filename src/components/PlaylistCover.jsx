import { useState } from 'react';

export default function PlaylistCover({ playlist, size = 'md', className = '' }) {
  const [imageError, setImageError] = useState(false);

  const sizeMap = {
    sm: 'w-10 h-10 rounded-lg text-sm',
    md: 'w-12 h-12 rounded-lg text-base',
    lg: 'w-48 h-48 md:w-56 md:h-56 rounded-2xl text-4xl shadow-2xl',
  };

  const containerClasses = `${sizeMap[size] || sizeMap.md} shrink-0 overflow-hidden relative select-none ${className}`;

  if (!playlist) {
    return (
      <div className={`${containerClasses} bg-neutral-800 flex items-center justify-center text-neutral-500`}>
        🎵
      </div>
    );
  }

  // Cas spécial : Titres likés
  if (playlist.id === 'liked') {
    return (
      <div className={`${containerClasses} bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center text-white shadow-md`}>
        <span className={size === 'lg' ? 'text-6xl' : 'text-xl'}>♥</span>
      </div>
    );
  }

  // Cas spécial : Daily Mixes
  if (playlist.id === 'mixes') {
    return (
      <div className={`${containerClasses} bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md`}>
        <span className={size === 'lg' ? 'text-6xl' : 'text-xl'}>⚡</span>
      </div>
    );
  }

  // Image de couverture principale directe
  const hasCover = playlist.cover && !playlist.cover.includes('d41d8cd98f00b204e9800998ecf8427e') && !imageError;
  if (hasCover) {
    return (
      <img
        src={playlist.cover}
        alt={playlist.name}
        onError={() => setImageError(true)}
        className={`${containerClasses} object-cover shadow-md`}
        loading="lazy"
      />
    );
  }

  // Filtrer les pistes avec des vignettes valides
  const validTracks = (playlist.tracks || []).filter(
    t => t.thumbnail && !t.thumbnail.includes('d41d8cd98f00b204e9800998ecf8427e')
  );

  // Mosaïque 4 images (2x2) comme Spotify
  if (validTracks.length >= 4) {
    return (
      <div className={`${containerClasses} grid grid-cols-2 grid-rows-2 bg-neutral-900 border border-white/5 shadow-md`}>
        {validTracks.slice(0, 4).map((t, idx) => (
          <img
            key={idx}
            src={t.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ))}
      </div>
    );
  }

  // Si 1 à 3 pistes valides
  if (validTracks.length > 0) {
    return (
      <img
        src={validTracks[0].thumbnail}
        alt={playlist.name}
        className={`${containerClasses} object-cover shadow-md`}
        loading="lazy"
      />
    );
  }

  // Couverture par défaut avec dégradé sobre
  return (
    <div className={`${containerClasses} bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center text-neutral-400 border border-white/5 shadow-md`}>
      <svg className={size === 'lg' ? 'w-20 h-20 text-neutral-500' : 'w-6 h-6 text-neutral-500'} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    </div>
  );
}
