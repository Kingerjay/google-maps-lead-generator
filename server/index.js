import express from 'express';

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

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
