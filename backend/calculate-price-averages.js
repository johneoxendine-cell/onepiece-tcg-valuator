import fs from 'fs';
import initSqlJs from 'sql.js';

const dbPath = './data/onepiece.db';

async function calculatePriceAverages() {
  console.log('Loading database...');
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * ONE_DAY;
  const THIRTY_DAYS = 30 * ONE_DAY;
  const NINETY_DAYS = 90 * ONE_DAY;

  // Get all variants
  const variantsStmt = db.prepare('SELECT id, current_price FROM variants WHERE current_price IS NOT NULL');
  const variants = [];
  while (variantsStmt.step()) {
    variants.push(variantsStmt.getAsObject());
  }
  variantsStmt.free();

  console.log(`Found ${variants.length} variants to process...\n`);

  let updated = 0;
  let withHistory = 0;

  for (const variant of variants) {
    // Get price history for this variant
    const historyStmt = db.prepare(`
      SELECT price, recorded_at
      FROM price_history
      WHERE variant_id = ?
      ORDER BY recorded_at DESC
    `);
    historyStmt.bind([variant.id]);

    const history = [];
    while (historyStmt.step()) {
      history.push(historyStmt.getAsObject());
    }
    historyStmt.free();

    if (history.length === 0) continue;
    withHistory++;

    // Calculate averages from history
    const prices7d = history.filter(h => h.recorded_at >= now - SEVEN_DAYS).map(h => h.price);
    const prices30d = history.filter(h => h.recorded_at >= now - THIRTY_DAYS).map(h => h.price);
    const prices90d = history.filter(h => h.recorded_at >= now - NINETY_DAYS).map(h => h.price);

    const avg7d = prices7d.length > 0 ? prices7d.reduce((a, b) => a + b, 0) / prices7d.length : null;
    const avg30d = prices30d.length > 0 ? prices30d.reduce((a, b) => a + b, 0) / prices30d.length : null;
    const avg90d = prices90d.length > 0 ? prices90d.reduce((a, b) => a + b, 0) / prices90d.length : null;

    // Calculate price changes
    const currentPrice = variant.current_price;
    const price24hAgo = history.find(h => h.recorded_at <= now - ONE_DAY)?.price;
    const price7dAgo = history.find(h => h.recorded_at <= now - SEVEN_DAYS)?.price;
    const price30dAgo = history.find(h => h.recorded_at <= now - THIRTY_DAYS)?.price;

    const change24h = price24hAgo && price24hAgo > 0
      ? ((currentPrice - price24hAgo) / price24hAgo) * 100
      : null;
    const change7d = price7dAgo && price7dAgo > 0
      ? ((currentPrice - price7dAgo) / price7dAgo) * 100
      : null;
    const change30d = price30dAgo && price30dAgo > 0
      ? ((currentPrice - price30dAgo) / price30dAgo) * 100
      : null;

    // Update variant
    db.run(`
      UPDATE variants
      SET avg_7d = ?, avg_30d = ?, avg_90d = ?,
          change_24h = ?, change_7d = ?, change_30d = ?
      WHERE id = ?
    `, [avg7d, avg30d, avg90d, change24h, change7d, change30d, variant.id]);

    updated++;
    if (updated % 500 === 0) {
      console.log(`Processed ${updated}/${variants.length} variants...`);
    }
  }

  // Save database
  console.log('\nSaving database...');
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));

  // Final stats
  const stats = db.exec(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN avg_7d IS NOT NULL THEN 1 ELSE 0 END) as has_avg7d,
      SUM(CASE WHEN avg_30d IS NOT NULL THEN 1 ELSE 0 END) as has_avg30d,
      SUM(CASE WHEN change_7d IS NOT NULL THEN 1 ELSE 0 END) as has_change7d
    FROM variants WHERE current_price IS NOT NULL
  `)[0].values[0];

  console.log('\n' + '='.repeat(50));
  console.log('PRICE AVERAGES CALCULATED');
  console.log('='.repeat(50));
  console.log(`Variants processed: ${updated}`);
  console.log(`Variants with price history: ${withHistory}`);
  console.log(`\nResults:`);
  console.log(`  Total variants: ${stats[0]}`);
  console.log(`  With avg_7d: ${stats[1]}`);
  console.log(`  With avg_30d: ${stats[2]}`);
  console.log(`  With change_7d: ${stats[3]}`);
  console.log('='.repeat(50));

  db.close();
  process.exit(0);
}

calculatePriceAverages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
