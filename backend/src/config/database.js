import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || './data/onepiece.db';

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;
let SQL = null;

// Initialize SQL.js and database
async function initSql() {
  if (SQL) return SQL;
  SQL = await initSqlJs();
  return SQL;
}

// Load or create database
async function getDb() {
  if (db) return db;

  const SQL = await initSql();

  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch (err) {
    console.error('Error loading database:', err);
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

// Save database to disk
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Auto-save periodically
let saveInterval = null;
function startAutoSave(intervalMs = 30000) {
  if (saveInterval) return;
  saveInterval = setInterval(() => {
    saveDb();
  }, intervalMs);
}

// Wrapper class to provide better-sqlite3-like interface
class Database {
  constructor(database) {
    this.db = database;
  }

  prepare(sql) {
    return new Statement(this.db, sql);
  }

  exec(sql) {
    return this.db.run(sql);
  }

  pragma(pragma) {
    return this.db.run(`PRAGMA ${pragma}`);
  }

  transaction(fn) {
    return (...args) => {
      let inTransaction = false;
      try {
        this.db.run('BEGIN TRANSACTION');
        inTransaction = true;
        const result = fn(...args);
        this.db.run('COMMIT');
        inTransaction = false;
        saveDb();
        return result;
      } catch (err) {
        if (inTransaction) {
          try {
            this.db.run('ROLLBACK');
          } catch (rollbackErr) {
            // Ignore rollback errors
          }
        }
        throw err;
      }
    };
  }
}

class Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  run(...params) {
    this.db.run(this.sql, params);
    saveDb();
    return { changes: this.db.getRowsModified() };
  }

  get(...params) {
    const stmt = this.db.prepare(this.sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  }

  all(...params) {
    const results = [];
    const stmt = this.db.prepare(this.sql);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
}

// Initialize database
let dbWrapper = null;

export async function initializeDatabase() {
  const database = await getDb();
  dbWrapper = new Database(database);

  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = schema.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        database.run(statement);
      } catch (err) {
        // Ignore errors for IF NOT EXISTS statements
        if (!err.message.includes('already exists')) {
          console.error('Schema error:', err.message);
        }
      }
    }
  }

  // Insert One Piece game if not exists
  database.run(`INSERT OR IGNORE INTO games (id, name) VALUES ('one-piece', 'One Piece Card Game')`);

  saveDb();
  startAutoSave();

  console.log('Database initialized successfully');
  return dbWrapper;
}

export function getDatabase() {
  if (!dbWrapper) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbWrapper;
}

// Export a proxy that will throw if used before initialization
const dbProxy = new Proxy({}, {
  get(target, prop) {
    if (!dbWrapper) {
      throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return dbWrapper[prop];
  }
});

export default dbProxy;
