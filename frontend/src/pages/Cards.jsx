import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import CardGrid from '../components/CardGrid';
import SetSelector from '../components/SetSelector';
import RarityFilter from '../components/RarityFilter';

function Cards() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [cards, setCards] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  // Filters from URL params
  const selectedSet = searchParams.get('set_id') || '';
  const selectedRarity = searchParams.get('rarity') || '';
  const selectedValuation = searchParams.get('valuation') || '';
  const sortBy = searchParams.get('sort') || 'price';
  const sortOrder = searchParams.get('order') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 24;

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
    // Reset to page 1 when filters change
    if (!updates.hasOwnProperty('page')) {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  // Fetch sets on mount
  useEffect(() => {
    api.getSets().then(setSets).catch(console.error);
  }, []);

  // Fetch cards when filters change
  useEffect(() => {
    async function fetchCards() {
      try {
        setLoading(true);
        setError(null);

        const params = {
          limit,
          offset: (page - 1) * limit,
          sort: sortBy,
          order: sortOrder
        };

        if (selectedSet) params.set_id = selectedSet;
        if (selectedRarity) params.rarity = selectedRarity;
        if (selectedValuation) params.valuation = selectedValuation;

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
  }, [selectedSet, selectedRarity, selectedValuation, sortBy, sortOrder, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Cards</h1>
        <p className="text-gray-400 mt-1">
          Browse and filter One Piece TCG cards by set, rarity, and valuation
        </p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <SetSelector
            sets={sets}
            selectedSet={selectedSet}
            onChange={(value) => updateFilters({ set_id: value })}
            loading={loading}
          />

          <RarityFilter
            selectedRarity={selectedRarity}
            onChange={(value) => updateFilters({ rarity: value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Valuation
            </label>
            <select
              value={selectedValuation}
              onChange={(e) => updateFilters({ valuation: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-op-red"
            >
              <option value="">All</option>
              <option value="undervalued">Undervalued</option>
              <option value="overvalued">Overvalued</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-op-red"
            >
              <option value="price">Price</option>
              <option value="name">Name</option>
              <option value="deviation">Deviation</option>
              <option value="change">7d Change</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => updateFilters({ order: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-op-red"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">
          Showing {cards.length} of {total} cards
        </p>
        {selectedValuation && (
          <button
            onClick={() => updateFilters({ valuation: '' })}
            className="text-sm text-op-red hover:text-red-400"
          >
            Clear valuation filter
          </button>
        )}
      </div>

      {/* Card Grid */}
      <CardGrid cards={cards} loading={loading} error={error} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => updateFilters({ page: String(page - 1) })}
            disabled={page <= 1}
            className="px-4 py-2 bg-gray-700 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
          >
            Previous
          </button>

          <span className="px-4 py-2 text-gray-400">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => updateFilters({ page: String(page + 1) })}
            disabled={page >= totalPages}
            className="px-4 py-2 bg-gray-700 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default Cards;
