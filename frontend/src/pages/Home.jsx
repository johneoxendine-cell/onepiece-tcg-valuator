import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function Home() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSets() {
      try {
        setLoading(true);
        const data = await api.getSets();
        setSets(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSets();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading sets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-white">One Piece TCG Collection</h1>
        <p className="text-gray-400 mt-2">
          Browse sets and view card prices
        </p>
      </div>

      {/* Sets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sets.map((set) => (
          <SetCard key={set.id} set={set} />
        ))}
      </div>

      {/* Empty State */}
      {sets.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No sets found. Try syncing data first.
        </div>
      )}
    </div>
  );
}

function SetCard({ set }) {
  const [imageError, setImageError] = useState(false);
  const { id, name, image_url, set_code } = set;

  // Use set_code from API, or extract from name as fallback
  const displayCode = set_code || (() => {
    const codeMatch = name.match(/\b(OP|ST|EB|PRB)[-]?\d+\b/i);
    return codeMatch ? codeMatch[0].toUpperCase() : name.slice(0, 4).toUpperCase();
  })();

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
      {/* Set Image Area */}
      <div className="aspect-[63/88] bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center overflow-hidden relative">
        {image_url && !imageError ? (
          <img
            src={image_url}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-2xl font-bold text-gray-400">{displayCode}</span>
        )}
        {/* Set Code Badge */}
        {displayCode && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs font-bold rounded">
            {displayCode}
          </span>
        )}
      </div>

      {/* Set Info */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-white truncate" title={name}>
          {name}
        </h3>

        <Link
          to={`/cards?set_id=${id}`}
          className="mt-3 block w-full text-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors"
        >
          View Collection
        </Link>
      </div>
    </div>
  );
}

export default Home;
