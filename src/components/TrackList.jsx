import { formatDuration } from '../services/piped';

export default function TrackList({ tracks, onPlay, currentTrack, isLoading, onToggleLike, likedTrackIds = [], onAddToPlaylist }) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (tracks.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-6">
      {tracks.map((track, index) => {
        const isActive = currentTrack?.id === track.id;
        const isLiked = likedTrackIds.includes(track.id);

        return (
          <div
            key={track.id}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                       transition-colors duration-150 group text-left
                       ${isActive ? 'bg-neutral-800/90' : 'hover:bg-neutral-800/50'}`}
          >
            {/* Index / Animation */}
            <span
              onClick={() => onPlay(track)}
              className="w-6 text-center text-sm text-neutral-400 shrink-0 cursor-pointer"
            >
              {isActive ? (
                <span className="inline-flex gap-0.5 items-end h-3">
                  <span className="w-0.5 bg-green-500 animate-pulse" style={{ height: '8px', animationDelay: '0ms' }} />
                  <span className="w-0.5 bg-green-500 animate-pulse" style={{ height: '12px', animationDelay: '150ms' }} />
                  <span className="w-0.5 bg-green-500 animate-pulse" style={{ height: '6px', animationDelay: '300ms' }} />
                </span>
              ) : (
                <span className="group-hover:hidden">{index + 1}</span>
              )}
              {!isActive && (
                <span className="hidden group-hover:inline-block text-white text-xs">▶</span>
              )}
            </span>

            {/* Thumbnail */}
            <img
              onClick={() => onPlay(track)}
              src={track.thumbnail}
              alt={track.title}
              className="w-11 h-11 rounded-md object-cover shrink-0 bg-neutral-700 cursor-pointer shadow"
              loading="lazy"
            />

            {/* Title & Artist */}
            <div
              onClick={() => onPlay(track)}
              className="flex-1 min-w-0 cursor-pointer"
            >
              <p className={`text-sm font-semibold truncate ${isActive ? 'text-green-500' : 'text-white'}`}>
                {track.title}
              </p>
              <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
            </div>

            {/* Bouton Like */}
            <button
              onClick={() => onToggleLike && onToggleLike(track)}
              className="p-2 text-neutral-400 hover:text-green-500 transition-colors"
              title={isLiked ? "Retirer des favoris" : "Liker"}
            >
              <svg
                className={`w-5 h-5 ${isLiked ? 'text-green-500 fill-green-500' : 'fill-none stroke-current opacity-0 group-hover:opacity-100 transition-opacity'}`}
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>

            {/* Bouton Ajouter à une Playlist */}
            {onAddToPlaylist && (
              <button
                onClick={() => onAddToPlaylist(track)}
                className="p-2 text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Ajouter à une playlist"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}

            {/* Duration */}
            <span
              onClick={() => onPlay(track)}
              className="text-xs text-neutral-400 shrink-0 w-12 text-right cursor-pointer"
            >
              {formatDuration(track.duration)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
