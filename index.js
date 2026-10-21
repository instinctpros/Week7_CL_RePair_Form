import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';

const app = express();
const folder = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;

// Locally: storage/db.json. On Railway: attach a volume mounted at /data.
const storage = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(folder, 'storage');
mkdirSync(storage, { recursive: true });
const db = new LowSync(new JSONFileSync(path.join(storage, 'db.json')), { reflections: [] });
db.read();
db.write();

// Let Express understand JSON sent by the browser.
app.use(express.json({ limit: '16kb' }));

// ROUTE 1: Send the static HTML homepage.
app.get('/', (req, res) => {
  res.sendFile(path.join(folder, 'public', 'index.html'));
});
app.use(express.static(path.join(folder, 'public')));

// ROUTE 2: Receive, validate and store a reflection in lowdb.
app.post('/new-data', (req, res) => {
  const fields = ['notice', 'reveal', 'repair'];
  const body = req.body || {};
  if (fields.some(key => typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > 500)) {
    return res.status(400).json({ error: 'Please complete all three fields, using 500 characters or fewer per field.' });
  }
  const reflection = {
    id: randomUUID(),
    notice: body.notice.trim(),
    reveal: body.reveal.trim(),
    repair: body.repair.trim(),
    createdAt: new Date().toISOString()
  };
  db.data.reflections.push(reflection);
  try {
    db.write(); // Write to the JSON file before confirming success.
  } catch (error) {
    db.data.reflections.pop();
    throw error;
  }
  res.status(201).json({ message: 'Your reflection has been saved.', reflection });
});

// ROUTE 3: Return the stored reflections as JSON, newest first.
app.get('/data', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json([...db.data.reflections].reverse());
});

app.use((error, req, res, next) => {
  console.error(error.message);
  const status = error.status === 400 ? 400 : error.status === 413 ? 413 : 500;
  res.status(status).json({ error: status === 500 ? 'Unable to save right now. Please try again.' : 'Please send a valid, smaller JSON request.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`RE:PAIR is running at http://localhost:${port}`);
});
