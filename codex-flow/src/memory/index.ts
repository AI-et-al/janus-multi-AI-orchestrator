import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// Create database in the codex-flow project directory
// Uses process.cwd() which works when running from project root
// Database file: codex-flow.db in the codex-flow directory
const dbPath = path.join(process.cwd(), 'codex-flow.db');
const firstTime = !fs.existsSync(dbPath);
const db = new Database(dbPath);

if (firstTime) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT DEFAULT (datetime('now')),
      source TEXT,
      type TEXT,
      data TEXT
    );
  `);
}

export function logEvent(source: string, type: string, data: unknown) {
  const stmt = db.prepare(
    'INSERT INTO events (source, type, data) VALUES (?, ?, ?)'
  );
  stmt.run(source, type, JSON.stringify(data));
}
