function TrendBadge({ slope }) {
  if (slope === null || slope === undefined) return null;

  // Only show badge for significant trends
  if (Math.abs(slope) < 0.01) return null;

  const isUp = slope > 0;
  const isStrong = Math.abs(slope) > 0.05;

  return (
    <div
      className={`absolute top-1 right-1 p-1 rounded ${isUp ? 'bg-green-600' : 'bg-red-600'} ${isStrong ? 'animate-pulse' : ''}`}
      title={`30d trend: ${isUp ? '+' : ''}${slope.toFixed(3)}/day`}
    >
      {isUp ? (
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
}

function ChangeIndicator({ value, label }) {
  if (value === null || value === undefined) return null;

  const isPositive = value > 0;
  const isNegative = value < 0;
  const colorClass = isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400';
  const sign = isPositive ? '+' : '';

  return (
    <div className={`text-xs ${colorClass}`} title={`${label} change`}>
      <span className="text-gray-500 text-[10px]">{label}:</span> {sign}{value.toFixed(1)}%
    </div>
  );
}

function CardCard({ card, onClick }) {
  const { name, rarity, image_url, current_price, change_7d, change_30d, change_90d, trend_slope_30d } = card;

  const formatPrice = (price) => {
    if (price === null || price === undefined) return null;
    return `$${price.toFixed(2)}`;
  };

  const hasChanges = change_7d !== null || change_30d !== null || change_90d !== null;

  return (
    <div className="card-item" onClick={() => onClick?.(card)}>
      {/* Card Image */}
      <div className="relative">
        {image_url ? (
          <img
            src={image_url}
            alt={name}
            className="w-full aspect-[63/88] object-cover rounded-lg"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[63/88] bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-sm">
            No Image
          </div>
        )}
        <TrendBadge slope={trend_slope_30d} />
      </div>

      {/* Card Info */}
      <div className="mt-2 text-center">
        <h3 className="text-sm font-medium text-white truncate" title={name}>
          {name}
        </h3>

        {/* Price */}
        {current_price && (
          <div className="text-yellow-500 font-bold text-sm mt-1">
            {formatPrice(current_price)}
          </div>
        )}

        {/* Price Changes */}
        {hasChanges && (
          <div className="flex justify-center gap-2 mt-1">
            <ChangeIndicator value={change_7d} label="7d" />
            <ChangeIndicator value={change_30d} label="30d" />
            <ChangeIndicator value={change_90d} label="90d" />
          </div>
        )}

        {rarity && rarity !== 'None' && (
          <div className="mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-500 text-white">
              {rarity}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CardCard;
