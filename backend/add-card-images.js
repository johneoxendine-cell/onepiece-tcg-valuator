import fs from 'fs';
import initSqlJs from 'sql.js';

const dbPath = './data/onepiece.db';

// TCGplayer CDN image URL patterns
function getTCGplayerImageUrl(tcgplayerId) {
  if (!tcgplayerId) return null;
  return `https://tcgplayer-cdn.tcgplayer.com/product/${tcgplayerId}_200w.jpg`;
}

async function addCardImages() {
  console.log('Loading database directly...');
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // Get all cards with TCGplayer IDs
  const stmt = db.prepare(`
    SELECT id, name, tcgplayer_id
    FROM cards
    WHERE tcgplayer_id IS NOT NULL
  `);

  const cards = [];
  while (stmt.step()) {
    cards.push(stmt.getAsObject());
  }
  stmt.free();

  console.log(`Found ${cards.length} cards with tcgplayer_id...\n`);

  let updated = 0;
  for (const card of cards) {
    const imageUrl = getTCGplayerImageUrl(card.tcgplayer_id);
    if (imageUrl) {
      db.run('UPDATE cards SET image_url = ? WHERE id = ?', [imageUrl, card.id]);
      updated++;
      if (updated % 100 === 0) {
        console.log(`Updated ${updated}/${cards.length} cards...`);
      }
    }
  }

  // Save to disk
  console.log('\nSaving database to disk...');
  const data = db.export();
  const outputBuffer = Buffer.from(data);
  fs.writeFileSync(dbPath, outputBuffer);

  // Verify
  const result = db.exec('SELECT COUNT(*) as c FROM cards WHERE image_url IS NOT NULL');
  console.log('\n' + '='.repeat(50));
  console.log('IMAGE UPDATE COMPLETE');
  console.log('='.repeat(50));
  console.log(`Cards updated: ${updated}`);
  console.log(`Cards with images in DB: ${result[0].values[0][0]}`);
  console.log('='.repeat(50));

  db.close();
  process.exit(0);
}

addCardImages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
