-- Games (for future expansion)
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Sets
CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  release_date TEXT,
  set_value_usd REAL,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Cards
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  set_id TEXT NOT NULL,
  rarity TEXT,
  number TEXT,
  tcgplayer_id INTEGER,
  image_url TEXT,
  FOREIGN KEY (set_id) REFERENCES sets(id)
);

-- Variants (different printings/conditions)
CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  condition TEXT,
  printing TEXT,
  current_price REAL,
  avg_7d REAL,
  avg_30d REAL,
  avg_90d REAL,
  change_24h REAL,
  change_7d REAL,
  change_30d REAL,
  last_updated INTEGER,
  FOREIGN KEY (card_id) REFERENCES cards(id)
);

-- Price history for deeper analysis
CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id TEXT NOT NULL,
  price REAL,
  recorded_at INTEGER,
  FOREIGN KEY (variant_id) REFERENCES variants(id)
);

-- Sync metadata
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  records_synced INTEGER,
  status TEXT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cards_set_id ON cards(set_id);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_variants_card_id ON variants(card_id);
CREATE INDEX IF NOT EXISTS idx_variants_last_updated ON variants(last_updated);
CREATE INDEX IF NOT EXISTS idx_price_history_variant_id ON price_history(variant_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at);
