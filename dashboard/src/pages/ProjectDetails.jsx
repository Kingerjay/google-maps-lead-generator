import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { buildRows, saveCsv, saveText } from '../lib/csv.js'
import DownloadMenu from '../components/DownloadMenu.jsx'
import Modal from '../components/Modal.jsx'


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
  const [showQueries, setShowQueries] = useState(false)

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
        (!onlyEmail || l.emails.length > 0) &&
        (!q || l.business_name.toLowerCase().includes(q) || l.domain.includes(q))
    )
  }, [leads, search, category, city, onlyEmail])

  const emailList = useMemo(() => [...new Set(filtered.flatMap((l) => l.emails))], [filtered])
  const phoneList = useMemo(() => [...new Set(filtered.map((l) => l.phone).filter(Boolean))], [filtered])

  return (
    <div>
      <Link to="/projects" className="mt-4 inline-block text-sm text-blue-700 hover:underline">
        &larr; All projects
      </Link>
      <h2 className="mt-2 text-xl font-semibold text-gray-900">{job?.name ?? 'Project'}</h2>
      {job && <p className="text-sm text-gray-500">Started {new Date(job.date).toLocaleString()}</p>}

      {job && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <span className="shrink-0 text-sm font-medium text-gray-700">
            Search queries ({job.keywords.length})
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-gray-600" title={job.keywords.join('\n')}>
            {job.keywords.join('  |  ')}
          </span>
          {job.keywords.length > 1 && (
            <button
              type="button"
              onClick={() => setShowQueries(true)}
              className="shrink-0 text-sm font-medium text-blue-700 hover:underline"
            >
              See more
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-6">
            <Stat label="Businesses" value={data.summary.total} />
            <Stat label="With website" value={data.summary.withWebsite} />
            <Stat label="With phone" value={data.summary.withPhone} />
            <Stat label="With email" value={data.summary.withEmail} />
            <Stat label="Emails found" value={data.summary.emailsFound} />
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
            
            <div className="ml-auto">
              <DownloadMenu
                disabled={!job}
                items={[
                  {
                    label: 'All Data (.csv)',
                    note: filtered.length + ' rows',
                    onClick: () => saveCsv(buildRows(filtered, job), job.name),
                  },
                  {
                    label: 'Emails only (.txt)',
                    note: emailList.length + ' emails',
                    disabled: emailList.length === 0,
                    onClick: () => saveText(emailList, job.name, 'emails'),
                  },
                  {
                    label: 'Phone numbers only (.txt)',
                    note: phoneList.length + ' numbers',
                    disabled: phoneList.length === 0,
                    onClick: () => saveText(phoneList, job.name, 'phones'),
                  },
                ]}
              />
            </div>

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
                      {l.emails.length ? l.emails.map((e) => <div key={e}>{e}</div>) : '-'}
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

{showQueries && job && (
        <Modal title={'Search queries (' + job.keywords.length + ')'} onClose={() => setShowQueries(false)}>
          <ol className="space-y-2">
            {job.keywords.map((k, i) => (
              <li key={k} className="flex gap-3 rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <span className="w-8 shrink-0 text-right text-gray-400">{i + 1}.</span>
                <span className="break-words">{k}</span>
              </li>
            ))}
          </ol>
        </Modal>
      )}

    </div>
  )
}