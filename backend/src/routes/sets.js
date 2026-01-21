import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { calculateBoosterEV, getSetValuationSummary } from '../services/valuation.js';

const router = Router();

// GET /api/sets - List all One Piece sets
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        s.*,
        COUNT(DISTINCT c.id) as card_count,
        AVG(v.current_price) as avg_card_price
      FROM sets s
      LEFT JOIN cards c ON s.id = c.set_id
      LEFT JOIN variants v ON c.id = v.card_id
      WHERE s.game_id = 'one-piece-card-game'
      GROUP BY s.id
      ORDER BY s.release_date DESC
    `);

    const sets = stmt.all();
    res.json(sets);

  } catch (error) {
    console.error('Error fetching sets:', error);
    res.status(500).json({ error: 'Failed to fetch sets' });
  }
});

// GET /api/sets/:id - Get set details
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const stmt = db.prepare(`
      SELECT s.*, COUNT(DISTINCT c.id) as card_count
      FROM sets s
      LEFT JOIN cards c ON s.id = c.set_id
      WHERE s.id = ?
      GROUP BY s.id
    `);

    const set = stmt.get(id);

    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }

    // Get valuation summary
    const valuationSummary = getSetValuationSummary(id);

    res.json({
      ...set,
      valuation: valuationSummary
    });

  } catch (error) {
    console.error('Error fetching set:', error);
    res.status(500).json({ error: 'Failed to fetch set' });
  }
});

// GET /api/sets/:id/ev - Get EV analysis for a set
router.get('/:id/ev', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { box_price } = req.query;

    // Verify set exists
    const setStmt = db.prepare('SELECT * FROM sets WHERE id = ?');
    const set = setStmt.get(id);

    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }

    const boxPrice = box_price ? parseFloat(box_price) : null;
    const ev = calculateBoosterEV(id, boxPrice);

    if (!ev) {
      return res.json({
        setId: id,
        setName: set.name,
        error: 'Insufficient price data for EV calculation'
      });
    }

    res.json({
      setName: set.name,
      ...ev
    });

  } catch (error) {
    console.error('Error calculating EV:', error);
    res.status(500).json({ error: 'Failed to calculate EV' });
  }
});

// GET /api/sets/:id/cards - Get all cards in a set
router.get('/:id/cards', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { rarity, sort = 'number', order = 'asc' } = req.query;

    let query = `
      SELECT
        c.id, c.name, c.rarity, c.number, c.image_url,
        v.current_price, v.avg_30d, v.change_7d
      FROM cards c
      LEFT JOIN variants v ON c.id = v.card_id
      WHERE c.set_id = ?
    `;

    const params = [id];

    if (rarity) {
      query += ` AND c.rarity = ?`;
      params.push(rarity);
    }

    const sortColumns = {
      number: 'c.number',
      name: 'c.name',
      price: 'v.current_price',
      rarity: 'c.rarity'
    };

    const sortColumn = sortColumns[sort] || 'c.number';
    const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    const stmt = db.prepare(query);
    const cards = stmt.all(...params);

    res.json(cards);

  } catch (error) {
    console.error('Error fetching set cards:', error);
    res.status(500).json({ error: 'Failed to fetch set cards' });
  }
});

export default router;
