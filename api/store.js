// Vercel serverless function — shared data store backed by a JSON file in the
// GitHub repo (via Contents API). This replaces the dead Firebase project so
// data created on one phone appears on every other phone.
//
// GET  /api/store        -> returns the full shared dataset (all 12 tables)
// POST /api/store        -> body: { table, id, data } or { table, rows:[...] }
//                           merges into the shared dataset and commits to GitHub
//
// ponytail: GitHub token is server-side only (VERCEL env), never shipped to client.

const https = require('https');

const REPO_OWNER = 'mo2menmenzoo-arch';
const REPO_NAME = 'Mashrom-System';
const DATA_PATH = 'shared-data.json';
const BRANCH = 'master';

const TABLES = [
  'users', 'partners', 'greenhouses', 'cycles', 'inventory',
  'petty_cash', 'transactions', 'expenses', 'operational_logs',
  'employees', 'assets', 'production'
];

function ghRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'api.github.com',
        path,
        method,
        headers: {
          'User-Agent': 'mushroom-system',
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null });
          } catch (e) {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getFile(token) {
  const res = await ghRequest(
    'GET',
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}?ref=${BRANCH}`,
    null,
    token
  );
  if (res.status === 404 || (res.body && res.body.message === 'Not Found')) {
    // Initialize empty dataset
    const empty = {};
    TABLES.forEach((t) => (empty[t] = {}));
    return { sha: null, data: empty };
  }
  if (res.status !== 200) {
    throw new Error('GitHub get failed: ' + JSON.stringify(res.body));
  }
  const content = Buffer.from(res.body.content, 'base64').toString('utf8');
  return { sha: res.body.sha, data: JSON.parse(content) };
}

async function putFile(token, sha, data) {
  const body = {
    message: 'sync: update shared data',
    content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await ghRequest(
    'PUT',
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}`,
    body,
    token
  );
  if (res.status !== 200 && res.status !== 201) {
    throw new Error('GitHub put failed: ' + JSON.stringify(res.body));
  }
  return res.body;
}

function emptyDataset() {
  const d = {};
  TABLES.forEach((t) => (d[t] = {}));
  return d;
}

function mergeRow(dataset, table, id, row) {
  if (!dataset[table]) dataset[table] = {};
  dataset[table][String(id)] = { ...row, id: Number(id) || id };
}

function mergeRows(dataset, table, rows) {
  if (!dataset[table]) dataset[table] = {};
  for (const r of rows) {
    const id = r.id != null ? r.id : Date.now();
    dataset[table][String(id)] = { ...r, id: Number(id) || id };
  }
}

function deleteRow(dataset, table, id) {
  if (!dataset[table]) return;
  delete dataset[table][String(id)];
}

module.exports = async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const { data } = await getFile(token);
      res.status(200).json(data);
      return;
    }

    if (req.method === 'POST') {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { sha, data: dataset } = await getFile(token);

      if (payload.table && payload.rows) {
        mergeRows(dataset, payload.table, payload.rows);
      } else if (payload.table && payload.id != null && payload.delete) {
        deleteRow(dataset, payload.table, payload.id);
      } else if (payload.table && payload.id != null && payload.data) {
        mergeRow(dataset, payload.table, payload.id, payload.data);
      } else if (payload.full) {
        // Replace entire dataset (used for bulk migration)
        const merged = emptyDataset();
        TABLES.forEach((t) => {
          if (payload.full[t]) merged[t] = payload.full[t];
        });
        Object.assign(dataset, merged);
      } else {
        res.status(400).json({ error: 'Invalid payload' });
        return;
      }

      await putFile(token, sha, dataset);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('store error:', err);
    res.status(500).json({ error: String(err.message || err) });
  }
};
