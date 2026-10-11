import { useState, useRef, useEffect, useCallback } from 'react';
import { getStreamUrl, formatDuration } from '../services/piped';

export default function Player({ track, onNext, onPrevious, nextTrack, onToggleLike, isLiked }) {
  const audioRef = useRef(new Audio());
  const nextAudioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (nextTrack) {
      getStreamUrl(nextTrack.searchKey || `${nextTrack.title} ${nextTrack.artist}`).then(url => {
        if (url) {
          nextAudioRef.current.src = url;
          nextAudioRef.current.preload = 'auto';
        }
      }).catch(() => {});
    }
  }, [nextTrack]);

  const loadTrack = useCallback(async (trackData) => {
    const audio = audioRef.current;
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(trackData.duration || 0);

    audio.pause();

    try {
      if (nextAudioRef.current.src && nextAudioRef.current.src.length > 10 && trackData.id === nextTrack?.id) {
        audio.src = nextAudioRef.current.src;
      } else {
        const streamUrl = await getStreamUrl(trackData.searchKey || `${trackData.title} ${trackData.artist}`);
        audio.src = streamUrl;
      }

      audio.volume = volume;
      await audio.play();
      setIsPlaying(true);
    } catch (e) {
      console.error('Failed to load track:', e);
      setError('Impossible de lire ce titre.');
    } finally {
      setLoading(false);
    }
  }, [volume, nextTrack]);

  useEffect(() => {
    if (track) {
      loadTrack(track);
    }
    return () => {
      audioRef.current.pause();
    };
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      if (onNext) onNext();
    };
    const onError = () => {
      if (audio.src) setError('Erreur de lecture');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [onNext]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    audioRef.current.volume = v;
  };

  if (!track) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto z-50">
      {/* Floating Island / Apple Glass Material */}
      <div className="apple-glass rounded-3xl p-3.5 shadow-2xl border border-white/10 flex items-center justify-between gap-4">
        {/* Track info & Artwork Squircle */}
        <div className="flex items-center gap-3 w-1/4 min-w-0">
          {track.thumbnail && (
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md border border-white/10">
              <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate tracking-tight">{track.title}</p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
          </div>

          <button
            onClick={() => onToggleLike && onToggleLike(track)}
            className="p-1.5 text-neutral-400 hover:text-red-500 apple-press"
            title={isLiked ? "Retirer des favoris" : "Liker"}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isLiked ? 'text-red-500 fill-red-500 scale-110' : 'fill-none stroke-current'}`}
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Center Controls & Scrubber */}
        <div className="flex-1 flex flex-col items-center gap-1.5 max-w-lg">
          <div className="flex items-center gap-6">
            {/* Previous */}
            <button
              onClick={onPrevious}
              className="text-neutral-400 hover:text-white apple-press transition-colors"
              title="Précédent"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* Play/Pause Apple Glass Button */}
            <button
              onClick={togglePlay}
              disabled={loading}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black apple-press shadow-md disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="5" width="3.5" height="14" rx="1" />
                  <rect x="14.5" y="5" width="3.5" height="14" rx="1" />
                </svg>
              ) : (
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={onNext}
              className="text-neutral-400 hover:text-white apple-press transition-colors"
              title="Suivant"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          {/* Time Scrubber */}
          <div className="w-full flex items-center gap-2.5">
            <span className="text-[11px] font-mono text-neutral-400 w-9 text-right tabular-nums">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1"
              style={{
                background: duration
                  ? `linear-gradient(to right, #ffffff ${(currentTime / duration) * 100}%, rgba(255,255,255,0.15) ${(currentTime / duration) * 100}%)`
                  : 'rgba(255,255,255,0.15)'
              }}
            />
            <span className="text-[11px] font-mono text-neutral-400 w-9 tabular-nums">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Volume Scrubber */}
        <div className="w-1/4 flex items-center justify-end gap-2.5">
          <svg className="w-4 h-4 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolume}
            className="w-20"
            style={{
              background: `linear-gradient(to right, #ffffff ${volume * 100}%, rgba(255,255,255,0.15) ${volume * 100}%)`
            }}
          />
        </div>
      </div>

      {error && (
        <p className="text-center text-xs text-red-400 mt-2 bg-neutral-900/80 backdrop-blur py-1 px-3 rounded-full border border-red-500/20 max-w-xs mx-auto">{error}</p>
      )}
    </div>
  );
}
