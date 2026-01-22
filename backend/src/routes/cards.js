import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { calculateCardValuation } from '../services/valuation.js';

const router = Router();

// Helper to get the best image URL for a card
// Prefers TCGPlayer images (unique per variant) over official images (shared per card number)
function getCardImageUrl(card) {
  if (card.tcgplayer_id) {
    return `https://tcgplayer-cdn.tcgplayer.com/product/${card.tcgplayer_id}_200w.jpg`;
  }
  return card.image_url;
}

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
      product_type, // 'cards' = actual cards, 'sealed' = booster boxes/packs/cases
      sort = 'name',
      order = 'asc',
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        c.id, c.name, c.rarity, c.number, c.image_url, c.tcgplayer_id,
        c.set_id, s.name as set_name,
        c.card_text, c.card_type, c.card_color, c.card_cost, c.card_power,
        c.life, c.counter_amount, c.attribute, c.sub_types, c.optcg_image_url,
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

    // Product type filter: 'cards' = actual cards, 'sealed' = booster boxes/packs/cases
    if (product_type === 'cards') {
      query += ` AND c.rarity != 'None'`;
    } else if (product_type === 'sealed') {
      query += ` AND c.rarity = 'None'`;
    }

    // Sorting - higher number = higher rarity for intuitive DESC sorting
    const rarityRank = `CASE c.rarity
      WHEN 'Treasure Rare' THEN 10
      WHEN 'Secret Rare' THEN 9
      WHEN 'Super Rare' THEN 8
      WHEN 'Rare' THEN 7
      WHEN 'Uncommon' THEN 6
      WHEN 'Common' THEN 5
      WHEN 'Leader' THEN 4
      WHEN 'DON!!' THEN 3
      WHEN 'Promo' THEN 2
      ELSE 1
    END`;

    const sortColumns = {
      name: 'c.name',
      price: 'v.current_price',
      rarity: rarityRank,
      deviation: '((v.current_price - v.avg_30d) / v.avg_30d * 100)',
      change: 'v.change_7d',
      // Sort by card number: extract numeric part after the dash (e.g., "ST22-001" -> 001)
      number: "CAST(SUBSTR(c.number, INSTR(c.number, '-') + 1) AS INTEGER)"
    };

    const sortColumn = sortColumns[sort] || 'c.name';
    const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Handle NULL values by putting them last for certain sort columns
    if (sort === 'number') {
      query += ` ORDER BY CASE WHEN c.number = 'N/A' OR c.number IS NULL THEN 1 ELSE 0 END, ${sortColumn} ${sortOrder}`;
    } else if (sort === 'price') {
      query += ` ORDER BY CASE WHEN v.current_price IS NULL THEN 1 ELSE 0 END, ${sortColumn} ${sortOrder}`;
    } else {
      query += ` ORDER BY ${sortColumn} ${sortOrder}`;
    }

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const stmt = db.prepare(query);
    const cards = stmt.all(...params);

    // Add valuation and resolve image URLs to each card
    const cardsWithValuation = cards.map(card => ({
      ...card,
      image_url: getCardImageUrl(card),
      valuation: card.current_price && card.avg_30d ? calculateCardValuation(card) : null
    }));

    // Get total count for pagination (with same filters)
    let countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM cards c
      JOIN sets s ON c.set_id = s.id
      LEFT JOIN variants v ON c.id = v.card_id
      WHERE 1=1
    `;
    const countParams = [];

    if (set_id) {
      countQuery += ` AND c.set_id = ?`;
      countParams.push(set_id);
    }
    if (rarity) {
      countQuery += ` AND c.rarity = ?`;
      countParams.push(rarity);
    }
    if (search) {
      countQuery += ` AND c.name LIKE ?`;
      countParams.push(`%${search}%`);
    }
    if (product_type === 'cards') {
      countQuery += ` AND c.rarity != 'None'`;
    } else if (product_type === 'sealed') {
      countQuery += ` AND c.rarity = 'None'`;
    }

    const countStmt = db.prepare(countQuery);
    const total = countStmt.get(...countParams)?.total || 0;

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

    // Get card details including gameplay data
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
      image_url: getCardImageUrl(card),
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
