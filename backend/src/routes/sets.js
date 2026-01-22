import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { calculateBoosterEV, getSetValuationSummary } from '../services/valuation.js';

const router = Router();

// Map set names to official set codes based on onepiece-cardgame.com
const SET_CODE_MAP = {
  // Booster Packs (OP series)
  'Romance Dawn': 'OP-01',
  'Paramount War': 'OP-02',
  'Pillars of Strength': 'OP-03',
  'Kingdoms of Intrigue': 'OP-04',
  'Awakening of the New Era': 'OP-05',
  'Wings of the Captain': 'OP-06',
  '500 Years in the Future': 'OP-07',
  'Two Legends': 'OP-08',
  'Emperors in the New World': 'OP-09',
  'Royal Blood': 'OP-10',
  'A Fist of Divine Speed': 'OP-11',
  'Legacy of the Master': 'OP-12',
  'Carrying On His Will': 'OP-13',
  "The Azure Sea's Seven": 'OP-14',
  // Extra Boosters
  'Extra Booster: Memorial Collection': 'EB-01',
  'Extra Booster: Anime 25th Collection': 'EB-02',
  'Extra Booster: One Piece Heroines Edition': 'EB-03',
  // Other
  'Ultra Deck: The Three Brothers': 'ST-13',
  'Learn Together Deck Set': 'ST-21',
  'One Piece Collection Sets': 'PROMO',
  'Revision Pack Cards': 'PROMO',
};

// Extract set code from name
function getSetCode(name) {
  // Premium Boosters - check Vol. 2 first (more specific)
  if (name.includes('Premium Booster') && name.includes('Vol. 2')) return 'PRB-02';
  if (name.includes('Premium Booster') && name.includes('Best')) return 'PRB-01';

  // Check direct mapping
  for (const [key, code] of Object.entries(SET_CODE_MAP)) {
    if (name.includes(key)) return code;
  }

  // Extract Starter Deck number
  const starterMatch = name.match(/Starter Deck (\d+)/i);
  if (starterMatch) {
    return `ST-${starterMatch[1].padStart(2, '0')}`;
  }

  // Extract Starter Deck EX
  if (name.includes('Starter Deck EX')) return 'ST-EX';

  // Ultra Deck
  if (name.includes('Ultra Deck: The Three Captains')) return 'ST-10';
  if (name.includes('Ultra Deck: The Three Brothers')) return 'ST-13';

  // Pre-release / Promo
  if (name.includes('Pre-Release') || name.includes('Promotion') || name.includes('Demo Deck')) {
    return 'PROMO';
  }

  // Tournament cards
  if (name.includes('Tournament Cards') || name.includes('Release Event')) {
    return 'EVENT';
  }

  return null;
}

// Get booster box image URL for a set code
function getBoxImageUrl(code) {
  if (!code) return null;

  // Convert set code to URL format (OP-01 -> op01, EB-01 -> eb01, etc.)
  const urlCode = code.toLowerCase().replace('-', '');

  // Booster packs, extra boosters, and premium boosters
  if (code.startsWith('OP-') || code.startsWith('EB-') || code.startsWith('PRB-')) {
    return `https://onepiece-cardgame.com/images/products/boosters/${urlCode}/img_thumbnail.png`;
  }

  // Starter decks use grouped folders with different naming patterns
  if (code.startsWith('ST-')) {
    const baseUrl = 'https://onepiece-cardgame.com/images/products/decks';

    // ST-EX (Gear 5 EX) - special case
    if (code === 'ST-EX') {
      return `${baseUrl}/st21/img_thumbnail.png`;
    }

    const num = parseInt(code.split('-')[1]) || 0;

    // Grouped folders with _st## suffix in filename
    if (num >= 1 && num <= 4) {
      return `${baseUrl}/st01-04/img_thumbnail_st${String(num).padStart(2, '0')}.png`;
    }
    if (num >= 15 && num <= 20) {
      return `${baseUrl}/st15-20/img_thumbnail_st${String(num).padStart(2, '0')}.png`;
    }
    if (num >= 23 && num <= 28) {
      return `${baseUrl}/st23-28/img_thumbnail_st${String(num).padStart(2, '0')}.png`;
    }

    // Individual folders with simple img_thumbnail.png
    // ST-05 to ST-14, ST-21, ST-22, ST-29
    if ((num >= 5 && num <= 14) || num === 21 || num === 22 || num === 29) {
      return `${baseUrl}/st${String(num).padStart(2, '0')}/img_thumbnail.png`;
    }

    return null;
  }

  return null;
}

// Get category and sort order for a set
function getSetSortInfo(name, code) {
  if (!code) return { category: 99, order: 0 };

  if (code.startsWith('OP-')) {
    const num = parseInt(code.split('-')[1]) || 0;
    return { category: 1, order: 100 - num }; // Boosters first, newest (higher num) first
  }
  if (code.startsWith('ST-')) {
    const num = code === 'ST-EX' ? 99 : (parseInt(code.split('-')[1]) || 0);
    return { category: 2, order: 100 - num }; // Starters second
  }
  if (code.startsWith('EB-')) {
    const num = parseInt(code.split('-')[1]) || 0;
    return { category: 3, order: 100 - num }; // Extra boosters
  }
  if (code.startsWith('PRB-')) {
    const num = parseInt(code.split('-')[1]) || 0;
    return { category: 4, order: 100 - num }; // Premium boosters
  }
  if (code === 'EVENT') {
    return { category: 5, order: 0 }; // Event cards
  }
  if (code === 'PROMO') {
    return { category: 6, order: 0 }; // Promos last
  }

  return { category: 99, order: 0 };
}

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
    `);

    const sets = stmt.all();

    // Add set codes, box images, and sort info
    const setsWithCodes = sets.map(set => {
      const set_code = getSetCode(set.name);
      const sortInfo = getSetSortInfo(set.name, set_code);
      const image_url = getBoxImageUrl(set_code);
      return {
        ...set,
        set_code,
        image_url,
        _category: sortInfo.category,
        _order: sortInfo.order
      };
    });

    // Sort by category, then by order (newest first within category)
    setsWithCodes.sort((a, b) => {
      if (a._category !== b._category) return a._category - b._category;
      return a._order - b._order;
    });

    // Remove internal sort fields
    const result = setsWithCodes.map(({ _category, _order, ...set }) => set);

    res.json(result);

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
