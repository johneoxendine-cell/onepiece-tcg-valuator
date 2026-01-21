import 'dotenv/config';
import { initializeDatabase, getDatabase } from './src/config/database.js';
import { syncSetCards } from './src/services/sync.js';

async function syncHistoricalData() {
  console.log('Initializing database...');
  await initializeDatabase();
  const db = getDatabase();

  // Get all sets
  const sets = db.prepare('SELECT id, name FROM sets ORDER BY name').all();
  console.log(`Found ${sets.length} sets to sync...\n`);

  let synced = 0;
  let errors = 0;

  for (const set of sets) {
    console.log(`\nSyncing set: ${set.name} (${set.id})...`);
    try {
      const cards = await syncSetCards(set.id);
      synced++;
      console.log(`✓ Synced ${cards.length} cards from ${set.name}`);
      
      // Small delay between sets
      if (synced < sets.length) {
        console.log('Waiting 7 seconds before next set...');
        await new Promise(resolve => setTimeout(resolve, 7000));
      }
    } catch (error) {
      errors++;
      console.error(`✗ Error syncing set ${set.name}: ${error.message}`);
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
  console.log('SYNC COMPLETE');
  console.log('='.repeat(60));
  console.log(`Sets synced: ${synced}/${sets.length}`);
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

syncHistoricalData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
