const COLUMNS = [
    'business_name', 'category', 'phone', 'website', 'domain', 'city', 'state',
    'postal_code', 'rating', 'review_count', 'email', 'email_status', 'email_note',
    'google_maps_url', 'place_id', 'project_name', 'source_query', 'scraped_at',
    'lead_status', 'notes',
  ]
  
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'leads'
  
  function toCsv(rows) {
    const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
    const lines = rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(','))
    return [COLUMNS.join(','), ...lines].join('\n')
  }
  
  export function buildRows(leads, job) {
    return leads.map((l) => ({
      ...l,
      project_name: job.name,
      source_query: job.keywords.join(' | '),
      scraped_at: job.date,
      lead_status: 'New',
      notes: '',
    }))
  }
  
  export function saveCsv(rows, jobName = 'leads') {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = slug(jobName) + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  
  export async function downloadJobCsv(job) {
    const r = await fetch('/api/jobs/' + job.id + '/leads')
    const body = await r.json()
    if (!r.ok) throw new Error(body.error || 'Could not load leads')
    saveCsv(buildRows(body.leads, job), job.name)
  }