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
    console.log('Price history already has data. Skipping seed.');
    db.close();
    process.exit(0);
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
  let inserted = 0;

  // Insert current prices as initial history
  for (const variant of variants) {
    const timestamp = variant.last_updated || now;
    db.run(
      'INSERT INTO price_history (variant_id, price, recorded_at) VALUES (?, ?, ?)',
      [variant.id, variant.current_price, timestamp]
    );
    inserted++;
    if (inserted % 500 === 0) {
      console.log(`Inserted ${inserted}/${variants.length} records...`);
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
