import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const badge = {
  ok: 'bg-green-100 text-green-800',
  working: 'bg-yellow-100 text-yellow-800',
}

export default function Projects() {
  const [jobs, setJobs] = useState([])
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [queries, setQueries] = useState('')
  const [email, setEmail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(
    () =>
      fetch('/api/jobs')
        .then((r) => r.json())
        .then((data) => { setJobs(data); setError('') })
        .catch(() => setError('Cannot reach the server on port 3001')),
    []
  )

  useEffect(() => {
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [load])

  async function startScrape(e) {
    e.preventDefault()
    const keywords = queries.split('\n').map((q) => q.trim()).filter(Boolean)
    if (!name.trim() || keywords.length === 0) {
      setFormError('Enter a project name and at least one search query.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const r = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), keywords, email }),
      })
      if (!r.ok) throw new Error('failed')
      setName('')
      setQueries('')
      setEmail(false)
      await load()
    } catch {
      setFormError('Could not start the scrape. Is the server running?')
    }
    setSaving(false)
  }

  async function remove(job) {
    if (!window.confirm('Delete "' + job.name + '"?')) return
    await fetch('/api/jobs/' + job.id, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <form onSubmit={startScrape} className="mt-6 max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">New scrape</h2>

        <label className="mt-4 block text-sm font-medium text-gray-700">Project name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Destin FL Vacation Rentals"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />

        <label className="mt-4 block text-sm font-medium text-gray-700">Search queries (one per line)</label>
        <textarea
          value={queries}
          onChange={(e) => setQueries(e.target.value)}
          rows={3}
          placeholder={'vacation rental management company Destin FL\nproperty management Destin FL'}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />

        <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} />
          Extract emails from websites (slower)
        </label>

        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? 'Starting...' : 'Start scrape'}
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold text-gray-900">Projects</h2>
      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Search queries</th>
              <th className="px-4 py-3">Emails</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {j.status === 'ok' ? (
                    <Link to={'/projects/' + j.id} className="text-blue-700 hover:underline">
                      {j.name}
                    </Link>
                  ) : (
                    j.name
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{j.keywords.join(', ')}</td>
                <td className="px-4 py-3 text-gray-600">{j.email ? 'On' : 'Off'}</td>
                <td className="px-4 py-3">
                  <span className={'rounded-full px-2 py-1 text-xs font-medium ' + (badge[j.status] || 'bg-gray-100 text-gray-700')}>
                    {j.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{new Date(j.date).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(j)} className="text-sm text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}