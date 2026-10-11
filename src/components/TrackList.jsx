import { formatDuration } from '../services/piped';

export default function TrackList({ tracks, onPlay, currentTrack, isLoading }) {
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
    <div className="w-full max-w-3xl mx-auto mt-6">
      {tracks.map((track, index) => {
        const isActive = currentTrack?.id === track.id;
        return (
          <button
            key={track.id}
            onClick={() => onPlay(track)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md
                       transition-colors duration-150 text-left group
                       ${isActive
                         ? 'bg-neutral-700/60'
                         : 'hover:bg-neutral-800/80'}`}
          >
            {/* Index / playing indicator */}
            <span className="w-6 text-center text-sm text-neutral-400 shrink-0">
              {isActive ? (
                <span className="inline-flex gap-0.5 items-end h-3">
                  <span className="w-0.5 bg-green-500 animate-pulse" style={{height: '8px', animationDelay: '0ms'}} />
                  <span className="w-0.5 bg-green-500 animate-pulse" style={{height: '12px', animationDelay: '150ms'}} />
                  <span className="w-0.5 bg-green-500 animate-pulse" style={{height: '6px', animationDelay: '300ms'}} />
                </span>
              ) : (
                index + 1
              )}
            </span>

            {/* Thumbnail */}
            <img
              src={track.thumbnail}
              alt={track.title}
              className="w-10 h-10 rounded object-cover shrink-0 bg-neutral-700"
              loading="lazy"
            />

            {/* Title & Artist */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate
                           ${isActive ? 'text-green-500' : 'text-white'}`}>
                {track.title}
              </p>
              <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
            </div>

            {/* Duration */}
            <span className="text-xs text-neutral-400 shrink-0">
              {formatDuration(track.duration)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
