import { useState, useRef, useEffect, useCallback } from 'react';
import { getStreamUrl, formatDuration } from '../services/piped';

export default function Player({ track, onNext, onPrevious, nextTrack, onToggleLike, isLiked }) {
  const audioRef = useRef(new Audio());
  const nextAudioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Volume sauvegardé dans le navigateur, valeur par défaut douce à 35%
  const [sliderVolume, setSliderVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('sf_player_volume');
      return saved ? parseFloat(saved) : 0.35;
    } catch {
      return 0.35;
    }
  });

  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Courbe logarithmique humaine : un slider à 0.5 donne en réalité 0.25 (0.5²),
  // ce qui offre une finesse chirurgicale dans les bas volumes sans agresser les oreilles
  const getPerceivedVolume = (linearVal) => {
    return Math.pow(Math.max(0, Math.min(1, linearVal)), 2);
  };

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

      // Applique le volume avec la courbe logarithmique
      audio.volume = isMuted ? 0 : getPerceivedVolume(sliderVolume);
      await audio.play();
      setIsPlaying(true);
    } catch (e) {
      console.error('Failed to load track:', e);
      setError('Impossible de lire ce titre.');
    } finally {
      setLoading(false);
    }
  }, [sliderVolume, isMuted, nextTrack]);

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

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setSliderVolume(val);
    if (isMuted && val > 0) setIsMuted(false);

    const actualVol = getPerceivedVolume(val);
    audioRef.current.volume = actualVol;

    try {
      localStorage.setItem('sf_player_volume', val.toString());
    } catch {}
  };

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      audioRef.current.volume = getPerceivedVolume(sliderVolume);
    } else {
      setIsMuted(true);
      audioRef.current.volume = 0;
    }
  }, [isMuted, sliderVolume]);

  // Raccourcis clavier globaux intelligents (actifs uniquement hors saisie texte)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ne pas déclencher si l'utilisateur est dans un champ de recherche ou modale
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (
        tag === 'input' || 
        tag === 'textarea' || 
        tag === 'select' || 
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (audioRef.current) {
            const nextT = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 5);
            audioRef.current.currentTime = nextT;
            setCurrentTime(nextT);
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (audioRef.current) {
            const prevT = Math.max(0, audioRef.current.currentTime - 5);
            audioRef.current.currentTime = prevT;
            setCurrentTime(prevT);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSliderVolume(prev => {
            const nextV = Math.min(1, Math.round((prev + 0.05) * 100) / 100);
            if (isMuted) setIsMuted(false);
            audioRef.current.volume = getPerceivedVolume(nextV);
            try { localStorage.setItem('sf_player_volume', nextV.toString()); } catch {}
            return nextV;
          });
          break;

        case 'ArrowDown':
          e.preventDefault();
          setSliderVolume(prev => {
            const nextV = Math.max(0, Math.round((prev - 0.05) * 100) / 100);
            audioRef.current.volume = getPerceivedVolume(nextV);
            try { localStorage.setItem('sf_player_volume', nextV.toString()); } catch {}
            return nextV;
          });
          break;

        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;

        case 'KeyL':
          e.preventDefault();
          if (track && onToggleLike) {
            onToggleLike(track);
          }
          break;

        case 'KeyN':
        case 'KeyJ':
          e.preventDefault();
          if (onNext) onNext();
          break;

        case 'KeyP':
        case 'KeyK':
          e.preventDefault();
          if (onPrevious) onPrevious();
          break;

        case 'Slash':
          if (e.shiftKey) { // '?'
            e.preventDefault();
            setShowShortcutsModal(prev => !prev);
          }
          break;

        case 'Escape':
          if (showShortcutsModal) {
            e.preventDefault();
            setShowShortcutsModal(false);
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, onNext, onPrevious, onToggleLike, track, isMuted, showShortcutsModal]);

  if (!track) return null;

  return (
    <div className="fixed bottom-[4.5rem] md:bottom-3 inset-x-0 z-50 flex flex-col items-center pointer-events-none px-2 sm:px-4">
      {/* Floating Island Player centré en bas */}
      <div className="relative pointer-events-auto w-full max-w-4xl bg-[#121212]/95 backdrop-blur-2xl rounded-xl md:rounded-2xl p-2 md:p-3 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center justify-between gap-2 md:gap-4 overflow-hidden">
        
        {/* Barre de progression discrète sur mobile */}
        {duration > 0 && (
          <div className="md:hidden absolute bottom-0 inset-x-0 h-[2px] bg-white/10">
            <div 
              className="h-full bg-white transition-all duration-150" 
              style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }} 
            />
          </div>
        )}

        {/* Track info & Artwork à gauche */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 md:w-1/4 min-w-0">
          {track.thumbnail && (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden shrink-0 shadow bg-neutral-800">
              <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate tracking-tight">{track.title}</p>
            <p className="text-[11px] text-neutral-400 truncate mt-0.5">{track.artist}</p>
          </div>

          <button
            onClick={() => onToggleLike && onToggleLike(track)}
            className="p-1.5 text-neutral-400 hover:text-white apple-press transition-colors shrink-0"
            title={isLiked ? "Retirer des favoris" : "Liker"}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isLiked ? 'text-green-500 fill-green-500 scale-110' : 'fill-none stroke-current'}`}
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Center Controls & Progress Bar */}
        <div className="shrink-0 md:flex-1 flex flex-col items-center gap-1.5 md:max-w-lg">
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Previous */}
            <button
              onClick={onPrevious}
              className="text-neutral-400 hover:text-white apple-press transition-colors hidden sm:block"
              title="Précédent"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow disabled:opacity-50"
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

          {/* Time Scrubber (desktop/tablette) */}
          <div className="hidden md:flex w-full items-center gap-2.5">
            <span className="text-[10px] font-mono text-neutral-400 w-9 text-right tabular-nums">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-white"
              style={{
                background: duration
                  ? `linear-gradient(to right, #ffffff ${(currentTime / duration) * 100}%, rgba(255,255,255,0.15) ${(currentTime / duration) * 100}%)`
                  : 'rgba(255,255,255,0.15)'
              }}
            />
            <span className="text-[10px] font-mono text-neutral-400 w-9 tabular-nums">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Volume Scrubber précis avec courbe logarithmique & Mute toggle (desktop) */}
        <div className="hidden md:flex w-1/4 items-center justify-end gap-2.5">
          <button
            onClick={toggleMute}
            className="text-neutral-400 hover:text-white transition-colors apple-press"
            title={isMuted ? "Réactiver le son" : "Couper le son"}
          >
            {isMuted || sliderVolume === 0 ? (
              <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
            ) : sliderVolume < 0.4 ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 9v6h4l5 5V4L11 9H7z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={isMuted ? 0 : sliderVolume}
            onChange={handleVolumeChange}
            className="w-20 accent-white cursor-pointer"
            style={{
              background: `linear-gradient(to right, #ffffff ${(isMuted ? 0 : sliderVolume) * 100}%, rgba(255,255,255,0.15) ${(isMuted ? 0 : sliderVolume) * 100}%)`
            }}
            title={`Volume : ${Math.round((isMuted ? 0 : sliderVolume) * 100)}% (↑ / ↓)`}
          />

          {/* Bouton guide des raccourcis clavier */}
          <button
            onClick={() => setShowShortcutsModal(prev => !prev)}
            className="text-neutral-400 hover:text-white transition-colors apple-press p-1 rounded-md hover:bg-white/10"
            title="Raccourcis clavier (Shift + ?)"
          >
            <span className="text-xs font-mono font-bold leading-none">⌨</span>
          </button>
        </div>
      </div>

      {/* Modale Raccourcis Clavier In-Page */}
      {showShortcutsModal && (
        <div 
          onClick={() => setShowShortcutsModal(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 pointer-events-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="apple-glass rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>⌨</span>
                <span>Raccourcis Clavier</span>
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center text-xs apple-press transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-neutral-300">Lecture / Pause</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold">Espace</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-neutral-300">Avancer / Reculer de 5s</span>
                <div className="flex gap-1 font-mono font-bold text-white">
                  <kbd className="px-2 py-0.5 rounded bg-white/10">←</kbd>
                  <kbd className="px-2 py-0.5 rounded bg-white/10">→</kbd>
                </div>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-neutral-300">Volume haut / bas</span>
                <div className="flex gap-1 font-mono font-bold text-white">
                  <kbd className="px-2 py-0.5 rounded bg-white/10">↑</kbd>
                  <kbd className="px-2 py-0.5 rounded bg-white/10">↓</kbd>
                </div>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-neutral-300">Couper / Réactiver le son</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold">M</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-neutral-300">Ajouter aux favoris</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold">L</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-neutral-300">Titre suivant</span>
                <div className="flex gap-1 font-mono font-bold text-white">
                  <kbd className="px-2 py-0.5 rounded bg-white/10">N</kbd>
                  <kbd className="px-2 py-0.5 rounded bg-white/10">J</kbd>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-300">Titre précédent</span>
                <div className="flex gap-1 font-mono font-bold text-white">
                  <kbd className="px-2 py-0.5 rounded bg-white/10">P</kbd>
                  <kbd className="px-2 py-0.5 rounded bg-white/10">K</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="pointer-events-auto text-center text-xs text-red-400 mt-2 bg-neutral-900/90 py-1 px-3 rounded-full border border-red-500/20 shadow">
          {error}
        </p>
      )}
    </div>
  );
}
