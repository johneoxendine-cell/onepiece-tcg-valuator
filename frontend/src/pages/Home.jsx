import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CardGrid from '../components/CardGrid';

function Home() {
  const [summary, setSummary] = useState(null);
  const [undervalued, setUndervalued] = useState([]);
  const [overvalued, setOvervalued] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [summaryData, undervaluedData, overvaluedData] = await Promise.all([
          api.getSummary(),
          api.getUndervaluedCards({ limit: 8 }),
          api.getOvervaluedCards({ limit: 8 })
        ]);

        setSummary(summaryData);
        setUndervalued(undervaluedData.cards || []);
        setOvervalued(overvaluedData.cards || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Find over/undervalued One Piece TCG cards based on market data
        </p>
      </div>

      {/* Stats Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Cards"
            value={summary.stats?.totalCards || 0}
          />
          <StatCard
            label="Sets"
            value={summary.stats?.totalSets || 0}
          />
          <StatCard
            label="Undervalued"
            value={summary.stats?.undervaluedCount || 0}
            color="green"
          />
          <StatCard
            label="Overvalued"
            value={summary.stats?.overvaluedCount || 0}
            color="red"
          />
        </div>
      )}

      {/* Undervalued Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-green-400">
            Top Undervalued Cards
          </h2>
          <Link
            to="/cards?valuation=undervalued"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            View All &rarr;
          </Link>
        </div>
        <CardGrid cards={undervalued} loading={loading} error={error} />
      </section>

      {/* Overvalued Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-400">
            Top Overvalued Cards
          </h2>
          <Link
            to="/cards?valuation=overvalued"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            View All &rarr;
          </Link>
        </div>
        <CardGrid cards={overvalued} loading={loading} error={error} />
      </section>

      {/* Biggest Movers */}
      {summary?.biggestMovers && summary.biggestMovers.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-white mb-4">
            Biggest Price Movers (7d)
          </h2>
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Card</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase">Price</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase">7d Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {summary.biggestMovers.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {card.image_url && (
                          <img
                            src={card.image_url}
                            alt={card.name}
                            className="w-8 h-11 object-cover rounded"
                          />
                        )}
                        <span className="font-medium">{card.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-op-gold font-bold">
                      ${card.current_price?.toFixed(2) || 'N/A'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      card.change_7d > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {card.change_7d > 0 ? '+' : ''}{card.change_7d?.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Last Sync Info */}
      {summary?.lastSync && (
        <div className="text-sm text-gray-500 text-center">
          Last synced: {new Date(summary.lastSync.completedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'white' }) {
  const colorClasses = {
    white: 'text-white',
    green: 'text-green-400',
    red: 'text-red-400',
    gold: 'text-op-gold'
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default Home;
