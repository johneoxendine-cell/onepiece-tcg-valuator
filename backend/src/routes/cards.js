import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { calculateCardValuation } from '../services/valuation.js';

const router = Router();

// GET /api/cards - List cards with filters
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const {
      set_id,
      rarity,
      valuation,
      min_price,
      max_price,
      search,
      sort = 'name',
      order = 'asc',
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        c.id, c.name, c.rarity, c.number, c.image_url,
        c.set_id, s.name as set_name,
        v.id as variant_id, v.condition, v.printing,
        v.current_price, v.avg_7d, v.avg_30d, v.avg_90d,
        v.change_24h, v.change_7d, v.change_30d, v.last_updated
      FROM cards c
      JOIN sets s ON c.set_id = s.id
      LEFT JOIN variants v ON c.id = v.card_id
      WHERE 1=1
        AND (v.id IS NULL OR v.id = (
          SELECT v2.id
          FROM variants v2
          WHERE v2.card_id = c.id
          ORDER BY 
            CASE WHEN v2.avg_30d IS NOT NULL THEN 0 ELSE 1 END,
            CASE WHEN v2.current_price IS NOT NULL THEN 0 ELSE 1 END,
            v2.last_updated DESC
          LIMIT 1
        ))
    `;

    const params = [];

    // Apply filters
    if (set_id) {
      query += ` AND c.set_id = ?`;
      params.push(set_id);
    }

    if (rarity) {
      query += ` AND c.rarity = ?`;
      params.push(rarity);
    }

    if (min_price) {
      query += ` AND v.current_price >= ?`;
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      query += ` AND v.current_price <= ?`;
      params.push(parseFloat(max_price));
    }

    if (search) {
      query += ` AND c.name LIKE ?`;
      params.push(`%${search}%`);
    }

    // Valuation filter
    if (valuation === 'undervalued') {
      query += ` AND v.current_price IS NOT NULL AND v.avg_30d IS NOT NULL AND v.avg_30d > 0
                 AND ((v.current_price - v.avg_30d) / v.avg_30d * 100) < -15`;
    } else if (valuation === 'overvalued') {
      query += ` AND v.current_price IS NOT NULL AND v.avg_30d IS NOT NULL AND v.avg_30d > 0
                 AND ((v.current_price - v.avg_30d) / v.avg_30d * 100) > 15`;
    }

    // Sorting
    const sortColumns = {
      name: 'c.name',
      price: 'v.current_price',
      rarity: 'c.rarity',
      deviation: '((v.current_price - v.avg_30d) / v.avg_30d * 100)',
      change: 'v.change_7d',
      // Sort by card number: extract numeric part after the dash (e.g., "ST22-001" -> 001)
      number: "CAST(SUBSTR(c.number, INSTR(c.number, '-') + 1) AS INTEGER)"
    };

    const sortColumn = sortColumns[sort] || 'c.name';
    const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // For number sort, handle N/A values by putting them last
    if (sort === 'number') {
      query += ` ORDER BY CASE WHEN c.number = 'N/A' OR c.number IS NULL THEN 1 ELSE 0 END, ${sortColumn} ${sortOrder}`;
    } else {
      query += ` ORDER BY ${sortColumn} ${sortOrder}`;
    }

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const stmt = db.prepare(query);
    const cards = stmt.all(...params);

    // Add valuation to each card
    const cardsWithValuation = cards.map(card => ({
      ...card,
      valuation: card.current_price && card.avg_30d ? calculateCardValuation(card) : null
    }));

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM cards c
      LEFT JOIN variants v ON c.id = v.card_id
      WHERE 1=1
    `;

    const total = db.prepare(countQuery).get()?.total || 0;

    res.json({
      cards: cardsWithValuation,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// GET /api/cards/:id - Get single card with all variants
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // Get card details
    const cardStmt = db.prepare(`
      SELECT c.*, s.name as set_name
      FROM cards c
      JOIN sets s ON c.set_id = s.id
      WHERE c.id = ?
    `);
    const card = cardStmt.get(id);

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Get all variants
    const variantsStmt = db.prepare(`
      SELECT * FROM variants WHERE card_id = ?
    `);
    const variants = variantsStmt.all(id);

    // Add valuation to each variant
    const variantsWithValuation = variants.map(v => ({
      ...v,
      valuation: calculateCardValuation(v)
    }));

    // Get price history for primary variant
    const historyStmt = db.prepare(`
      SELECT price, recorded_at
      FROM price_history
      WHERE variant_id = ?
      ORDER BY recorded_at DESC
      LIMIT 30
    `);
    const priceHistory = variants.length > 0 ? historyStmt.all(variants[0].id) : [];

    res.json({
      ...card,
      variants: variantsWithValuation,
      priceHistory
    });

  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// GET /api/cards/rarities - Get all unique rarities
router.get('/meta/rarities', (req, res) => {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT DISTINCT rarity FROM cards WHERE rarity IS NOT NULL ORDER BY rarity
    `);
    const rarities = stmt.all().map(r => r.rarity);
    res.json(rarities);
  } catch (error) {
    console.error('Error fetching rarities:', error);
    res.status(500).json({ error: 'Failed to fetch rarities' });
  }
});

export default router;
