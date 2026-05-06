const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'babychower.db');

// Si estamos en Railway y el volumen está vacío, copiar la base de datos original que subimos
const localDbPath = path.join(__dirname, 'data', 'babychower.db');
if (process.env.RAILWAY_VOLUME_MOUNT_PATH && !fs.existsSync(dbPath) && fs.existsSync(localDbPath)) {
  fs.copyFileSync(localDbPath, dbPath);
  console.log("Base de datos local copiada al volumen persistente de Railway.");
}

const db = new Database(dbPath);

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

try {
  db.exec("ALTER TABLE guests ADD COLUMN host TEXT DEFAULT 'Ambos'");
} catch (err) {
  // Column might already exist, ignore error
}

const adminExists = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
if (!adminExists) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', 'babychower2026')").run();
}

const baseUrlExists = db.prepare("SELECT value FROM settings WHERE key = 'base_url'").get();
if (!baseUrlExists) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('base_url', '')").run();
}

module.exports = db;
