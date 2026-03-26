/**
 * mongo-api.cjs
 * Lightweight Express server that exposes MongoDB Atlas data to the Vite frontend.
 * Run with:  node mongo-api.cjs
 * Vite proxies  /mongo-api  →  http://localhost:3001
 */

require('dotenv').config();          // load .env (VITE_MONGO_URI, etc.)

const express = require('express');
const cors    = require('cors');
const { MongoClient } = require('mongodb');

const PORT       = process.env.PORT || process.env.MONGO_API_PORT || 10000;
const MONGO_URI  = process.env.VITE_MONGO_URI  || '';
const DB_NAME    = process.env.VITE_MONGO_DB   || 'instest';
const COLL_NAME  = process.env.VITE_MONGO_COLL || 'results';

if (!MONGO_URI) {
  console.error('[mongo-api] VITE_MONGO_URI is not set. Check your .env file.');
  process.exit(1);
}

const app    = express();
let   client = null;

app.use(cors());
app.use(express.json());

// ── Connect once ──────────────────────────────────────────────
async function getDb() {
  if (!client) {
    client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    console.log('[mongo-api] Connected to MongoDB Atlas');
  }
  return client.db(DB_NAME);
}

// ── GET /mongo-api/results  ───────────────────────────────────
// Returns all documents as a JSON array.
// Optional query params:
//   ?limit=100   (default 500)
//   ?skip=0
app.get('/mongo-api/results', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
    const skip  = parseInt(req.query.skip)  || 0;

    const db   = await getDb();
    const docs = await db.collection(COLL_NAME)
      .find({}, { projection: { _id: 0 } })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({ ok: true, count: docs.length, data: docs });
  } catch (err) {
    console.error('[mongo-api] Error fetching results:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /mongo-api/results/jsonl  ─────────────────────────────
// Returns results as a JSONL (newline-delimited JSON) text stream.
app.get('/mongo-api/results/jsonl', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
    const skip  = parseInt(req.query.skip)  || 0;

    const db   = await getDb();
    const docs = await db.collection(COLL_NAME)
      .find({}, { projection: { _id: 0 } })
      .skip(skip)
      .limit(limit)
      .toArray();

    const jsonl = docs.map(d => JSON.stringify(d)).join('\n');
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.send(jsonl);
  } catch (err) {
    console.error('[mongo-api] Error streaming results:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /mongo-api/health ─────────────────────────────────────
app.get('/mongo-api/health', async (req, res) => {
  try {
    await getDb();
    res.json({ ok: true, db: DB_NAME, collection: COLL_NAME });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[mongo-api] Listening on http://localhost:${PORT}`);
  console.log(`[mongo-api] DB: ${DB_NAME}  |  Collection: ${COLL_NAME}`);
});

// Graceful shutdown
process.on('SIGINT',  () => { client?.close(); process.exit(0); });
process.on('SIGTERM', () => { client?.close(); process.exit(0); });
