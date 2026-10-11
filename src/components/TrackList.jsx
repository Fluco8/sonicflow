import { formatDuration } from '../services/piped';

export default function TrackList({ tracks, onPlay, currentTrack, isLoading, onToggleLike, likedTrackIds = [], onAddToPlaylist }) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (tracks.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 space-y-1">
      {tracks.map((track, index) => {
        const isActive = currentTrack?.id === track.id;
        const isLiked = likedTrackIds.includes(track.id);

        return (
          <div
            key={track.id}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl
                       transition-all duration-200 group text-left cursor-pointer
                       ${isActive 
                         ? 'apple-glass-card border border-white/10 shadow-lg' 
                         : 'hover:bg-white/[0.04] active:scale-[0.99]'}`}
          >
            {/* Index / Visualizer */}
            <span
              onClick={() => onPlay(track)}
              className="w-5 text-center text-xs text-neutral-500 shrink-0 font-medium"
            >
              {isActive ? (
                <span className="inline-flex gap-0.5 items-end h-3">
                  <span className="w-0.5 bg-white animate-pulse" style={{ height: '8px', animationDelay: '0ms' }} />
                  <span className="w-0.5 bg-white animate-pulse" style={{ height: '12px', animationDelay: '150ms' }} />
                  <span className="w-0.5 bg-white animate-pulse" style={{ height: '6px', animationDelay: '300ms' }} />
                </span>
              ) : (
                <span className="group-hover:hidden">{index + 1}</span>
              )}
              {!isActive && (
                <span className="hidden group-hover:inline-block text-white text-[10px]">▶</span>
              )}
            </span>

            {/* Artwork Squircle */}
            <div
              onClick={() => onPlay(track)}
              className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 shadow-md bg-neutral-800"
            >
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>

            {/* Song Meta */}
            <div
              onClick={() => onPlay(track)}
              className="flex-1 min-w-0"
            >
              <p className={`text-sm font-semibold truncate tracking-tight ${isActive ? 'text-white' : 'text-neutral-200'}`}>
                {track.title}
              </p>
              <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
            </div>

            {/* Heart Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLike && onToggleLike(track); }}
              className="p-2 text-neutral-400 hover:text-red-500 transition-colors apple-press"
              title={isLiked ? "Retirer des favoris" : "Liker"}
            >
              <svg
                className={`w-4 h-4 transition-all duration-200 ${isLiked ? 'text-red-500 fill-red-500 scale-110' : 'fill-none stroke-current opacity-0 group-hover:opacity-100'}`}
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
                className="p-2 text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all apple-press"
                title="Ajouter à une playlist"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}

            {/* Duration */}
            <span
              onClick={() => onPlay(track)}
              className="text-xs text-neutral-500 shrink-0 w-12 text-right font-medium"
            >
              {formatDuration(track.duration)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
