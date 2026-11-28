const COLUMNS = [
  'business_name', 'category', 'phone', 'website', 'domain', 'city', 'state',
  'postal_code', 'rating', 'review_count', 'emails',
  'google_maps_url', 'place_id', 'project_name', 'source_query', 'scraped_at',
  'lead_status', 'notes',
]

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'leads'

function download(content, type, filename) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function toCsv(rows) {
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(','))
  return [COLUMNS.join(','), ...lines].join('\n')
}

export function buildRows(leads, job) {
  return leads.map((l) => ({
    ...l,
    emails: l.emails.join('; '),
    project_name: job.name,
    source_query: job.keywords.join(' | '),
    scraped_at: job.date,
    lead_status: 'New',
    notes: '',
  }))
}

export function saveCsv(rows, jobName = 'leads') {
  download(toCsv(rows), 'text/csv', slug(jobName) + '.csv')
}

// One value per line, e.g. saveText(emails, 'Destin FL', 'emails') -> destin-fl-emails.txt
export function saveText(lines, jobName, suffix) {
  download(lines.join('\n') + '\n', 'text/plain', slug(jobName) + '-' + suffix + '.txt')
}

export async function downloadJobCsv(job) {
  const r = await fetch('/api/jobs/' + job.id + '/leads')
  const body = await r.json()
  if (!r.ok) throw new Error(body.error || 'Could not load leads')
  saveCsv(buildRows(body.leads, job), job.name)
}