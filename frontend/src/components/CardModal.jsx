import { useState, useEffect } from 'react';
import api from '../services/api';

function CardModal({ card, onClose }) {
  const [cardDetails, setCardDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!card) return;

    async function fetchCardDetails() {
      try {
        setLoading(true);
        const data = await api.getCard(card.id);
        setCardDetails(data);
      } catch (err) {
        console.error('Failed to fetch card details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCardDetails();
  }, [card]);

  if (!card) return null;

  const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  // Color badge styles
  const colorStyles = {
    'Red': 'bg-red-600',
    'Blue': 'bg-blue-600',
    'Green': 'bg-green-600',
    'Purple': 'bg-purple-600',
    'Black': 'bg-gray-800 border border-gray-600',
    'Yellow': 'bg-yellow-500 text-black',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {cardDetails?.card_color && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded text-white ${colorStyles[cardDetails.card_color] || 'bg-gray-600'}`}>
                  {cardDetails.card_color}
                </span>
              )}
              <h2 className="text-lg font-bold text-white">{card.name}</h2>
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
          {cardDetails?.card_type && (
            <div className="text-sm text-gray-400 mt-1">
              {cardDetails.card_type}
              {cardDetails.sub_types && ` - ${cardDetails.sub_types}`}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-4">
              {/* Card Stats */}
              {(cardDetails?.card_cost !== null || cardDetails?.card_power !== null || cardDetails?.life !== null || cardDetails?.counter_amount !== null) && (
                <div className="grid grid-cols-4 gap-2">
                  {cardDetails?.card_cost !== null && (
                    <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400">Cost</div>
                      <div className="text-lg font-bold text-white">{cardDetails.card_cost}</div>
                    </div>
                  )}
                  {cardDetails?.card_power !== null && (
                    <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400">Power</div>
                      <div className="text-lg font-bold text-white">{cardDetails.card_power}</div>
                    </div>
                  )}
                  {cardDetails?.life !== null && (
                    <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400">Life</div>
                      <div className="text-lg font-bold text-white">{cardDetails.life}</div>
                    </div>
                  )}
                  {cardDetails?.counter_amount !== null && cardDetails?.counter_amount > 0 && (
                    <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400">Counter</div>
                      <div className="text-lg font-bold text-white">+{cardDetails.counter_amount}</div>
                    </div>
                  )}
                  {cardDetails?.attribute && (
                    <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400">Attribute</div>
                      <div className="text-sm font-bold text-white">{cardDetails.attribute}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Card Text */}
              {cardDetails?.card_text && (
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Card Effect
                  </h3>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{cardDetails.card_text}</p>
                </div>
              )}

              {/* Variants/Pricing */}
              {cardDetails?.variants?.length > 0 && (
                <>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Variants & Pricing
                  </h3>
                  <div className="space-y-1">
                    {cardDetails.variants.map((variant) => (
                      <VariantRow key={variant.id} variant={variant} />
                    ))}
                  </div>
                </>
              )}

              {!cardDetails?.variants?.length && !cardDetails?.card_text && (
                <div className="text-center py-8 text-gray-400">
                  No data available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VariantRow({ variant }) {
  const { condition, printing, current_price, change_7d } = variant;

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
    <div className="flex items-center justify-between p-3 border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50 rounded">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <div>
          <div className="text-sm font-medium text-white">{condition}</div>
          <div className="text-xs text-gray-400">{printing}</div>
        </div>
      </div>

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

export default CardModal;
