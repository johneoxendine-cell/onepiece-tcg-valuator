function CardCard({ card, onClick }) {
  const { name, rarity, image_url } = card;

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
      </div>

      {/* Card Info */}
      <div className="mt-2 text-center">
        <h3 className="text-sm font-medium text-white truncate" title={name}>
          {name}
        </h3>
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
