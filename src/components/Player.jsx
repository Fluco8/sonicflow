import { useState, useRef, useEffect, useCallback } from 'react';
import { getStreamUrl, formatDuration } from '../services/piped';

export default function Player({ track, onNext, onPrevious, nextTrack, onToggleLike, isLiked }) {
  const audioRef = useRef(new Audio());
  const nextAudioRef = useRef(new Audio()); // Pré-buffering de la piste suivante
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Pré-chargement agressif du morceau SUIVANT dès qu'on le connaît !
  useEffect(() => {
    if (nextTrack) {
      getStreamUrl(nextTrack.searchKey || `${nextTrack.title} ${nextTrack.artist}`).then(url => {
        if (url) {
          nextAudioRef.current.src = url;
          nextAudioRef.current.preload = 'auto'; // Force le navigateur à charger les premières secondes en RAM
        }
      }).catch(() => {});
    }
  }, [nextTrack]);

  // 2. Chargement du morceau actuel
  const loadTrack = useCallback(async (trackData) => {
    const audio = audioRef.current;
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(trackData.duration || 0);

    audio.pause();

    try {
      // Si la piste suivante était déjà pré-chargée dans nextAudioRef, on échange immédiatement sans délai !
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
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 px-4 py-3 z-50 shadow-2xl">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
        {/* Track info & Like */}
        <div className="flex items-center gap-3 w-1/4 min-w-0">
          {track.thumbnail && (
            <img src={track.thumbnail} alt="" className="w-12 h-12 rounded shadow object-cover shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{track.title}</p>
            <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
          </div>
          {/* Bouton Like */}
          <button
            onClick={() => onToggleLike && onToggleLike(track)}
            className="text-neutral-400 hover:text-green-500 transition-colors p-1"
            title={isLiked ? "Retirer des favoris" : "Ajouter aux Titres likés"}
          >
            <svg
              className={`w-5 h-5 ${isLiked ? 'text-green-500 fill-green-500' : 'fill-none stroke-current'}`}
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-1 max-w-xl">
          <div className="flex items-center gap-4">
            {/* Previous */}
            <button
              onClick={onPrevious}
              className="text-neutral-400 hover:text-white transition-colors"
              title="Précédent"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              disabled={loading}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
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
              className="text-neutral-400 hover:text-white transition-colors"
              title="Suivant (Style similaire)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full flex items-center gap-2">
            <span className="text-xs text-neutral-400 w-10 text-right">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-green-500"
              style={{
                background: duration
                  ? `linear-gradient(to right, #1DB954 ${(currentTime / duration) * 100}%, #4d4d4d ${(currentTime / duration) * 100}%)`
                  : '#4d4d4d'
              }}
            />
            <span className="text-xs text-neutral-400 w-10">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Volume */}
        <div className="w-1/4 flex items-center justify-end gap-2">
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
            className="w-24 accent-green-500"
            style={{
              background: `linear-gradient(to right, #1DB954 ${volume * 100}%, #4d4d4d ${volume * 100}%)`
            }}
          />
        </div>
      </div>

      {error && (
        <p className="text-center text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}
