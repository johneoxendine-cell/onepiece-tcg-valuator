import 'dotenv/config';
import { initializeDatabase, getDatabase } from './src/config/database.js';
import { syncCardPrices } from './src/services/sync.js';

async function updateHistoricalData() {
  console.log('Initializing database...');
  await initializeDatabase();
  const db = getDatabase();

  // Get all card IDs that have variants but might be missing historical data
  // For testing, limit to first 100 cards
  const testMode = process.argv.includes('--test') || process.argv.includes('-t');
  const limit = testMode ? 100 : null;
  
  let allCards;
  if (limit) {
    allCards = db.prepare(`
      SELECT DISTINCT c.id, c.name
      FROM cards c
      JOIN variants v ON c.id = v.card_id
      WHERE v.current_price IS NOT NULL
      ORDER BY c.name
      LIMIT ?
    `).all(limit);
    console.log(`TEST MODE: Found ${allCards.length} cards to update (limited)...\n`);
  } else {
    allCards = db.prepare(`
      SELECT DISTINCT c.id, c.name
      FROM cards c
      JOIN variants v ON c.id = v.card_id
      WHERE v.current_price IS NOT NULL
      ORDER BY c.name
    `).all();
    console.log(`Found ${allCards.length} cards to update...\n`);
  }

  const total = allCards.length;
  let updated = 0;
  let errors = 0;

  // Process in batches of 20 (API limit)
  for (let i = 0; i < allCards.length; i += 20) {
    const batch = allCards.slice(i, i + 20);
    const cardIds = batch.map(c => c.id);

    console.log(`\nProcessing batch ${Math.floor(i / 20) + 1} (${i + 1}-${Math.min(i + 20, total)} of ${total})...`);
    console.log(`Cards: ${batch.map(c => c.name).join(', ')}`);

    try {
      const result = await syncCardPrices(cardIds);
      updated += result.length;
      console.log(`✓ Updated ${result.length} cards in this batch`);
      
      // Show sample of updated data
      if (result.length > 0 && result[0].variants) {
        const sampleVariant = result[0].variants[0];
        if (sampleVariant) {
          console.log(`  Sample: ${result[0].name} - ${sampleVariant.condition}`);
          console.log(`    Price: $${sampleVariant.price || sampleVariant.market_price || 'N/A'}`);
          console.log(`    Avg 7d: ${sampleVariant.avg_7d || sampleVariant.avg7d || sampleVariant.priceChange7d || 'N/A'}`);
          console.log(`    Avg 30d: ${sampleVariant.avg_30d || sampleVariant.avg30d || 'N/A'}`);
        }
      }

      // Small delay between batches to be respectful of API
      if (i + 20 < allCards.length) {
        console.log('Waiting 7 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 7000));
      }
    } catch (error) {
      errors++;
      console.error(`✗ Error updating batch: ${error.message}`);
    }
  }

  // Check final statistics
  const finalStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN avg_7d IS NOT NULL THEN 1 ELSE 0 END) as has_avg7d,
      SUM(CASE WHEN avg_30d IS NOT NULL THEN 1 ELSE 0 END) as has_avg30d,
      SUM(CASE WHEN change_24h IS NOT NULL THEN 1 ELSE 0 END) as has_change24h,
      SUM(CASE WHEN change_7d IS NOT NULL THEN 1 ELSE 0 END) as has_change7d
    FROM variants 
    WHERE current_price IS NOT NULL
  `).get();

  console.log('\n' + '='.repeat(60));
  console.log('UPDATE COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total cards processed: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nFinal statistics:`);
  console.log(`  Total variants with prices: ${finalStats.total}`);
  console.log(`  Variants with avg_7d: ${finalStats.has_avg7d} (${((finalStats.has_avg7d / finalStats.total) * 100).toFixed(1)}%)`);
  console.log(`  Variants with avg_30d: ${finalStats.has_avg30d} (${((finalStats.has_avg30d / finalStats.total) * 100).toFixed(1)}%)`);
  console.log(`  Variants with change_24h: ${finalStats.has_change24h} (${((finalStats.has_change24h / finalStats.total) * 100).toFixed(1)}%)`);
  console.log(`  Variants with change_7d: ${finalStats.has_change7d} (${((finalStats.has_change7d / finalStats.total) * 100).toFixed(1)}%)`);
  console.log('='.repeat(60));

  process.exit(0);
}

updateHistoricalData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
