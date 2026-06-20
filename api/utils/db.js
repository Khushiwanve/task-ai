const fs = require('fs');
const path = require('path');

// Vercel's filesystem is read-only except /tmp, and /tmp is wiped between
// cold starts — so data won't persist long-term on Vercel's free tier.
// Locally (or on a normal server/VM), it persists permanently in /data.
const DB_PATH = process.env.VERCEL
  ? '/tmp/tasks.json'
  : path.join(__dirname, '../../data/tasks.json');

function initDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([]));
}

function readTasks() {
  initDB();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeTasks(tasks) {
  initDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(tasks, null, 2));
}

module.exports = { readTasks, writeTasks };
