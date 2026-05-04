const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, 'babychower.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    max_guests INTEGER NOT NULL DEFAULT 1,
    token TEXT UNIQUE NOT NULL,
    confirmed INTEGER,
    confirmed_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const adminExists = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
if (!adminExists) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', 'babychower2026')").run();
}

const baseUrlExists = db.prepare("SELECT value FROM settings WHERE key = 'base_url'").get();
if (!baseUrlExists) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('base_url', '')").run();
}

module.exports = db;
