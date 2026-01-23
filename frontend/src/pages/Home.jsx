import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../services/api';
import SetModal from '../components/SetModal';

function Home() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
  const [sortBy, setSortBy] = useState('default');
  const [searchQuery, setSearchQuery] = useState('');

  const sortOptions = [
    { value: 'default', label: 'Default (By Set Code)' },
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

  // Group sets by set_code and combine promos
  const groupedSets = useMemo(() => {
    const groups = new Map();

    for (const set of sets) {
      // Determine group key
      let groupKey;
      const name = set.name.toLowerCase();

      // Check if it's a promo set
      if (name.includes('promo') || name.includes('promotion') || set.set_code === 'P') {
        groupKey = 'PROMO';
      } else if (set.set_code) {
        groupKey = set.set_code;
      } else {
        // Use the set's own id if no set_code
        groupKey = set.id;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          groupKey,
          sets: [],
          name: '',
          image_url: null,
          total_value: 0,
          top10_value: 0,
          card_count: 0,
          release_date: null,
        });
      }

      const group = groups.get(groupKey);
      group.sets.push(set);
      group.total_value += set.total_value || 0;
      group.top10_value += set.top10_value || 0;
      group.card_count += set.card_count || 0;
    }

    // Convert to array and calculate avg_top10_price
    const result = Array.from(groups.values()).map(group => {
      // Find the best set to use as primary (prefer sets with actual price data)
      const sortedSets = [...group.sets].sort((a, b) => {
        // Prefer sets with total_value > 0
        if ((a.total_value || 0) !== (b.total_value || 0)) {
          return (b.total_value || 0) - (a.total_value || 0);
        }
        // Then prefer sets with more cards
        return (b.card_count || 0) - (a.card_count || 0);
      });

      // Filter to main sets (not pre-release/tournament variants)
      const mainSets = sortedSets.filter(s => {
        const n = s.name.toLowerCase();
        return !n.includes('pre-release') && !n.includes('tournament') && !n.includes('release event') && !n.includes('anniversary');
      });

      // Use the best main set, or fall back to best overall set
      const primarySet = mainSets[0] || sortedSets[0];

      return {
        ...group,
        avg_top10_price: group.top10_value / 10,
        // For promo, use a special name
        name: group.groupKey === 'PROMO' ? 'Promotional Cards' : primarySet.name,
        set_code: group.groupKey,
        image_url: primarySet.image_url || group.image_url,
        release_date: primarySet.release_date || group.release_date,
        // Primary set id for linking (use the set with most data)
        id: primarySet.id,
      };
    });

    return result;
  }, [sets]);

  // Sort grouped sets
  const sortedSets = useMemo(() => {
    if (sortBy === 'default') {
      // Sort by set code (OP-14, OP-13, etc.) descending, promos at end
      return [...groupedSets].sort((a, b) => {
        if (a.groupKey === 'PROMO') return 1;
        if (b.groupKey === 'PROMO') return -1;

        // Extract number from set code for proper sorting
        const getNum = (code) => {
          const match = code.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        const getPrefix = (code) => code.replace(/[\d-]/g, '');

        // Sort by prefix first, then by number descending
        const prefixA = getPrefix(a.groupKey);
        const prefixB = getPrefix(b.groupKey);
        if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);

        return getNum(b.groupKey) - getNum(a.groupKey);
      });
    }

    return [...groupedSets].sort((a, b) => {
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
  }, [groupedSets, sortBy]);

  // Filter sets based on search query
  const filteredSets = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedSets;
    }

    const query = searchQuery.toLowerCase().trim();
    return sortedSets.filter((group) => {
      // Match against set name
      if (group.name.toLowerCase().includes(query)) {
        return true;
      }
      // Match against set code (e.g., "OP-01", "op01", "op 01")
      if (group.set_code && group.set_code.toLowerCase().includes(query)) {
        return true;
      }
      // Also match without the dash (e.g., "op01" matches "OP-01")
      if (group.set_code) {
        const codeNoDash = group.set_code.toLowerCase().replace('-', '');
        const queryNoDash = query.replace(/[-\s]/g, '');
        if (codeNoDash.includes(queryNoDash)) {
          return true;
        }
      }
      return false;
    });
  }, [sortedSets, searchQuery]);

  const handleSetClick = (group) => {
    // Pass the group with all its child sets
    setSelectedSet(group);
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
      <Helmet>
        <title>OP TCG Market - One Piece Card Prices & Values</title>
        <meta name="description" content="Browse all One Piece TCG sets and track card prices. Find undervalued cards and analyze market trends across every set." />
        <link rel="canonical" href="https://optcgmarket.com/" />
      </Helmet>

      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-white">One Piece TCG Collection</h1>
        <p className="text-gray-400 mt-2">
          Browse sets and view card prices
        </p>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end">
        {/* Search Input */}
        <div className="w-full sm:w-64">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Search Sets
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or set code..."
            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Sort Dropdown */}
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
        {filteredSets.map((group) => (
          <SetCard key={group.groupKey} group={group} onSetClick={handleSetClick} />
        ))}
      </div>

      {/* No Results Message */}
      {searchQuery && filteredSets.length === 0 && sets.length > 0 && (
        <div className="text-center py-8 text-gray-400">
          No sets found matching "{searchQuery}"
        </div>
      )}

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

function SetCard({ group, onSetClick }) {
  const [imageError, setImageError] = useState(false);
  const { name, image_url, set_code, sets, total_value, card_count } = group;

  const formatValue = (value) => {
    if (!value) return '$0';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Build comma-separated set IDs for the link
  const setIdsParam = sets.map(s => s.id).join(',');

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
      {/* Set Image Area - Clickable for set details */}
      <div
        className="aspect-[63/88] bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center overflow-hidden relative cursor-pointer"
        onClick={() => onSetClick(group)}
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
          <span className="text-2xl font-bold text-gray-400">{set_code}</span>
        )}
        {/* Set Code Badge */}
        {set_code && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs font-bold rounded">
            {set_code}
          </span>
        )}
        {/* Card count badge */}
        {card_count > 0 && (
          <span className="absolute top-2 right-2 px-2 py-0.5 bg-orange-500/90 text-white text-xs font-bold rounded">
            {card_count} cards
          </span>
        )}
        {/* Total Value Badge */}
        {total_value > 0 && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-green-600/90 text-white text-xs font-bold rounded">
            {formatValue(total_value)}
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
          to={`/cards?set_id=${setIdsParam}`}
          className="mt-3 block w-full text-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors"
        >
          View Collection
        </Link>
      </div>
    </div>
  );
}

export default Home;
