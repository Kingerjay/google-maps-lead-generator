import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const COLUMNS = [
    'business_name', 'category', 'phone', 'website', 'domain', 'city', 'state',
    'postal_code', 'rating', 'review_count', 'email', 'email_status', 'email_note',
    'google_maps_url', 'place_id', 'project_name', 'source_query', 'scraped_at',
    'lead_status', 'notes',
  ]

  const emailBadge = {
    mx_ok: 'bg-green-100 text-green-800',
    invalid: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-700',
  }
  const emailLabel = { mx_ok: 'domain ok', invalid: 'invalid', unknown: 'unknown' }

function toCsv(rows) {
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const lines = rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(','))
  return [COLUMNS.join(','), ...lines].join('\n')
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export default function ProjectDetails() {
  const { id } = useParams()
  const [job, setJob] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [onlyEmail, setOnlyEmail] = useState(false)

  useEffect(() => {
    fetch('/api/jobs')
      .then((r) => r.json())
      .then((list) => setJob(list.find((j) => j.id === id) ?? null))
      .catch(() => {})

    fetch('/api/jobs/' + id + '/leads')
      .then(async (r) => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.error || 'Could not load leads')
        setData(body)
      })
      .catch((e) => setError(e.message))
  }, [id])

  const leads = data?.leads ?? []

  const categories = useMemo(() => [...new Set(leads.map((l) => l.category).filter(Boolean))].sort(), [leads])
  const cities = useMemo(() => [...new Set(leads.map((l) => l.city).filter(Boolean))].sort(), [leads])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter(
      (l) =>
        (!category || l.category === category) &&
        (!city || l.city === city) &&
        (!onlyEmail || l.emails) &&
        (!q || l.business_name.toLowerCase().includes(q) || l.domain.includes(q))
    )
  }, [leads, search, category, city, onlyEmail])

  function downloadCsv() {
    const rows = filtered.map((l) => ({
      ...l,
      project_name: job?.name ?? '',
      source_query: job?.keywords.join(' | ') ?? '',
      scraped_at: job?.date ?? '',
      lead_status: 'New',
      notes: '',
    }))
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const slug = (job?.name ?? 'leads').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    a.href = url
    a.download = slug + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <Link to="/" className="mt-4 inline-block text-sm text-blue-700 hover:underline">
        &larr; All projects
      </Link>
      <h2 className="mt-2 text-xl font-semibold text-gray-900">{job?.name ?? 'Project'}</h2>
      {job && <p className="text-sm text-gray-500">{job.keywords.join(' | ')}</p>}

      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-6">
            <Stat label="Businesses" value={data.summary.total} />
            <Stat label="With website" value={data.summary.withWebsite} />
            <Stat label="With phone" value={data.summary.withPhone} />
            <Stat label="With email" value={data.summary.withEmail} />
            <Stat label="Emails passing checks" value={data.summary.emailsOk} />
            <Stat label="Duplicates removed" value={data.summary.duplicatesRemoved} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or domain"
              className="w-64 rounded border border-gray-300 bg-white px-3 py-2 text-sm"
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">All cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={onlyEmail} onChange={(e) => setOnlyEmail(e.target.checked)} />
            Only with email
            </label>
            <span className="text-sm text-gray-500">
              Showing {filtered.length} of {leads.length}
            </span>
            <button onClick={downloadCsv} className="ml-auto rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
              Download CSV
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.place_id || l.google_maps_url} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{l.business_name}</td>
                    <td className="px-4 py-3 text-gray-600">{l.category}</td>
                    <td className="px-4 py-3 text-gray-600">{l.city}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{l.phone}</td>
                    <td className="px-4 py-3">
                      {l.website && (
                        <a href={l.website} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                          {l.domain}
                        </a>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {l.rating ? Number(l.rating).toFixed(1) : '-'} ({l.review_count || 0})
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                    {l.email ? (
                        <>
                        <div>{l.email}</div>
                        <span className={'mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ' + (emailBadge[l.email_status] || 'bg-gray-100 text-gray-700')}>
                            {emailLabel[l.email_status] || l.email_status}
                        </span>
                        {l.email_domain_match === false && <span className="ml-1 text-xs text-yellow-700">domain differs</span>}
                        </>
                    ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <a href={l.google_maps_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                        Maps
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}