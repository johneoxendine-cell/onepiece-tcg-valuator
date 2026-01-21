import { Router } from 'express';
import {
  getUndervaluedCards,
  getOvervaluedCards,
  getSetValuationSummary
} from '../services/valuation.js';
import { getDatabase } from '../config/database.js';

const router = Router();

// GET /api/valuation/undervalued - Get top undervalued cards
router.get('/undervalued', (req, res) => {
  try {
    const {
      limit = 50,
      set_id,
      min_price = 0.5
    } = req.query;

    const cards = getUndervaluedCards(
      parseInt(limit),
      set_id || null,
      parseFloat(min_price)
    );

    res.json({
      cards,
      count: cards.length,
      criteria: {
        threshold: '-15%',
        description: 'Cards priced 15%+ below their rarity average in the same set'
      }
    });

  } catch (error) {
    console.error('Error fetching undervalued cards:', error);
    res.status(500).json({ error: 'Failed to fetch undervalued cards' });
  }
});

// GET /api/valuation/overvalued - Get top overvalued cards
router.get('/overvalued', (req, res) => {
  try {
    const {
      limit = 50,
      set_id,
      min_price = 0.5
    } = req.query;

    const cards = getOvervaluedCards(
      parseInt(limit),
      set_id || null,
      parseFloat(min_price)
    );

    res.json({
      cards,
      count: cards.length,
      criteria: {
        threshold: '+15%',
        description: 'Cards priced 15%+ above their rarity average in the same set'
      }
    });

  } catch (error) {
    console.error('Error fetching overvalued cards:', error);
    res.status(500).json({ error: 'Failed to fetch overvalued cards' });
  }
});

// GET /api/valuation/summary - Get overall market summary
router.get('/summary', (req, res) => {
  try {
    const db = getDatabase();

    // Get overall statistics with rarity-based valuation
    const statsStmt = db.prepare(`
      SELECT
        COUNT(DISTINCT c.id) as total_cards,
        COUNT(DISTINCT s.id) as total_sets,
        SUM(CASE WHEN v.current_price IS NOT NULL THEN 1 ELSE 0 END) as cards_with_prices,
        AVG(v.current_price) as avg_price,
        MAX(v.current_price) as max_price,
        SUM(CASE
          WHEN v.current_price IS NOT NULL AND rarity_avg.avg_price > 0
          AND ((v.current_price - rarity_avg.avg_price) / rarity_avg.avg_price * 100) < -15 THEN 1 ELSE 0
        END) as undervalued_count,
        SUM(CASE
          WHEN v.current_price IS NOT NULL AND rarity_avg.avg_price > 0
          AND ((v.current_price - rarity_avg.avg_price) / rarity_avg.avg_price * 100) > 15 THEN 1 ELSE 0
        END) as overvalued_count
      FROM cards c
      LEFT JOIN variants v ON c.id = v.card_id
      JOIN sets s ON c.set_id = s.id
      LEFT JOIN (
        SELECT c2.set_id, c2.rarity, AVG(v2.current_price) as avg_price
        FROM cards c2
        JOIN variants v2 ON c2.id = v2.card_id
        WHERE v2.current_price IS NOT NULL AND v2.current_price > 0
          AND c2.rarity IS NOT NULL AND c2.rarity != 'None'
        GROUP BY c2.set_id, c2.rarity
      ) rarity_avg ON c.set_id = rarity_avg.set_id AND c.rarity = rarity_avg.rarity
    `);

    const stats = statsStmt.get();

    // Get recent price movements
    const moversStmt = db.prepare(`
      SELECT
        c.id, c.name, c.image_url, c.set_id,
        v.current_price, v.change_7d, v.change_30d
      FROM cards c
      JOIN variants v ON c.id = v.card_id
      WHERE v.change_7d IS NOT NULL
      ORDER BY ABS(v.change_7d) DESC
      LIMIT 10
    `);

    const biggestMovers = moversStmt.all();

    // Get last sync info
    const syncStmt = db.prepare(`
      SELECT * FROM sync_log
      ORDER BY started_at DESC
      LIMIT 1
    `);

    const lastSync = syncStmt.get();

    res.json({
      stats: {
        totalCards: stats?.total_cards || 0,
        totalSets: stats?.total_sets || 0,
        cardsWithPrices: stats?.cards_with_prices || 0,
        avgPrice: Math.round((stats?.avg_price || 0) * 100) / 100,
        maxPrice: stats?.max_price || 0,
        undervaluedCount: stats?.undervalued_count || 0,
        overvaluedCount: stats?.overvalued_count || 0
      },
      biggestMovers,
      lastSync: lastSync ? {
        type: lastSync.sync_type,
        completedAt: lastSync.completed_at,
        status: lastSync.status
      } : null
    });

  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET /api/valuation/trending - Get trending cards (biggest price changes)
router.get('/trending', (req, res) => {
  try {
    const db = getDatabase();
    const { direction = 'up', limit = 20 } = req.query;

    const order = direction === 'down' ? 'ASC' : 'DESC';

    const stmt = db.prepare(`
      SELECT
        c.id, c.name, c.rarity, c.number, c.image_url,
        c.set_id, s.name as set_name,
        v.current_price, v.avg_7d, v.avg_30d,
        v.change_7d, v.change_30d
      FROM cards c
      JOIN variants v ON c.id = v.card_id
      JOIN sets s ON c.set_id = s.id
      WHERE v.change_7d IS NOT NULL
        AND v.current_price >= 1
      ORDER BY v.change_7d ${order}
      LIMIT ?
    `);

    const cards = stmt.all(parseInt(limit));

    res.json({
      direction,
      cards,
      count: cards.length
    });

  } catch (error) {
    console.error('Error fetching trending cards:', error);
    res.status(500).json({ error: 'Failed to fetch trending cards' });
  }
});

export default router;
