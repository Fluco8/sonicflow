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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">Ajouter à une playlist</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">✕</button>
        </div>

        <p className="text-sm text-neutral-400 mb-4 truncate">
          Titre : <span className="text-white font-medium">{track.title}</span> - {track.artist}
        </p>

        {/* Liste des playlists existantes */}
        <div className="max-h-48 overflow-y-auto mb-4 space-y-1">
          {playlists.length === 0 ? (
            <p className="text-xs text-neutral-500 py-2">Aucune playlist créée pour le moment.</p>
          ) : (
            playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => { onSelectPlaylist(pl.id, track); onClose(); }}
                className="w-full text-left px-3 py-2 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-white text-sm flex items-center justify-between"
              >
                <span className="font-medium truncate">{pl.name}</span>
                <span className="text-xs text-neutral-400">{pl.tracks?.length || 0} titres</span>
              </button>
            ))
          )}
        </div>

        {/* Créer une nouvelle playlist */}
        <form onSubmit={handleCreate} className="pt-3 border-t border-neutral-800 flex gap-2">
          <input
            type="text"
            placeholder="Nouvelle playlist..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 bg-neutral-800 px-3 py-2 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-400 text-black font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
          >
            Créer
          </button>
        </form>
      </div>
    </div>
  );
}
