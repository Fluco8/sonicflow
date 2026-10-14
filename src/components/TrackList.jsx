import { useState } from 'react';
import { formatDuration } from '../services/piped';

export default function TrackList({ 
  tracks, 
  onPlay, 
  currentTrack, 
  isLoading, 
  onToggleLike, 
  likedTrackIds = [], 
  onAddToPlaylist 
}) {
  const [imageErrors, setImageErrors] = useState({});

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#1ed760] rounded-full animate-spin" />
      </div>
    );
  }

  if (tracks.length === 0) {
    return null;
  }

  const handleImgError = (trackId) => {
    setImageErrors(prev => ({ ...prev, [trackId]: true }));
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-1">
      {/* Table Header like Spotify */}
      <div className="grid grid-cols-[16px_1fr_auto] md:grid-cols-[20px_1fr_120px] items-center gap-4 px-4 py-2 border-b border-white/10 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
        <span className="text-center">#</span>
        <span>Titre</span>
        <div className="flex items-center justify-end pr-3">
          <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {tracks.map((track, index) => {
        const isActive = currentTrack?.id === track.id;
        const isLiked = likedTrackIds.includes(track.id);
        const hasImgError = imageErrors[track.id] || !track.thumbnail || track.thumbnail.includes('d41d8cd98f00b204e9800998ecf8427e');

        return (
          <div
            key={track.id || index}
            onClick={() => onPlay(track)}
            className={`w-full grid grid-cols-[16px_1fr_auto] md:grid-cols-[20px_1fr_120px] items-center gap-4 px-3.5 py-2 rounded-xl
                       transition-all duration-150 group text-left cursor-pointer select-none
                       ${isActive 
                         ? 'bg-white/10 text-white' 
                         : 'hover:bg-white/[0.06] active:scale-[0.995]'}`}
          >
            {/* Index / Visualizer / Play Icon */}
            <div className="text-center text-xs text-neutral-400 shrink-0 font-medium">
              {isActive ? (
                <span className="inline-flex gap-0.5 items-end h-3">
                  <span className="w-0.5 bg-[#1ed760] animate-pulse" style={{ height: '8px', animationDelay: '0ms' }} />
                  <span className="w-0.5 bg-[#1ed760] animate-pulse" style={{ height: '14px', animationDelay: '150ms' }} />
                  <span className="w-0.5 bg-[#1ed760] animate-pulse" style={{ height: '6px', animationDelay: '300ms' }} />
                </span>
              ) : (
                <>
                  <span className="group-hover:hidden">{index + 1}</span>
                  <span className="hidden group-hover:inline-block text-white text-[11px] font-bold">▶</span>
                </>
              )}
            </div>

            {/* Artwork + Title & Artist */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow-md bg-neutral-800">
                {!hasImgError ? (
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    onError={() => handleImgError(track.id)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-700 flex items-center justify-center text-neutral-400 text-xs">
                    🎵
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate tracking-tight ${isActive ? 'text-[#1ed760]' : 'text-white'}`}>
                  {track.title}
                </p>
                <p className="text-xs text-neutral-400 truncate mt-0.5 flex items-center gap-1.5">
                  <span className="hover:underline">{track.artist}</span>
                </p>
              </div>
            </div>

            {/* Actions (Like, Add, Duration) */}
            <div className="flex items-center justify-end gap-2 pr-1">
              {/* Heart Button */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleLike && onToggleLike(track); }}
                className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors apple-press"
                title={isLiked ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <svg
                  className={`w-4 h-4 transition-all duration-150 ${isLiked ? 'text-red-500 fill-red-500 scale-110' : 'fill-none stroke-current opacity-0 group-hover:opacity-100'}`}
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>

              {/* Add to Playlist Button */}
              {onAddToPlaylist && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track); }}
                  className="p-1.5 text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all apple-press"
                  title="Ajouter à une playlist"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}

              {/* Duration */}
              <span className="text-xs text-neutral-400 font-medium w-10 text-right">
                {formatDuration(track.duration)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
