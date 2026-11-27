import { useState } from 'react'
import { Link } from 'react-router-dom'
import { downloadJobCsv } from '../lib/csv.js'

const STATUS = {
  working: { label: 'Ongoing', cls: 'bg-yellow-100 text-yellow-800' },
  ok: { label: 'Completed', cls: 'bg-green-100 text-green-800' },
}

const svg = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'h-5 w-5',
}

export default function ProjectsTable({ jobs, onDelete }) {
  const [busy, setBusy] = useState('')

  async function download(job) {
    setBusy(job.id)
    try {
      await downloadJobCsv(job)
    } catch (e) {
      window.alert(e.message || 'Could not download the CSV')
    }
    setBusy('')
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Project</th>
            <th className="px-4 py-3">Search queries</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                No projects yet.
              </td>
            </tr>
          )}
          {jobs.map((j) => {
            const s = STATUS[j.status] ?? { label: j.status, cls: 'bg-gray-100 text-gray-700' }
            const done = j.status === 'ok'
            return (
              <tr key={j.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-mono text-xs text-gray-500" title={j.id}>
                  {j.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <div className="max-w-[14rem] truncate" title={j.name}>{j.name}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="max-w-[18rem] truncate" title={j.keywords.join('\n')}>
                    {j.keywords.join(', ')}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={'rounded-full px-2 py-1 text-xs font-medium ' + s.cls}>{s.label}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{new Date(j.date).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      title="Download CSV"
                      aria-label="Download CSV"
                      disabled={!done || busy === j.id}
                      onClick={() => download(j)}
                      className="text-gray-600 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <svg {...svg}><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" /></svg>
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      aria-label="Delete"
                      onClick={() => onDelete(j)}
                      className="text-gray-600 hover:text-red-600"
                    >
                      <svg {...svg}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
                    </button>
                    {done ? (
                      <Link to={'/projects/' + j.id} className="whitespace-nowrap text-blue-700 hover:underline">
                        View details
                      </Link>
                    ) : (
                      <span className="whitespace-nowrap text-gray-400">View details</span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}