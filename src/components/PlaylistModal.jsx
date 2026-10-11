import { useState } from 'react';

export default function PlaylistModal({ isOpen, onClose, track, playlists, onCreatePlaylist, onSelectPlaylist }) {
  const [newTitle, setNewTitle] = useState('');

  if (!isOpen || !track) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onCreatePlaylist(newTitle.trim(), track);
      setNewTitle('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
      <div className="apple-glass rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-white tracking-tight">Ajouter à une playlist</h2>
          <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center text-xs apple-press transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.04] mb-4 border border-white/5">
          {track.thumbnail && (
            <img src={track.thumbnail} alt="" className="w-10 h-10 rounded-xl object-cover shadow" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{track.title}</p>
            <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
          </div>
        </div>

        {/* Existing playlists */}
        <div className="max-h-48 overflow-y-auto mb-4 space-y-1.5 pr-1">
          {playlists.length === 0 ? (
            <p className="text-xs text-neutral-500 py-3 text-center">Aucune playlist créée</p>
          ) : (
            playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => { onSelectPlaylist(pl.id, track); onClose(); }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] transition-all text-white text-xs flex items-center justify-between"
              >
                <span className="font-medium truncate">{pl.name}</span>
                <span className="text-[10px] text-neutral-400 font-mono">{pl.tracks?.length || 0} titres</span>
              </button>
            ))
          )}
        </div>

        {/* Create new playlist */}
        <form onSubmit={handleCreate} className="pt-3 border-t border-white/10 flex gap-2">
          <input
            type="text"
            placeholder="Nouvelle playlist..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 bg-white/[0.06] px-3.5 py-2 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40"
          />
          <button
            type="submit"
            className="bg-white text-black font-semibold text-xs px-4 py-2 rounded-xl apple-press transition-colors shadow"
          >
            Créer
          </button>
        </form>
      </div>
    </div>
  );
}
