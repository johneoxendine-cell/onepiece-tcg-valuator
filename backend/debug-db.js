import fs from 'fs';
import initSqlJs from 'sql.js';

const dbPath = './data/onepiece.db';

async function debug() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  const priceHistoryCount = db.exec('SELECT COUNT(*) as c FROM price_history')[0]?.values[0][0] || 0;
  console.log('Price history count:', priceHistoryCount);

  const variantsCount = db.exec('SELECT COUNT(*) as c FROM variants WHERE current_price IS NOT NULL')[0]?.values[0][0] || 0;
  console.log('Variants with prices:', variantsCount);

  const cardsWithImages = db.exec('SELECT COUNT(*) as c FROM cards WHERE image_url IS NOT NULL')[0]?.values[0][0] || 0;
  console.log('Cards with images:', cardsWithImages);

  if (cardsWithImages > 0) {
    const sample = db.exec('SELECT name, number, image_url FROM cards WHERE image_url IS NOT NULL LIMIT 2');
    console.log('\nSample cards with images:');
    sample[0]?.values.forEach(row => {
      console.log(`  ${row[0]} (${row[1]}): ${row[2]}`);
    });
  }

  if (priceHistoryCount > 0) {
    const sample = db.exec('SELECT variant_id, price, recorded_at FROM price_history LIMIT 3');
    console.log('\nSample price history:');
    sample[0]?.values.forEach(row => {
      console.log(`  ${row[0]}: $${row[1]} at ${new Date(row[2]).toISOString()}`);
    });
  }

  db.close();
}

debug().catch(console.error);
