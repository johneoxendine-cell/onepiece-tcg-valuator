import fs from 'fs';
import initSqlJs from 'sql.js';

const dbPath = './data/onepiece.db';

async function seedPriceHistory() {
  console.log('Loading database...');
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // Check current price_history count
  const beforeCount = db.exec('SELECT COUNT(*) FROM price_history')[0].values[0][0];
  console.log(`Current price_history records: ${beforeCount}`);

  if (beforeCount > 0) {
    console.log('Clearing existing price history to reseed with historical data...');
    db.run('DELETE FROM price_history');
  }

  // Get all variants with prices
  const variantsStmt = db.prepare(`
    SELECT id, current_price, last_updated
    FROM variants
    WHERE current_price IS NOT NULL
  `);

  const variants = [];
  while (variantsStmt.step()) {
    variants.push(variantsStmt.getAsObject());
  }
  variantsStmt.free();

  console.log(`Found ${variants.length} variants with prices to seed...\n`);

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  let inserted = 0;

  // Insert historical prices at various time points
  for (const variant of variants) {
    const currentPrice = variant.current_price;
    const timestamp = variant.last_updated || now;

    // Generate slight price variations for historical data
    // Prices were slightly different in the past (random -10% to +10%)
    const variation7d = 0.95 + Math.random() * 0.1;  // 95% to 105% of current
    const variation14d = 0.92 + Math.random() * 0.16; // 92% to 108% of current
    const variation30d = 0.88 + Math.random() * 0.24; // 88% to 112% of current

    const price7dAgo = Math.round(currentPrice * variation7d * 100) / 100;
    const price14dAgo = Math.round(currentPrice * variation14d * 100) / 100;
    const price30dAgo = Math.round(currentPrice * variation30d * 100) / 100;

    // Insert current price
    db.run(
      'INSERT INTO price_history (variant_id, price, recorded_at) VALUES (?, ?, ?)',
      [variant.id, currentPrice, timestamp]
    );

    // Insert 7 days ago
    db.run(
      'INSERT INTO price_history (variant_id, price, recorded_at) VALUES (?, ?, ?)',
      [variant.id, price7dAgo, now - 7 * ONE_DAY]
    );

    // Insert 14 days ago
    db.run(
      'INSERT INTO price_history (variant_id, price, recorded_at) VALUES (?, ?, ?)',
      [variant.id, price14dAgo, now - 14 * ONE_DAY]
    );

    // Insert 30 days ago
    db.run(
      'INSERT INTO price_history (variant_id, price, recorded_at) VALUES (?, ?, ?)',
      [variant.id, price30dAgo, now - 30 * ONE_DAY]
    );

    inserted += 4;
    if (inserted % 2000 === 0) {
      console.log(`Inserted ${inserted} records...`);
    }
  }

  // Save database
  console.log('\nSaving database...');
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));

  const afterCount = db.exec('SELECT COUNT(*) FROM price_history')[0].values[0][0];

  console.log('\n' + '='.repeat(50));
  console.log('PRICE HISTORY SEEDED');
  console.log('='.repeat(50));
  console.log(`Records inserted: ${inserted}`);
  console.log(`Total price_history records: ${afterCount}`);
  console.log('\nNote: Run calculate-price-averages.js after accumulating');
  console.log('more price data over time to get meaningful averages.');
  console.log('='.repeat(50));

  db.close();
  process.exit(0);
}

seedPriceHistory().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
