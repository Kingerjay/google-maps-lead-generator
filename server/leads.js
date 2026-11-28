import { Router } from 'express';
import { parse } from 'csv-parse/sync';

const GOSOM = 'http://localhost:8080';
const router = Router();

function toDomain(url) {
  if (!url) return '';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function parseAddress(raw) {
  try {
    const a = JSON.parse(raw);
    return { city: a.city ?? '', state: a.state ?? '', postal_code: a.postal_code ?? '' };
  } catch {
    return { city: '', state: '', postal_code: '' };
  }
}

// GoSOM puts every email found for a business in one field: split, trim and de-duplicate
const FILE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'ico', 'css', 'js', 'woff', 'woff2', 'ttf', 'pdf',
]);
const JUNK_DOMAINS = [
  'example.com', 'example.org', 'domain.com', 'yourdomain.com', 'yoursite.com',
  'sentry.io', 'wixpress.com',
];
const PLACEHOLDER_LOCALS = new Set(['name', 'yourname', 'youremail', 'email', 'user', 'username']);
const EMAIL_SYNTAX = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

// Quietly drops things scrapers pick up by mistake: image file names, placeholders, tracking IDs
function isJunk(email) {
  if (email.length > 254 || !EMAIL_SYNTAX.test(email)) return true;
  const [local, domain] = email.split('@');
  if (FILE_EXTENSIONS.has(domain.split('.').pop())) return true;
  if (JUNK_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))) return true;
  if (PLACEHOLDER_LOCALS.has(local)) return true;
  if (/^[a-f0-9]{24,}$/.test(local)) return true; // long hash-like names
  return false;
}

// GoSOM puts every email found for a business in one field: split, clean, drop junk, de-duplicate
function parseEmails(raw) {
  const found = String(raw ?? '')
    .toLowerCase()
    .split(/[,;\s]+/)
    .map((e) => e.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
    .filter((e) => e.includes('@') && !isJunk(e));
  return [...new Set(found)];
}

router.get('/:id/leads', async (req, res) => {
  try {
    const r = await fetch(`${GOSOM}/api/v1/jobs/${req.params.id}/download`);
    if (!r.ok) return res.status(r.status).json({ error: 'No results available for this job yet' });

    const rows = parse(await r.text(), { columns: true, skip_empty_lines: true, relax_column_count: true });

    const seen = new Set();
    const leads = [];
    for (const row of rows) {
      const key = row.place_id || row.cid || row.link;
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      leads.push({
        business_name: row.title,
        category: row.category,
        phone: row.phone,
        website: row.website,
        domain: toDomain(row.website),
        ...parseAddress(row.complete_address),
        rating: row.review_rating,
        review_count: row.review_count,
        emails: parseEmails(row.emails),
        google_maps_url: row.link,
        place_id: row.place_id,
      });
    }

    res.json({
      summary: {
        total: leads.length,
        duplicatesRemoved: rows.length - leads.length,
        withWebsite: leads.filter((l) => l.website).length,
        withPhone: leads.filter((l) => l.phone).length,
        withEmail: leads.filter((l) => l.emails.length > 0).length,
        emailsFound: new Set(leads.flatMap((l) => l.emails)).size,
      },
      leads,
    });
  } catch {
    res.status(502).json({ error: `Cannot reach GoSOM at ${GOSOM}` });
  }
});

export default router;