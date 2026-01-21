import { useState, useEffect } from 'react';
import api from '../services/api';
import SetSelector from '../components/SetSelector';

function BoosterEV() {
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState('');
  const [boxPrice, setBoxPrice] = useState('');
  const [evData, setEvData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [setsLoading, setSetsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch sets on mount
  useEffect(() => {
    api.getSets()
      .then(data => {
        setSets(data);
        if (data.length > 0) {
          setSelectedSet(data[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setSetsLoading(false));
  }, []);

  // Calculate EV when set changes
  useEffect(() => {
    if (!selectedSet) return;

    async function calculateEV() {
      try {
        setLoading(true);
        setError(null);
        const price = boxPrice ? parseFloat(boxPrice) : null;
        const data = await api.getSetEV(selectedSet, price);
        setEvData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    calculateEV();
  }, [selectedSet, boxPrice]);

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Booster Box EV</h1>
        <p className="text-gray-400 mt-1">
          Calculate expected value for One Piece TCG booster boxes
        </p>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SetSelector
            sets={sets}
            selectedSet={selectedSet}
            onChange={setSelectedSet}
            loading={setsLoading}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Box Price (optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={boxPrice}
                onChange={(e) => setBoxPrice(e.target.value)}
                placeholder="e.g., 110"
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 pl-7 text-sm text-white focus:outline-none focus:ring-2 focus:ring-op-red placeholder-gray-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter box price to see value comparison
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-op-red border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-400 mt-4">Calculating EV...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* EV Results */}
      {evData && !loading && (
        <div className="space-y-6">
          {/* Main EV Card */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-6 text-center border-b border-gray-700">
              <h2 className="text-lg text-gray-400">{evData.setName}</h2>
              <p className="text-4xl font-bold text-op-gold mt-2">
                {formatCurrency(evData.totalEV)}
              </p>
              <p className="text-gray-400 mt-1">Expected Value per Box</p>
            </div>

            {/* Box Price Comparison */}
            {evData.valuation && (
              <div className={`p-4 ${
                evData.valuation.status === 'good_value' ? 'bg-green-900/30' :
                evData.valuation.status === 'poor_value' ? 'bg-red-900/30' :
                'bg-gray-700/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">vs. Box Price</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(evData.valuation.boxPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Expected Profit/Loss</p>
                    <p className={`text-xl font-bold ${
                      evData.valuation.profit > 0 ? 'text-green-400' :
                      evData.valuation.profit < 0 ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {evData.valuation.profit > 0 ? '+' : ''}
                      {formatCurrency(evData.valuation.profit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">EV Ratio</p>
                    <p className={`text-xl font-bold ${
                      evData.valuation.evRatio > 1 ? 'text-green-400' :
                      evData.valuation.evRatio < 1 ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {evData.valuation.evRatio}x
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* EV Breakdown by Rarity */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold">EV Breakdown by Rarity</h3>
            </div>
            <div className="divide-y divide-gray-700">
              {evData.evBreakdown && Object.entries(evData.evBreakdown)
                .sort(([, a], [, b]) => b.ev - a.ev)
                .map(([rarity, data]) => (
                  <div key={rarity} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{rarity}</p>
                      <p className="text-sm text-gray-400">
                        {data.cardCount} cards @ avg {formatCurrency(data.avgPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-op-gold">{formatCurrency(data.ev)}</p>
                      <p className="text-sm text-gray-400">
                        ~{data.pullRate} per box
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Value Cards */}
          {evData.topCards && evData.topCards.length > 0 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold">Top Value Cards</h3>
              </div>
              <div className="divide-y divide-gray-700">
                {evData.topCards.map((card, idx) => (
                  <div key={idx} className="p-4 flex items-center gap-4">
                    <span className="text-gray-500 w-6">{idx + 1}.</span>
                    {card.image_url && (
                      <img
                        src={card.image_url}
                        alt={card.name}
                        className="w-10 h-14 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{card.name}</p>
                      <p className="text-sm text-gray-400">{card.rarity}</p>
                    </div>
                    <p className="font-bold text-op-gold">
                      {formatCurrency(card.price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-gray-500 text-center">
            EV calculations are estimates based on community-reported pull rates and current market prices.
            Actual results may vary significantly.
          </p>
        </div>
      )}
    </div>
  );
}

export default BoosterEV;
