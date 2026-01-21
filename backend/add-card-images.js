import fs from 'fs';
import initSqlJs from 'sql.js';

const dbPath = './data/onepiece.db';

// Construct image URL from card number (e.g., "OP01-001", "ST18-005")
function getCardImageUrl(cardNumber) {
  if (!cardNumber || cardNumber === 'N/A') return null;

  // Extract set code from card number (e.g., "OP01" from "OP01-001")
  const match = cardNumber.match(/^([A-Z]+\d+)-(\d+)$/i);
  if (!match) return null;

  const fullNumber = cardNumber.toUpperCase();

  // Use official Bandai One Piece TCG site
  return `https://en.onepiece-cardgame.com/images/cardlist/card/${fullNumber}.png`;
}

// Fallback: Try TCGplayer CDN if we have the ID
function getTCGplayerImageUrl(tcgplayerId) {
  if (!tcgplayerId) return null;
  return `https://tcgplayer-cdn.tcgplayer.com/product/${tcgplayerId}_200w.jpg`;
}

async function addCardImages() {
  console.log('Loading database directly...');
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // Get all cards with card numbers
  const stmt = db.prepare(`
    SELECT id, name, number, tcgplayer_id
    FROM cards
    WHERE number IS NOT NULL AND number != 'N/A'
  `);

  const cards = [];
  while (stmt.step()) {
    cards.push(stmt.getAsObject());
  }
  stmt.free();

  console.log(`Found ${cards.length} cards with card numbers...\n`);

  let updated = 0;
  let skipped = 0;
  for (const card of cards) {
    // Try card number first, then tcgplayer_id as fallback
    const imageUrl = getCardImageUrl(card.number) || getTCGplayerImageUrl(card.tcgplayer_id);
    if (imageUrl) {
      db.run('UPDATE cards SET image_url = ? WHERE id = ?', [imageUrl, card.id]);
      updated++;
      if (updated % 100 === 0) {
        console.log(`Updated ${updated}/${cards.length} cards...`);
      }
    } else {
      skipped++;
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
  console.log(`Cards skipped (no valid number): ${skipped}`);
  console.log(`Cards with images in DB: ${result[0].values[0][0]}`);
  console.log('='.repeat(50));

  db.close();
  process.exit(0);
}

addCardImages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
