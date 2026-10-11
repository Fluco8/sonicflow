import { useState, useRef, useEffect, useCallback } from 'react';
import { getStreamUrl, formatDuration } from '../services/piped';

export default function Player({ track }) {
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTrack = useCallback(async (trackData) => {
    const audio = audioRef.current;
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(trackData.duration || 0);

    try {
      const streamUrl = await getStreamUrl(trackData.searchKey || `${trackData.title} ${trackData.artist}`);
      audio.src = streamUrl;
      audio.volume = volume;
      await audio.play();
      setIsPlaying(true);
    } catch (e) {
      console.error('Failed to load track:', e);
      setError('Impossible de lire ce titre.');
    } finally {
      setLoading(false);
    }
  }, [volume]);

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
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      if (audio.src) setError('Erreur de lecture audio');
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
  }, []);

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
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 px-4 py-3 z-50">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
        {/* Track info */}
        <div className="flex items-center gap-3 w-1/4 min-w-0">
          {track.thumbnail && (
            <img src={track.thumbnail} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{track.title}</p>
            <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-1 max-w-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform disabled:opacity-50"
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
              className="flex-1"
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
            className="w-24"
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
