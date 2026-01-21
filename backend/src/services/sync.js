import { getDatabase } from '../config/database.js';
import justTCG from './justtcg.js';

const ONE_PIECE_GAME_ID = 'one-piece-card-game';

// Sync progress tracking
let syncInProgress = false;

function logSync(type, status, recordsSynced = 0) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO sync_log (sync_type, started_at, completed_at, records_synced, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  stmt.run(type, now, status === 'completed' ? now : null, recordsSynced, status);
}

// Sync sets from JustTCG
export async function syncSets() {
  console.log('Syncing sets...');
  logSync('sets', 'started');

  try {
    const db = getDatabase();
    const sets = await justTCG.getSets(ONE_PIECE_GAME_ID);

    const insertSet = db.prepare(`
      INSERT OR REPLACE INTO sets (id, name, game_id, release_date, set_value_usd)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Insert sets one by one (sql.js has transaction issues)
    for (const set of sets) {
      insertSet.run(
        set.id,
        set.name,
        ONE_PIECE_GAME_ID,
        set.release_date || set.releaseDate || null,
        set.set_value_usd || set.setValue || null
      );
    }

    logSync('sets', 'completed', sets.length);
    console.log(`Synced ${sets.length} sets`);

    return sets;
  } catch (error) {
    logSync('sets', 'failed');
    console.error('Failed to sync sets:', error.message);
    throw error;
  }
}

// Sync cards for a specific set
export async function syncSetCards(setId) {
  console.log(`Syncing cards for set: ${setId}...`);
  logSync(`cards:${setId}`, 'started');

  try {
    const db = getDatabase();
    const cards = await justTCG.getSetCards(setId);

    const insertCard = db.prepare(`
      INSERT OR REPLACE INTO cards (id, name, set_id, rarity, number, tcgplayer_id, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertVariant = db.prepare(`
      INSERT OR REPLACE INTO variants (
        id, card_id, condition, printing, current_price,
        avg_7d, avg_30d, avg_90d, change_24h, change_7d, change_30d, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Log first card structure to see available fields
    if (cards.length > 0) {
      console.log('Sample card fields:', Object.keys(cards[0]));
      if (cards[0].images) console.log('Images field:', cards[0].images);
      if (cards[0].image) console.log('Image field:', cards[0].image);
    }

    // Insert cards one by one (sql.js has transaction issues)
    for (const card of cards) {
      // Try multiple possible image field names
      const imageUrl = card.image_url || card.imageUrl || card.image ||
                       (card.images && (card.images.large || card.images.small || card.images.normal)) ||
                       null;

      insertCard.run(
        card.id,
        card.name,
        setId,
        card.rarity || null,
        card.number || card.collector_number || null,
        card.tcgplayer_id || card.tcgplayerId || null,
        imageUrl
      );

      // Insert variants if present
      if (card.variants && Array.isArray(card.variants)) {
        for (const variant of card.variants) {
          const variantId = `${card.id}-${variant.condition || 'nm'}-${variant.printing || 'standard'}`;
          insertVariant.run(
            variantId,
            card.id,
            variant.condition || 'Near Mint',
            variant.printing || 'Standard',
            variant.price || variant.market_price || variant.marketPrice || null,
            variant.avg_7d || variant.avg7d || variant.avg_7_day || variant.avg7Day || variant.avgPrice || variant.avgPrice7d || null,
            variant.avg_30d || variant.avg30d || variant.avg_30_day || variant.avg30Day || variant.avgPrice30d || null,
            variant.avg_90d || variant.avg90d || variant.avg_90_day || variant.avg90Day || variant.avgPrice90d || null,
            variant.change_24h || variant.change24h || variant.priceChange24hr || variant.priceChange24h || variant.price_change_24hr || null,
            variant.change_7d || variant.change7d || variant.priceChange7d || variant.price_change_7d || null,
            variant.change_30d || variant.change30d || variant.priceChange30d || variant.priceChange90d || variant.price_change_30d || null,
            Date.now()
          );
        }
      }
    }

    logSync(`cards:${setId}`, 'completed', cards.length);
    console.log(`Synced ${cards.length} cards for set ${setId}`);

    return cards;
  } catch (error) {
    logSync(`cards:${setId}`, 'failed');
    console.error(`Failed to sync cards for set ${setId}:`, error.message);
    throw error;
  }
}

// Batch update card prices
export async function syncCardPrices(cardIds) {
  if (!cardIds || cardIds.length === 0) return [];

  const db = getDatabase();

  // Process in batches of 20
  const batches = [];
  for (let i = 0; i < cardIds.length; i += 20) {
    batches.push(cardIds.slice(i, i + 20));
  }

  const results = [];
  const insertVariant = db.prepare(`
    INSERT OR REPLACE INTO variants (
      id, card_id, condition, printing, current_price,
      avg_7d, avg_30d, avg_90d, change_24h, change_7d, change_30d, last_updated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPriceHistory = db.prepare(`
    INSERT INTO price_history (variant_id, price, recorded_at)
    VALUES (?, ?, ?)
  `);

  for (const batch of batches) {
    try {
      const cards = await justTCG.batchGetCards(batch);

      // Insert without transaction (sql.js has issues)
      for (const card of cards) {
        if (card.variants && Array.isArray(card.variants)) {
          for (const variant of card.variants) {
            const variantId = `${card.id}-${variant.condition || 'nm'}-${variant.printing || 'standard'}`;
            const now = Date.now();

            insertVariant.run(
              variantId,
              card.id,
              variant.condition || 'Near Mint',
              variant.printing || 'Standard',
              variant.price || variant.market_price || variant.marketPrice || null,
              variant.avg_7d || variant.avg7d || variant.avg_7_day || variant.avg7Day || variant.avgPrice || variant.avgPrice7d || null,
              variant.avg_30d || variant.avg30d || variant.avg_30_day || variant.avg30Day || variant.avgPrice30d || null,
              variant.avg_90d || variant.avg90d || variant.avg_90_day || variant.avg90Day || variant.avgPrice90d || null,
              variant.change_24h || variant.change24h || variant.priceChange24hr || variant.priceChange24h || variant.price_change_24hr || null,
              variant.change_7d || variant.change7d || variant.priceChange7d || variant.price_change_7d || null,
              variant.change_30d || variant.change30d || variant.priceChange30d || variant.priceChange90d || variant.price_change_30d || null,
              now
            );

            // Record price history
            const price = variant.price || variant.market_price || variant.marketPrice;
            if (price) {
              insertPriceHistory.run(variantId, price, now);
            }
          }
        }
      }

      results.push(...cards);

    } catch (error) {
      console.error(`Failed to sync batch:`, error.message);
    }
  }

  return results;
}

// Get cards that need price updates (prioritized)
export function getCardsNeedingUpdate(limit = 20) {
  const db = getDatabase();
  // Priority order:
  // 1. Cards never synced (no variants)
  // 2. High-value cards not updated in 24h
  // 3. Cards not updated in 7+ days
  const stmt = db.prepare(`
    SELECT DISTINCT c.id, c.name, v.current_price, v.last_updated
    FROM cards c
    LEFT JOIN variants v ON c.id = v.card_id
    WHERE v.id IS NULL
       OR v.last_updated IS NULL
       OR (v.current_price > 5 AND v.last_updated < ?)
       OR v.last_updated < ?
    ORDER BY
      CASE
        WHEN v.id IS NULL THEN 0
        WHEN v.last_updated IS NULL THEN 1
        WHEN v.current_price > 10 THEN 2
        ELSE 3
      END,
      COALESCE(v.current_price, 0) DESC,
      v.last_updated ASC
    LIMIT ?
  `);

  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  return stmt.all(oneDayAgo, sevenDaysAgo, limit);
}

// Main scheduled sync function
export async function scheduledSync() {
  if (syncInProgress) {
    console.log('Sync already in progress, skipping...');
    return { skipped: true };
  }

  syncInProgress = true;
  const results = { sets: 0, cards: 0, priceUpdates: 0 };

  try {
    const db = getDatabase();
    const rateLimitStatus = justTCG.getRateLimitStatus();
    console.log(`Rate limit status: ${rateLimitStatus.dailyRemaining} requests remaining`);

    if (rateLimitStatus.dailyRemaining < 5) {
      console.log('Insufficient daily quota, skipping sync');
      return { skipped: true, reason: 'rate_limit' };
    }

    // Check if we have sets
    const existingSets = db.prepare('SELECT COUNT(*) as count FROM sets').get();

    if (existingSets.count === 0) {
      // Initial sync - get sets first
      const sets = await syncSets();
      results.sets = sets.length;

      // Use remaining quota for card syncs
      const remainingQuota = justTCG.getRateLimitStatus().dailyRemaining;

      if (remainingQuota > 0 && sets.length > 0) {
        // Sync cards for first set
        const cards = await syncSetCards(sets[0].id);
        results.cards = cards.length;
      }
    } else {
      // Daily sync - update prices for priority cards
      const cardsToUpdate = getCardsNeedingUpdate(20);

      if (cardsToUpdate.length > 0) {
        const cardIds = cardsToUpdate.map(c => c.id);
        const updated = await syncCardPrices(cardIds);
        results.priceUpdates = updated.length;
      }
    }

    console.log('Sync completed:', results);
    return results;

  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  } finally {
    syncInProgress = false;
  }
}

// Full initial sync (multi-day process)
export async function initialSync() {
  const db = getDatabase();
  console.log('Starting initial sync...');

  // Sync sets first
  const sets = await syncSets();

  // Get sync progress
  const syncedSets = new Set(
    db.prepare(`
      SELECT DISTINCT sync_type FROM sync_log
      WHERE sync_type LIKE 'cards:%' AND status = 'completed'
    `).all().map(r => r.sync_type.replace('cards:', ''))
  );

  // Find sets that haven't been synced yet
  const unsyncedSets = sets.filter(s => !syncedSets.has(s.id));
  console.log(`${unsyncedSets.length} sets need card sync`);

  // Sync as many sets as our rate limit allows
  let syncedCount = 0;
  for (const set of unsyncedSets) {
    const rateLimitStatus = justTCG.getRateLimitStatus();

    if (rateLimitStatus.dailyRemaining < 5) {
      console.log('Rate limit approaching, stopping initial sync');
      break;
    }

    try {
      await syncSetCards(set.id);
      syncedCount++;
    } catch (error) {
      console.error(`Failed to sync set ${set.id}:`, error.message);
    }
  }

  return {
    totalSets: sets.length,
    syncedSets: syncedCount,
    remainingSets: unsyncedSets.length - syncedCount
  };
}

// Force re-sync all sets (ignores sync log, useful for ensuring complete data)
export async function fullResync() {
  const db = getDatabase();
  console.log('Starting full resync of all sets...');

  // Sync sets first
  const sets = await syncSets();

  let syncedCount = 0;
  let totalCards = 0;

  for (const set of sets) {
    const rateLimitStatus = justTCG.getRateLimitStatus();

    if (rateLimitStatus.dailyRemaining < 5) {
      console.log(`Rate limit approaching (${rateLimitStatus.dailyRemaining} remaining), stopping sync`);
      console.log(`Progress: ${syncedCount}/${sets.length} sets, ${totalCards} cards`);
      return {
        completed: false,
        syncedSets: syncedCount,
        totalSets: sets.length,
        remainingSets: sets.length - syncedCount,
        totalCards,
        message: 'Rate limit reached, continue tomorrow'
      };
    }

    try {
      const cards = await syncSetCards(set.id);
      syncedCount++;
      totalCards += cards.length;
      console.log(`Progress: ${syncedCount}/${sets.length} sets`);
    } catch (error) {
      console.error(`Failed to sync set ${set.id}:`, error.message);
    }
  }

  return {
    completed: true,
    syncedSets: syncedCount,
    totalSets: sets.length,
    remainingSets: 0,
    totalCards
  };
}

// Continue syncing from where we left off (checks current card counts)
export async function continueSync() {
  const db = getDatabase();
  console.log('Checking for sets needing more cards...');

  // Get all sets
  const setsStmt = db.prepare('SELECT id, name FROM sets WHERE game_id = ?');
  const sets = setsStmt.all('one-piece-card-game');

  // Get current card counts per set
  const cardCountStmt = db.prepare('SELECT COUNT(*) as count FROM cards WHERE set_id = ?');

  let syncedCount = 0;
  let newCards = 0;

  for (const set of sets) {
    const rateLimitStatus = justTCG.getRateLimitStatus();

    if (rateLimitStatus.dailyRemaining < 5) {
      console.log(`Rate limit approaching, stopping. Progress: ${syncedCount} sets updated, ${newCards} new cards`);
      return {
        completed: false,
        setsUpdated: syncedCount,
        newCards,
        remainingQuota: rateLimitStatus.dailyRemaining
      };
    }

    const currentCount = cardCountStmt.get(set.id)?.count || 0;

    try {
      const cards = await syncSetCards(set.id);
      const newCount = cards.length;

      if (newCount > currentCount) {
        console.log(`${set.name}: ${currentCount} -> ${newCount} cards (+${newCount - currentCount})`);
        newCards += (newCount - currentCount);
        syncedCount++;
      }
    } catch (error) {
      console.error(`Failed to sync set ${set.id}:`, error.message);
    }
  }

  return {
    completed: true,
    setsUpdated: syncedCount,
    newCards,
    remainingQuota: justTCG.getRateLimitStatus().dailyRemaining
  };
}

export default {
  syncSets,
  syncSetCards,
  syncCardPrices,
  getCardsNeedingUpdate,
  scheduledSync,
  initialSync,
  fullResync,
  continueSync
};
