import { useCallback, useEffect, useState } from 'react'

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [error, setError] = useState('')

  const reload = useCallback(
    () =>
      fetch('/api/jobs')
        .then((r) => r.json())
        .then((data) => {
          setJobs([...data].sort((a, b) => new Date(b.date) - new Date(a.date)))
          setError('')
        })
        .catch(() => setError('Cannot reach the server on port 3001')),
    []
  )

  useEffect(() => {
    reload()
    const timer = setInterval(reload, 5000)
    return () => clearInterval(timer)
  }, [reload])

  const remove = useCallback(
    async (job) => {
      if (!window.confirm('Delete "' + job.name + '"?')) return
      await fetch('/api/jobs/' + job.id, { method: 'DELETE' })
      reload()
    },
    [reload]
  )

  return { jobs, error, reload, remove }
}