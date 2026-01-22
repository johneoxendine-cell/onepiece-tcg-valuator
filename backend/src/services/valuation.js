import { getDatabase } from '../config/database.js';

// One Piece TCG Pull Rates (community estimates per box)
const PULL_RATES = {
  'Leader': 1,           // Guaranteed in starter deck
  'SEC': 0.4,            // ~1 per 2-3 boxes
  'Secret Rare': 0.4,
  'SR': 6,               // ~1 per 4 packs (6 per box of 24 packs)
  'Super Rare': 6,
  'R': 24,               // 1 per pack
  'Rare': 24,
  'UC': 72,              // ~3 per pack
  'Uncommon': 72,
  'C': 144,              // ~6 per pack
  'Common': 144,
  'Alt Art': 0.5,        // Variable, estimate
  'Manga': 0.3,          // Very rare art variants
  'SP': 0.2              // Special variants
};

// Deviation thresholds for valuation status
const OVERVALUED_THRESHOLD = 15;   // 15% above average
const UNDERVALUED_THRESHOLD = -15; // 15% below average

/**
 * Calculate valuation for a single card variant (historical method)
 */
export function calculateCardValuation(variant) {
  const { current_price, avg_30d, avg_7d, change_7d, change_30d } = variant;

  if (!current_price || !avg_30d || avg_30d === 0) {
    return null;
  }

  const deviation = ((current_price - avg_30d) / avg_30d) * 100;

  let status;
  if (deviation > OVERVALUED_THRESHOLD) {
    status = 'overvalued';
  } else if (deviation < UNDERVALUED_THRESHOLD) {
    status = 'undervalued';
  } else {
    status = 'fair';
  }

  // Calculate trend (is the price moving toward or away from average?)
  const trend = change_7d !== null ? (change_7d > 0 ? 'rising' : change_7d < 0 ? 'falling' : 'stable') : 'unknown';

  return {
    deviation: Math.round(deviation * 100) / 100,
    status,
    current_price,
    avg_30d,
    avg_7d,
    trend,
    change_7d,
    change_30d,
    method: 'historical'
  };
}

/**
 * Get rarity averages for a set (used for rarity-based valuation)
 */
export function getRarityAverages(setId = null) {
  const db = getDatabase();
  let query = `
    SELECT
      c.set_id,
      c.rarity,
      AVG(v.current_price) as avg_price,
      COUNT(*) as card_count,
      MIN(v.current_price) as min_price,
      MAX(v.current_price) as max_price
    FROM cards c
    JOIN variants v ON c.id = v.card_id
    WHERE v.current_price IS NOT NULL
      AND v.current_price > 0
      AND c.rarity IS NOT NULL
      AND c.rarity != 'None'
  `;

  const params = [];
  if (setId) {
    query += ` AND c.set_id = ?`;
    params.push(setId);
  }

  query += ` GROUP BY c.set_id, c.rarity`;

  const stmt = db.prepare(query);
  const results = stmt.all(...params);

  // Build lookup map: setId -> rarity -> stats
  const averages = {};
  for (const row of results) {
    if (!averages[row.set_id]) {
      averages[row.set_id] = {};
    }
    averages[row.set_id][row.rarity] = {
      avgPrice: row.avg_price,
      cardCount: row.card_count,
      minPrice: row.min_price,
      maxPrice: row.max_price
    };
  }

  return averages;
}

/**
 * Calculate rarity-based valuation (compares to same rarity average in set)
 */
export function calculateRarityValuation(card, rarityAverages) {
  const { current_price, set_id, rarity } = card;

  if (!current_price || !rarity || rarity === 'None') {
    return null;
  }

  const setAverages = rarityAverages[set_id];
  if (!setAverages || !setAverages[rarity]) {
    return null;
  }

  const rarityStats = setAverages[rarity];
  const avgPrice = rarityStats.avgPrice;

  if (!avgPrice || avgPrice === 0) {
    return null;
  }

  const deviation = ((current_price - avgPrice) / avgPrice) * 100;

  let status;
  if (deviation > OVERVALUED_THRESHOLD) {
    status = 'overvalued';
  } else if (deviation < UNDERVALUED_THRESHOLD) {
    status = 'undervalued';
  } else {
    status = 'fair';
  }

  return {
    deviation: Math.round(deviation * 100) / 100,
    status,
    current_price,
    rarity_avg: Math.round(avgPrice * 100) / 100,
    rarity_min: rarityStats.minPrice,
    rarity_max: rarityStats.maxPrice,
    cards_in_rarity: rarityStats.cardCount,
    method: 'rarity_comparison'
  };
}

/**
 * Get undervalued cards (uses rarity-based comparison)
 */
export function getUndervaluedCards(limit = 50, setId = null, minPrice = 0.5) {
  const db = getDatabase();

  // Get rarity averages for comparison
  const rarityAverages = getRarityAverages(setId);

  // Query cards with their rarity averages via subquery
  let query = `
    SELECT
      c.id, c.name, c.rarity, c.number, c.image_url,
      c.set_id, s.name as set_name,
      v.id as variant_id, v.condition, v.printing,
      v.current_price,
      rarity_avg.avg_price as rarity_avg_price,
      ((v.current_price - rarity_avg.avg_price) / rarity_avg.avg_price * 100) as deviation
    FROM cards c
    JOIN variants v ON c.id = v.card_id
    JOIN sets s ON c.set_id = s.id
    JOIN (
      SELECT c2.set_id, c2.rarity, AVG(v2.current_price) as avg_price
      FROM cards c2
      JOIN variants v2 ON c2.id = v2.card_id
      WHERE v2.current_price IS NOT NULL AND v2.current_price > 0
        AND c2.rarity IS NOT NULL AND c2.rarity != 'None'
      GROUP BY c2.set_id, c2.rarity
    ) rarity_avg ON c.set_id = rarity_avg.set_id AND c.rarity = rarity_avg.rarity
    WHERE v.current_price IS NOT NULL
      AND v.current_price >= ?
      AND c.rarity IS NOT NULL
      AND c.rarity != 'None'
      AND ((v.current_price - rarity_avg.avg_price) / rarity_avg.avg_price * 100) < ?
  `;

  const params = [minPrice, UNDERVALUED_THRESHOLD];

  if (setId) {
    query += ` AND c.set_id = ?`;
    params.push(setId);
  }

  query += ` ORDER BY deviation ASC LIMIT ?`;
  params.push(limit);

  const stmt = db.prepare(query);
  const cards = stmt.all(...params);

  return cards.map(card => ({
    ...card,
    valuation: calculateRarityValuation(card, rarityAverages)
  }));
}

/**
 * Get overvalued cards (uses rarity-based comparison)
 */
export function getOvervaluedCards(limit = 50, setId = null, minPrice = 0.5) {
  const db = getDatabase();

  // Get rarity averages for comparison
  const rarityAverages = getRarityAverages(setId);

  // Query cards with their rarity averages via subquery
  let query = `
    SELECT
      c.id, c.name, c.rarity, c.number, c.image_url,
      c.set_id, s.name as set_name,
      v.id as variant_id, v.condition, v.printing,
      v.current_price,
      rarity_avg.avg_price as rarity_avg_price,
      ((v.current_price - rarity_avg.avg_price) / rarity_avg.avg_price * 100) as deviation
    FROM cards c
    JOIN variants v ON c.id = v.card_id
    JOIN sets s ON c.set_id = s.id
    JOIN (
      SELECT c2.set_id, c2.rarity, AVG(v2.current_price) as avg_price
      FROM cards c2
      JOIN variants v2 ON c2.id = v2.card_id
      WHERE v2.current_price IS NOT NULL AND v2.current_price > 0
        AND c2.rarity IS NOT NULL AND c2.rarity != 'None'
      GROUP BY c2.set_id, c2.rarity
    ) rarity_avg ON c.set_id = rarity_avg.set_id AND c.rarity = rarity_avg.rarity
    WHERE v.current_price IS NOT NULL
      AND v.current_price >= ?
      AND c.rarity IS NOT NULL
      AND c.rarity != 'None'
      AND ((v.current_price - rarity_avg.avg_price) / rarity_avg.avg_price * 100) > ?
  `;

  const params = [minPrice, OVERVALUED_THRESHOLD];

  if (setId) {
    query += ` AND c.set_id = ?`;
    params.push(setId);
  }

  query += ` ORDER BY deviation DESC LIMIT ?`;
  params.push(limit);

  const stmt = db.prepare(query);
  const cards = stmt.all(...params);

  return cards.map(card => ({
    ...card,
    valuation: calculateRarityValuation(card, rarityAverages)
  }));
}

/**
 * Calculate Expected Value (EV) for a booster box
 */
export function calculateBoosterEV(setId, boxPrice = null) {
  const db = getDatabase();
  // Get all cards in set with prices and rarities
  const stmt = db.prepare(`
    SELECT
      c.id, c.name, c.rarity, c.image_url,
      v.current_price, v.avg_30d
    FROM cards c
    JOIN variants v ON c.id = v.card_id
    WHERE c.set_id = ?
      AND v.current_price IS NOT NULL
      AND v.condition = 'Near Mint'
    ORDER BY v.current_price DESC
  `);

  const cards = stmt.all(setId);

  if (cards.length === 0) {
    return null;
  }

  // Group cards by rarity
  const cardsByRarity = {};
  for (const card of cards) {
    const rarity = normalizeRarity(card.rarity);
    if (!cardsByRarity[rarity]) {
      cardsByRarity[rarity] = [];
    }
    cardsByRarity[rarity].push(card);
  }

  // Calculate EV by rarity
  let totalEV = 0;
  const evBreakdown = {};

  for (const [rarity, rarityCards] of Object.entries(cardsByRarity)) {
    const pullRate = PULL_RATES[rarity] || 1;
    const avgPrice = rarityCards.reduce((sum, c) => sum + (c.current_price || 0), 0) / rarityCards.length;

    // EV for this rarity = average card price * expected pulls per box
    const rarityEV = avgPrice * pullRate;
    evBreakdown[rarity] = {
      cardCount: rarityCards.length,
      avgPrice: Math.round(avgPrice * 100) / 100,
      pullRate,
      ev: Math.round(rarityEV * 100) / 100
    };
    totalEV += rarityEV;
  }

  // Calculate valuation vs box price
  let valuation = null;
  if (boxPrice && boxPrice > 0) {
    const evRatio = totalEV / boxPrice;
    valuation = {
      boxPrice,
      evRatio: Math.round(evRatio * 100) / 100,
      profit: Math.round((totalEV - boxPrice) * 100) / 100,
      status: evRatio > 1.1 ? 'good_value' : evRatio < 0.9 ? 'poor_value' : 'fair_value'
    };
  }

  // Get top value cards
  const topCards = cards.slice(0, 10).map(c => ({
    name: c.name,
    rarity: c.rarity,
    price: c.current_price,
    image_url: c.image_url
  }));

  return {
    setId,
    totalEV: Math.round(totalEV * 100) / 100,
    cardCount: cards.length,
    evBreakdown,
    valuation,
    topCards
  };
}

/**
 * Normalize rarity strings to standard format
 */
function normalizeRarity(rarity) {
  if (!rarity) return 'Unknown';

  const upper = rarity.toUpperCase().trim();

  // Map common variations
  const rarityMap = {
    'SECRET RARE': 'SEC',
    'SUPER RARE': 'SR',
    'RARE': 'R',
    'UNCOMMON': 'UC',
    'COMMON': 'C',
    'LEADER': 'Leader',
    'SPECIAL': 'SP',
    'ALTERNATE ART': 'Alt Art',
    'MANGA': 'Manga'
  };

  return rarityMap[upper] || rarity;
}

/**
 * Get valuation summary for a set (uses rarity-based comparison)
 */
export function getSetValuationSummary(setId) {
  const db = getDatabase();

  // Get rarity-based summary (exclude sealed products)
  const summaryStmt = db.prepare(`
    SELECT
      COUNT(*) as total_cards,
      SUM(v.current_price) as total_value,
      AVG(v.current_price) as avg_price,
      SUM(CASE
        WHEN rarity_avg.avg_price > 0 AND ((v.current_price - rarity_avg.avg_price) / rarity_avg.avg_price * 100) < ?
        THEN 1 ELSE 0
      END) as undervalued_count,
      SUM(CASE
        WHEN rarity_avg.avg_price > 0 AND ((v.current_price - rarity_avg.avg_price) / rarity_avg.avg_price * 100) > ?
        THEN 1 ELSE 0
      END) as overvalued_count
    FROM cards c
    JOIN variants v ON c.id = v.card_id
    LEFT JOIN (
      SELECT c2.set_id, c2.rarity, AVG(v2.current_price) as avg_price
      FROM cards c2
      JOIN variants v2 ON c2.id = v2.card_id
      WHERE v2.current_price IS NOT NULL AND v2.current_price > 0
        AND c2.rarity IS NOT NULL AND c2.rarity != 'None'
      GROUP BY c2.set_id, c2.rarity
    ) rarity_avg ON c.set_id = rarity_avg.set_id AND c.rarity = rarity_avg.rarity
    WHERE c.set_id = ?
      AND v.current_price IS NOT NULL
      AND c.rarity != 'None'
  `);

  const summary = summaryStmt.get(UNDERVALUED_THRESHOLD, OVERVALUED_THRESHOLD, setId);

  // Get top 10 most valuable cards (exclude sealed products)
  const topCardsStmt = db.prepare(`
    SELECT
      c.id, c.name, c.rarity, c.number, c.image_url, c.tcgplayer_id,
      v.current_price, v.change_7d, v.printing
    FROM cards c
    JOIN variants v ON c.id = v.card_id
    WHERE c.set_id = ?
      AND v.current_price IS NOT NULL
      AND c.rarity != 'None'
    ORDER BY v.current_price DESC
    LIMIT 10
  `);

  const topCards = topCardsStmt.all(setId);

  // Calculate top 10 total value
  const top10Value = topCards.reduce((sum, card) => sum + (card.current_price || 0), 0);

  // Add image_url helper for top cards (use TCGPlayer CDN if available)
  const topCardsWithImages = topCards.map(card => ({
    ...card,
    image_url: card.tcgplayer_id
      ? `https://tcgplayer-cdn.tcgplayer.com/product/${card.tcgplayer_id}_200w.jpg`
      : card.image_url
  }));

  return {
    ...summary,
    top10_value: Math.round(top10Value * 100) / 100,
    top_cards: topCardsWithImages
  };
}

export default {
  calculateCardValuation,
  calculateRarityValuation,
  getRarityAverages,
  getUndervaluedCards,
  getOvervaluedCards,
  calculateBoosterEV,
  getSetValuationSummary,
  PULL_RATES
};
