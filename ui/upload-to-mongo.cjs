/**
 * upload-to-mongo.cjs
 * Reads all evaluation JSONL files and upserts records into MongoDB.
 * Run:  node upload-to-mongo.cjs
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs   = require('fs');
const path = require('path');

const MONGO_URI  = process.env.VITE_MONGO_URI;
const DB_NAME    = process.env.VITE_MONGO_DB   || 'instest';
const COLL_NAME  = process.env.VITE_MONGO_COLL || 'results';

const ROOT = path.resolve(__dirname, '..');

// All JSONL files to upload (relative to repo root)
const FILES = [
  path.join('ui', 'public', 'evaluation_results.jsonl')
].map(f => path.join(ROOT, f));

function parseJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`  [skip] Not found: ${filePath}`);
    return [];
  }
  const lines = fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  const docs = [];
  for (const line of lines) {
    try { docs.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return docs;
}

async function main() {
  if (!MONGO_URI) {
    console.error('VITE_MONGO_URI is not set in .env');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  console.log('Connected to MongoDB Atlas');

  const coll = client.db(DB_NAME).collection(COLL_NAME);
  let totalInserted = 0;
  let totalSkipped  = 0;

  for (const filePath of FILES) {
    console.log(`\nProcessing: ${path.relative(ROOT, filePath)}`);
    const docs = parseJsonl(filePath);
    if (docs.length === 0) { console.log('  No valid documents.'); continue; }

    // Upsert by log_id to avoid duplicates
    const ops = docs.map(doc => ({
      updateOne: {
        filter: { log_id: doc.log_id ?? doc._id ?? JSON.stringify(doc).slice(0, 60) },
        update:  { $set: { ...doc, _source_file: path.basename(filePath) } },
        upsert:  true,
      },
    }));

    const result = await coll.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount;
    const modified = result.modifiedCount;
    console.log(`  Parsed: ${docs.length} | Inserted: ${inserted} | Updated: ${modified}`);
    totalInserted += inserted;
    totalSkipped  += modified;
  }

  const total = await coll.countDocuments();
  console.log(`\nDone. New inserts: ${totalInserted} | Updates: ${totalSkipped}`);
  console.log(`Total documents in ${DB_NAME}.${COLL_NAME}: ${total}`);
  await client.close();
}

main().catch(err => { console.error(err.message); process.exit(1); });
