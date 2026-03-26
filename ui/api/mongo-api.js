import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.VITE_MONGO_URI || '';
const DB_NAME = process.env.VITE_MONGO_DB || 'instest';
const COLL_NAME = process.env.VITE_MONGO_COLL || 'results';

let client = null;

async function getDb() {
  if (!client) {
    client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
  }
  return client.db(DB_NAME);
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const cleanPath = '/mongo-api' + pathname;

  try {
    if (cleanPath === '/mongo-api/health') {
      await getDb();
      res.status(200).json({ ok: true, db: DB_NAME, collection: COLL_NAME });
      return;
    }

    if (cleanPath === '/mongo-api/results') {
      const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
      const skip = parseInt(req.query.skip) || 0;

      const db = await getDb();
      const docs = await db.collection(COLL_NAME)
        .find({}, { projection: { _id: 0 } })
        .skip(skip)
        .limit(limit)
        .toArray();

      res.status(200).json({ ok: true, count: docs.length, data: docs });
      return;
    }

    if (cleanPath === '/mongo-api/results/jsonl') {
      const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
      const skip = parseInt(req.query.skip) || 0;

      const db = await getDb();
      const docs = await db.collection(COLL_NAME)
        .find({}, { projection: { _id: 0 } })
        .skip(skip)
        .limit(limit)
        .toArray();

      const jsonl = docs.map(d => JSON.stringify(d)).join('\n');
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.status(200).send(jsonl);
      return;
    }

    res.status(404).json({ error: 'Not found' });

  } catch (err) {
    console.error('API Error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}