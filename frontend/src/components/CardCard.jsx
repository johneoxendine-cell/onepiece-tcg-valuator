import ValuationBadge from './ValuationBadge';

function CardCard({ card }) {
  const {
    name,
    rarity,
    number,
    image_url,
    set_name,
    current_price,
    avg_30d,
    change_7d,
    valuation
  } = card;

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
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Card Image */}
      <div className="aspect-[63/88] bg-gray-700 relative">
        {image_url ? (
          <img
            src={image_url}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            No Image
          </div>
        )}
        {/* Rarity badge */}
        {rarity && (
          <span className="absolute top-2 right-2 bg-black/70 px-2 py-0.5 rounded text-xs font-bold">
            {rarity}
          </span>
        )}
      </div>

      {/* Card Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate" title={name}>
          {name}
        </h3>
        <p className="text-xs text-gray-400 truncate">
          {set_name} {number && `#${number}`}
        </p>

        {/* Price Info */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-bold text-op-gold">
            {formatPrice(current_price)}
          </span>
          {change_7d !== null && change_7d !== undefined && (
            <span className={`text-xs ${change_7d > 0 ? 'text-green-400' : change_7d < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              7d: {formatChange(change_7d)}
            </span>
          )}
        </div>

        {/* Average Price */}
        {avg_30d && (
          <p className="text-xs text-gray-400 mt-1">
            30d avg: {formatPrice(avg_30d)}
          </p>
        )}

        {/* Valuation Badge */}
        <div className="mt-2">
          <ValuationBadge valuation={valuation} />
        </div>
      </div>
    </div>
  );
}

export default CardCard;
