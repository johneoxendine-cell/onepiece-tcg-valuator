import { useState, useEffect } from 'react';
import api from '../services/api';

function SetModal({ set, onClose }) {
  const [setDetails, setSetDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!set) return;

    async function fetchSetDetails() {
      try {
        setLoading(true);
        const data = await api.getSet(set.id);
        setSetDetails(data);
      } catch (err) {
        console.error('Failed to fetch set details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSetDetails();
  }, [set]);

  if (!set) return null;

  const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (change) => {
    if (change === null || change === undefined) return null;
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {set.set_code && (
                <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">
                  {set.set_code}
                </span>
              )}
              <h2 className="text-lg font-bold text-white">{set.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : setDetails?.valuation ? (
            <div className="space-y-6">
              {/* Value Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Total Set Value</div>
                  <div className="text-2xl font-bold text-yellow-500">
                    {formatPrice(setDetails.valuation.total_value)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {setDetails.valuation.total_cards} cards
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Top 10 Value</div>
                  <div className="text-2xl font-bold text-green-400">
                    {formatPrice(setDetails.valuation.top10_value)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {setDetails.valuation.top10_value && setDetails.valuation.total_value
                      ? `${((setDetails.valuation.top10_value / setDetails.valuation.total_value) * 100).toFixed(1)}% of total`
                      : ''}
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400">Avg Top 10 Card Price</div>
                <div className="text-lg font-bold text-white">
                  {formatPrice(setDetails.valuation.top10_value / 10)}
                </div>
              </div>

              {/* Top 10 Cards */}
              {setDetails.valuation.top_cards?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Top 10 Most Valuable Cards
                  </h3>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                      {setDetails.valuation.top_cards.map((card, index) => (
                        <TopCardRow key={card.id} card={card} rank={index + 1} formatPrice={formatPrice} formatChange={formatChange} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No valuation data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopCardRow({ card, rank, formatPrice, formatChange }) {
  const { name, rarity, current_price, change_7d, printing } = card;
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex items-center gap-3 p-2 border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50 rounded">
      {/* Rank */}
      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-600 text-xs font-bold text-gray-300">
        {rank}
      </div>

      {/* Card Image Thumbnail */}
      <div className="w-10 h-14 bg-gray-700 rounded overflow-hidden flex-shrink-0">
        {card.image_url && !imageError ? (
          <img
            src={card.image_url}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
            N/A
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{name}</div>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <span>{rarity}</span>
          {printing && <span className="text-gray-500">({printing})</span>}
        </div>
      </div>

      {/* Price */}
      <div className="text-right">
        <div className="text-yellow-500 font-bold">{formatPrice(current_price)}</div>
        {change_7d !== null && change_7d !== undefined && (
          <div className={`text-xs ${change_7d > 0 ? 'text-green-400' : change_7d < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {formatChange(change_7d)}
          </div>
        )}
      </div>
    </div>
  );
}

export default SetModal;
