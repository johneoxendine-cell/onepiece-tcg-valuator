import CardCard from './CardCard';

function CardGrid({ cards, loading, error }) {
  if (loading) {
    return (
      <div className="card-grid">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 animate-pulse">
            <div className="aspect-[63/88] bg-gray-700" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
              <div className="h-6 bg-gray-700 rounded w-1/3 mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-700">
        <p className="text-gray-400">No cards found</p>
      </div>
    );
  }

  return (
    <div className="card-grid">
      {cards.map((card) => (
        <CardCard key={card.variant_id || card.id} card={card} />
      ))}
    </div>
  );
}

export default CardGrid;
