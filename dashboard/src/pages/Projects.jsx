import ProjectsTable from '../components/ProjectsTable.jsx'
import { useJobs } from '../lib/useJobs.js'

export default function Projects() {
  const { jobs, error, remove } = useJobs()

  return (
    <div>
      <h2 className="mt-6 text-xl font-semibold text-gray-900">Projects</h2>
      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="mt-4">
        <ProjectsTable jobs={jobs} onDelete={remove} />
      </div>
    </div>
  )
}