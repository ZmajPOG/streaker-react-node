# Streaker (React + Express + SQLite)

Small full-stack demo that tracks a daily streak.

- **Client:** React (Vite)
- **API:** Express
- **DB:** SQLite (better-sqlite3)

## Run locally

```bash
# 1) API
cd server
npm install
node index.js
# -> Streaker API http://127.0.0.1:3002

# 2) Client (in another terminal)
cd ../client
cp .env.example .env   # or set VITE_API_URL yourself
npm install
npm run dev
# -> http://127.0.0.1:5173


Folder structure
streaker-react-node/
  client/   # React app (Vite)
  server/   # Express API + SQLite

Notes

node_modules/ and local .env are ignored.

SQLite files (*.db) are ignored; API creates streaker.db on first run.


## 5) Stage & commit
```bat
git add .
git commit -m "feat: Streaker (React + Express + SQLite) – initial commit"