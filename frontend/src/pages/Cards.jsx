import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import CardCard from '../components/CardCard';
import CardModal from '../components/CardModal';

function Cards() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [cards, setCards] = useState([]);
  const [sets, setSets] = useState([]);
  const [currentSet, setCurrentSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [selectedCard, setSelectedCard] = useState(null);

  // Get filters from URL
  const selectedSetId = searchParams.get('set_id') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sort = searchParams.get('sort') || 'price';
  const order = searchParams.get('order') || 'desc';
  const search = searchParams.get('search') || '';
  const limit = 48;

  // Local state for search input (to allow typing without immediate URL updates)
  const [searchInput, setSearchInput] = useState(search);

  // Sort options for dropdown
  const sortOptions = [
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'rarity-desc', label: 'Rarity: Highest First' },
    { value: 'rarity-asc', label: 'Rarity: Lowest First' },
    { value: 'name-asc', label: 'Name: A to Z' },
    { value: 'name-desc', label: 'Name: Z to A' },
    { value: 'number-asc', label: 'Card Number' },
  ];

  // Update URL params
  const updateFilters = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    if (!updates.hasOwnProperty('page')) {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  // Fetch sets on mount
  useEffect(() => {
    api.getSets().then(data => {
      setSets(data || []);
      // Find current set name
      if (selectedSetId && data) {
        const set = data.find(s => s.id === selectedSetId);
        setCurrentSet(set);
      }
    }).catch(console.error);
  }, [selectedSetId]);

  // Debounce search input - update URL after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateFilters({ search: searchInput || null });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch cards when filters change
  useEffect(() => {
    async function fetchCards() {
      try {
        setLoading(true);
        setError(null);

        const params = {
          limit,
          offset: (page - 1) * limit,
          sort,
          order,
          product_type: 'cards' // Exclude sealed products (booster boxes, packs, etc.)
        };

        if (selectedSetId) params.set_id = selectedSetId;
        if (search) params.search = search;

        const data = await api.getCards(params);
        setCards(data.cards || []);
        setTotal(data.total || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCards();
  }, [selectedSetId, page, sort, order, search]);

  const totalPages = Math.ceil(total / limit);

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          to="/"
          className="text-gray-400 hover:text-white text-sm mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sets
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">
          {currentSet?.name || 'All Cards'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {total} cards
        </p>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px] max-w-[300px]">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Search Cards
          </label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by card name..."
            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Set Selector (if no set selected) */}
        {!selectedSetId && sets.length > 0 && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Set
            </label>
            <select
              value={selectedSetId}
              onChange={(e) => updateFilters({ set_id: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Sets</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort Dropdown */}
        <div className={selectedSetId ? 'w-full sm:w-auto' : ''}>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Sort By
          </label>
          <select
            value={`${sort}-${order}`}
            onChange={(e) => {
              const [newSort, newOrder] = e.target.value.split('-');
              updateFilters({ sort: newSort, order: newOrder });
            }}
            className="w-full sm:w-auto bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-gray-400">Loading cards...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-red-400">Error: {error}</div>
        </div>
      )}

      {/* Cards Grid */}
      {!loading && !error && (
        <div className="cards-grid">
          {cards.map((card) => (
            <CardCard
              key={card.id}
              card={card}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && cards.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          {search
            ? `No cards found matching "${search}"`
            : 'No cards found in this set.'}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => updateFilters({ page: String(page - 1) })}
            disabled={page <= 1}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Previous
          </button>

          <span className="px-4 py-2 text-gray-400">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => updateFilters({ page: String(page + 1) })}
            disabled={page >= totalPages}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Card Modal */}
      {selectedCard && (
        <CardModal card={selectedCard} onClose={handleCloseModal} />
      )}
    </div>
  );
}

export default Cards;
