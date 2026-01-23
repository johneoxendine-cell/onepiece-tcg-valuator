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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{card.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {card.rarity && card.rarity !== 'None' && (
            <div className="text-sm text-gray-400 mt-1">{card.rarity}</div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-4">
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

              {!cardDetails?.variants?.length && (
                <div className="text-center py-8 text-gray-400">
                  No pricing data available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendIndicator({ slope, period = '30d' }) {
  if (slope === null || slope === undefined) return null;

  const absSlope = Math.abs(slope);
  let strength = 'neutral';
  let color = 'text-gray-400';
  let bgColor = 'bg-gray-700/50';

  if (slope > 0.01) {
    strength = 'up';
    color = 'text-green-400';
    bgColor = 'bg-green-900/30';
  } else if (slope < -0.01) {
    strength = 'down';
    color = 'text-red-400';
    bgColor = 'bg-red-900/30';
  }

  const isStrong = absSlope > 0.05;

  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${bgColor} ${color}`} title={`${period} trend: ${slope > 0 ? '+' : ''}${slope.toFixed(3)}/day`}>
      {strength === 'up' && (
        <>
          <svg className={`w-3 h-3 ${isStrong ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <span>{isStrong ? 'Rising' : 'Up'}</span>
        </>
      )}
      {strength === 'down' && (
        <>
          <svg className={`w-3 h-3 ${isStrong ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>{isStrong ? 'Falling' : 'Down'}</span>
        </>
      )}
      {strength === 'neutral' && (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <span>Stable</span>
        </>
      )}
    </div>
  );
}

function VariantRow({ variant }) {
  const { condition, printing, current_price, change_7d, change_30d, change_90d, trend_slope_30d } = variant;

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

      <div className="flex items-center gap-3">
        <TrendIndicator slope={trend_slope_30d} period="30d" />
        <div className="text-right">
          <div className="text-yellow-500 font-bold">{formatPrice(current_price)}</div>
          <div className="flex gap-2 text-xs">
            {change_7d !== null && change_7d !== undefined && (
              <span className={change_7d > 0 ? 'text-green-400' : change_7d < 0 ? 'text-red-400' : 'text-gray-400'}>
                7d: {formatChange(change_7d)}
              </span>
            )}
            {change_30d !== null && change_30d !== undefined && (
              <span className={change_30d > 0 ? 'text-green-400' : change_30d < 0 ? 'text-red-400' : 'text-gray-400'}>
                30d: {formatChange(change_30d)}
              </span>
            )}
            {change_90d !== null && change_90d !== undefined && (
              <span className={change_90d > 0 ? 'text-green-400' : change_90d < 0 ? 'text-red-400' : 'text-gray-400'}>
                90d: {formatChange(change_90d)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CardModal;
