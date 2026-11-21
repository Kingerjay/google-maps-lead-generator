import { useEffect, useState } from 'react'

const badge = {
  ok: 'bg-green-100 text-green-800',
  working: 'bg-yellow-100 text-yellow-800',
}

export default function App() {
  const [jobs, setJobs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const load = () =>
      fetch('/api/jobs')
        .then((r) => r.json())
        .then((data) => { setJobs(data); setError('') })
        .catch(() => setError('Cannot reach the server on port 3001'))
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900">Google Maps Lead Generator</h1>
      <p className="mt-1 text-sm text-gray-500">Projects</p>

      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Search queries</th>
              <th className="px-4 py-3">Emails</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{j.name}</td>
                <td className="px-4 py-3 text-gray-600">{j.keywords.join(', ')}</td>
                <td className="px-4 py-3 text-gray-600">{j.email ? 'On' : 'Off'}</td>
                <td className="px-4 py-3">
                  <span className={'rounded-full px-2 py-1 text-xs font-medium ' + (badge[j.status] || 'bg-gray-100 text-gray-700')}>
                    {j.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{new Date(j.date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
