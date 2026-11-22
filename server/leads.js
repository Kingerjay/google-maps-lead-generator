import { Router } from 'express';
import { parse } from 'csv-parse/sync';
import { validateEmail, pickBest } from './validate.js';

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
        emails: row.emails || '',
        google_maps_url: row.link,
        place_id: row.place_id,
      });
    }

    // Check each lead's emails (syntax + mail server lookup, nothing is sent)
    await Promise.all(
      leads.map(async (l) => {
        const list = [...new Set(l.emails.split(/[,;\s]+/).filter(Boolean))];
        l.email = '';
        l.email_status = '';
        l.email_note = '';
        l.email_role = false;
        l.email_domain_match = null;
        if (!list.length) return;

        const checks = await Promise.all(list.map((e) => validateEmail(e, l.domain)));
        const best = pickBest(checks);
        const notes = [best.reason];
        if (best.role) notes.push('generic role address');
        if (best.domainMatch === false) notes.push('domain differs from website');
        l.email = best.email;
        l.email_status = best.status;
        l.email_note = notes.join('; ');
        l.email_role = best.role;
        l.email_domain_match = best.domainMatch;
      })
    );

    res.json({
      summary: {
        total: leads.length,
        duplicatesRemoved: rows.length - leads.length,
        withWebsite: leads.filter((l) => l.website).length,
        withPhone: leads.filter((l) => l.phone).length,
        withEmail: leads.filter((l) => l.emails).length,
        emailsOk: leads.filter((l) => l.email_status === 'mx_ok').length,
        emailsInvalid: leads.filter((l) => l.email_status === 'invalid').length,
        emailsUnknown: leads.filter((l) => l.email_status === 'unknown').length,
      },
      leads,
    });
  } catch {
    res.status(502).json({ error: `Cannot reach GoSOM at ${GOSOM}` });
  }
});

export default router;