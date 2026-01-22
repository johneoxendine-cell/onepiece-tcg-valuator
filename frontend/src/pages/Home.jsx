import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import SetModal from '../components/SetModal';

function Home() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
  const [sortBy, setSortBy] = useState('default');

  const sortOptions = [
    { value: 'default', label: 'Default (By Type)' },
    { value: 'total_value_desc', label: 'Total Set Value: High to Low' },
    { value: 'total_value_asc', label: 'Total Set Value: Low to High' },
    { value: 'top10_value_desc', label: 'Top 10 Value: High to Low' },
    { value: 'top10_value_asc', label: 'Top 10 Value: Low to High' },
    { value: 'avg_top10_price_desc', label: 'Avg Top 10 Price: High to Low' },
    { value: 'avg_top10_price_asc', label: 'Avg Top 10 Price: Low to High' },
  ];

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

  // Sort sets based on selected option
  const sortedSets = useMemo(() => {
    if (sortBy === 'default') return sets;

    return [...sets].sort((a, b) => {
      switch (sortBy) {
        case 'total_value_desc':
          return (b.total_value || 0) - (a.total_value || 0);
        case 'total_value_asc':
          return (a.total_value || 0) - (b.total_value || 0);
        case 'top10_value_desc':
          return (b.top10_value || 0) - (a.top10_value || 0);
        case 'top10_value_asc':
          return (a.top10_value || 0) - (b.top10_value || 0);
        case 'avg_top10_price_desc':
          return (b.avg_top10_price || 0) - (a.avg_top10_price || 0);
        case 'avg_top10_price_asc':
          return (a.avg_top10_price || 0) - (b.avg_top10_price || 0);
        default:
          return 0;
      }
    });
  }, [sets, sortBy]);

  const handleSetClick = (set) => {
    setSelectedSet(set);
  };

  const handleCloseModal = () => {
    setSelectedSet(null);
  };

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

      {/* Sort Dropdown */}
      <div className="flex justify-end">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sortedSets.map((set) => (
          <SetCard key={set.id} set={set} onSetClick={handleSetClick} />
        ))}
      </div>

      {/* Empty State */}
      {sets.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No sets found. Try syncing data first.
        </div>
      )}

      {/* Set Modal */}
      {selectedSet && (
        <SetModal set={selectedSet} onClose={handleCloseModal} />
      )}
    </div>
  );
}

function SetCard({ set, onSetClick }) {
  const [imageError, setImageError] = useState(false);
  const { id, name, image_url, set_code } = set;

  // Use set_code from API, or extract from name as fallback
  const displayCode = set_code || (() => {
    const codeMatch = name.match(/\b(OP|ST|EB|PRB)[-]?\d+\b/i);
    return codeMatch ? codeMatch[0].toUpperCase() : name.slice(0, 4).toUpperCase();
  })();

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
      {/* Set Image Area - Clickable for set details */}
      <div
        className="aspect-[63/88] bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center overflow-hidden relative cursor-pointer"
        onClick={() => onSetClick(set)}
      >
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
        {/* Click hint overlay */}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
          <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">
            View Value
          </span>
        </div>
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
