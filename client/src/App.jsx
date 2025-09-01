import { useEffect, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3002';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [streak, setStreak]   = useState(0);
  const [last, setLast]       = useState(null);
  const [msg, setMsg]         = useState('');
  const [err, setErr]         = useState('');

  async function load() {
    try {
      setErr('');
      const res  = await fetch(`${API}/api/streak`);
      const data = await res.json();
      setStreak(data.count ?? 0);
      setLast(data.last ?? null);
    } catch {
      setErr('Cannot reach API.');
    } finally { setLoading(false); }
  }

  async function tick() {
    try {
      setErr('');
      const res  = await fetch(`${API}/api/tick`, { method: 'POST' });
      const data = await res.json();
      setStreak(data.count ?? streak);
      setLast(data.last ?? last);
      setMsg('Marked today ✅'); setTimeout(()=>setMsg(''), 1500);
    } catch { setErr('Tick failed.'); }
  }

  async function undoToday() {
    try {
      setErr('');
      await fetch(`${API}/api/habits/1/checks`, { method: 'DELETE' });
      await load();
      setMsg('Undid today ↩'); setTimeout(()=>setMsg(''), 1500);
    } catch { setErr('Undo failed.'); }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="loading">Loading…</p>;

  const prettyLast = last ? new Date(last).toLocaleString() : '—';
  const days = streak === 1 ? 'day' : 'days';

  return (
    <div className="page">
      <header className="topbar">
        <span className="brand">Streaker</span>
        <a className="link" href="https://github.com/ZmajPOG" target="_blank">GitHub ↗</a>
      </header>

      <main className="wrap">
        <section className="card">
          <h1 className="h1">Daily Streak</h1>

          {err && <p className="alert error">{err}</p>}
          {msg && <p className="alert ok">{msg}</p>}

          <div className="streak">
            <span className="flame" role="img" aria-label="flame">🔥</span>
            <div>
              <div className="count">{streak}</div>
              <div className="muted">{days}</div>
            </div>
          </div>

          <p className="muted">Last update: {prettyLast}</p>

          <div className="actions">
            <button className="btn primary" onClick={tick}>Mark today</button>
            <button className="btn ghost" onClick={undoToday}>Undo today</button>
          </div>
        </section>
      </main>

      <footer className="foot">Built with React + Express + SQLite</footer>
    </div>
  );
}
