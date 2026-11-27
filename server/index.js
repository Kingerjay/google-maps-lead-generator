import express from 'express';
import leadsRouter from './leads.js';

const app = express();
const PORT = 3001;
const GOSOM = 'http://localhost:8080';

app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const r = await fetch(`${GOSOM}/api/v1/jobs`);
    res.json({ server: 'ok', gosom: r.ok ? 'ok' : `error ${r.status}` });
  } catch {
    res.json({ server: 'ok', gosom: 'unreachable' });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const r = await fetch(`${GOSOM}/api/v1/jobs`);
    const raw = (await r.json()) ?? [];
    const jobs = raw.map((j) => ({
      id: j.ID,
      name: j.Name,
      date: j.Date,
      status: j.Status,
      keywords: j.Data?.keywords ?? [],
      email: j.Data?.email ?? false,
    }));
    res.json(jobs);
  } catch {
    res.status(502).json({ error: `Cannot reach GoSOM at ${GOSOM}` });
  }
});

// Start a new scrape
app.post('/api/jobs', async (req, res) => {
  const { name, keywords, depth = 1, maxTime = 1800, lat, lon, radius } = req.body ?? {};
  if (!name || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'name and keywords (a non-empty array) are required' });
  }

  const payload = {
    name,
    keywords,
    lang: 'en',
    zoom: 15,
    depth: Number(depth) || 1,
    email: true,
    max_time: Number(maxTime) || 900,
  };

  // Location pin: both lat and lon are needed together
  if (lat || lon) {
    const la = Number(lat);
    const lo = Number(lon);
    if (!lat || !lon || Number.isNaN(la) || Number.isNaN(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
      return res.status(400).json({ error: 'lat and lon must both be valid coordinates' });
    }
    payload.lat = String(la);
    payload.lon = String(lo);
  }
  if (radius) payload.radius = Number(radius);

  try {
    const r = await fetch(`${GOSOM}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    res.status(201).json({ id: data.id });
  } catch {
    res.status(502).json({ error: `Cannot reach GoSOM at ${GOSOM}` });
  }
});

// Delete a job
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const r = await fetch(`${GOSOM}/api/v1/jobs/${req.params.id}`, { method: 'DELETE' });
    res.status(r.ok ? 200 : r.status).json({ deleted: r.ok });
  } catch {
    res.status(502).json({ error: `Cannot reach GoSOM at ${GOSOM}` });
  }
});

app.use('/api/jobs', leadsRouter);
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

