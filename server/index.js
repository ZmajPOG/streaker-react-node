// server/index.js
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';

const app = express();
const PORT = process.env.PORT || 3002;
const ALLOWED = ['http://127.0.0.1:5173', 'http://localhost:5173'];

app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());

// --- DB setup ---------------------------------
const db = new Database('./streaker.db');
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4fb3ff',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  UNIQUE(habit_id, date),
  FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
);
`);
// Ensure a default habit with id=1 exists (for simple streak demo)
db.prepare("INSERT OR IGNORE INTO habits(id,name,color) VALUES (1,'Daily Check','#4fb3ff')").run();

// --- helpers ----------------------------------
const today = () => new Date().toISOString().slice(0,10);
const dec = (d) => { const x = new Date(d); x.setUTCDate(x.getUTCDate()-1); return x.toISOString().slice(0,10); };

// --- health -----------------------------------
app.get('/api/health', (req,res)=>{
  const h = db.prepare('SELECT COUNT(*) c FROM habits').get().c;
  const c = db.prepare('SELECT COUNT(*) c FROM checks').get().c;
  res.json({ ok:true, habits:h, checks:c, time:new Date().toISOString() });
});

// --- Habits CRUD -------------------------------
app.get('/api/habits', (req,res)=>{
  res.json(db.prepare('SELECT * FROM habits ORDER BY id DESC').all());
});

app.post('/api/habits', (req,res)=>{
  const { name, color } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const r = db.prepare('INSERT INTO habits (name,color) VALUES (?,?)').run(name, color || '#4fb3ff');
  res.status(201).json(db.prepare('SELECT * FROM habits WHERE id=?').get(r.lastInsertRowid));
});

app.put('/api/habits/:id', (req,res)=>{
  const { name, color } = req.body || {};
  const cur = db.prepare('SELECT * FROM habits WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error:'not found' });
  db.prepare('UPDATE habits SET name=?, color=? WHERE id=?').run(name ?? cur.name, color ?? cur.color, req.params.id);
  res.json(db.prepare('SELECT * FROM habits WHERE id=?').get(req.params.id));
});

app.delete('/api/habits/:id', (req,res)=>{
  const r = db.prepare('DELETE FROM habits WHERE id=?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error:'not found' });
  res.status(204).end();
});

// --- Checks -----------------------------------
app.get('/api/habits/:id/checks', (req,res)=>{
  const { from, to } = req.query;
  const rows = db.prepare(`
    SELECT date FROM checks WHERE habit_id=? AND date BETWEEN ? AND ? ORDER BY date ASC
  `).all(req.params.id, from || '1970-01-01', to || '9999-12-31');
  res.json(rows.map(r=>r.date));
});

app.post('/api/habits/:id/checks', (req,res)=>{
  const date = (req.body?.date ? new Date(req.body.date) : new Date()).toISOString().slice(0,10);
  try { db.prepare('INSERT INTO checks (habit_id,date) VALUES (?,?)').run(req.params.id, date); } catch {}
  res.status(201).json({ ok:true, date });
});

app.delete('/api/habits/:id/checks', (req,res)=>{
  const date = (req.query.date ? new Date(req.query.date) : new Date()).toISOString().slice(0,10);
  db.prepare('DELETE FROM checks WHERE habit_id=? AND date=?').run(req.params.id, date);
  res.status(204).end();
});

app.get('/api/habits/:id/stats', (req,res)=>{
  const rows = db.prepare('SELECT date FROM checks WHERE habit_id=? ORDER BY date ASC').all(req.params.id);
  const set = new Set(rows.map(r=>r.date));
  // current
  let current = 0, d = today();
  while (set.has(d)) { current++; d = dec(d); }
  // longest
  let longest = 0, streak = 0, prev = null;
  for (const r of rows) {
    if (prev && dec(r.date) === prev) streak++; else streak = 1;
    prev = r.date;
    if (streak > longest) longest = streak;
  }
  const last = rows.length ? rows[rows.length-1].date : null;
  res.json({ current, longest, last });
});

// --- Compatibility for your current React app ---
app.get('/api/streak', (req,res)=>{
  const rows = db.prepare('SELECT date FROM checks WHERE habit_id=? ORDER BY date ASC').all(1);
  const set = new Set(rows.map(r=>r.date));
  let current = 0, d = today();
  while (set.has(d)) { current++; d = dec(d); }
  const last = rows.length ? rows[rows.length-1].date : null;
  res.json({ count: current, last });
});

app.post('/api/tick', (req,res)=>{
  const date = today();
  try { db.prepare('INSERT INTO checks (habit_id,date) VALUES (?,?)').run(1, date); } catch {}
  // return updated count
  const rows = db.prepare('SELECT date FROM checks WHERE habit_id=? ORDER BY date ASC').all(1);
  const set = new Set(rows.map(r=>r.date));
  let current = 0, d = today();
  while (set.has(d)) { current++; d = dec(d); }
  res.json({ count: current, last: date });
});

app.listen(PORT, ()=> console.log(`Streaker API listening on http://127.0.0.1:${PORT}`));
