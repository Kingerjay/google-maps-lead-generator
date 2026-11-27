import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MultiSelect from '../components/MultiSelect.jsx'
import ProjectsTable from '../components/ProjectsTable.jsx'
import { CATEGORIES } from '../data/categories.js'
import { useJobs } from '../lib/useJobs.js'
import { normalizePlace } from '../lib/places.js'

const MAX_SEARCHES = 100
// Rough guesses from a few test runs, not GoSOM figures. Tune these as you time more projects.
const MIN_PER_SEARCH = 1
const MAX_PER_SEARCH = 4
const STEPS = [
  'Preparing your searches...',
  'Connecting to the scraper...',
  'Starting the scrape...',
  'Almost ready...',
]

const lines = (text) => text.split('\n').map((s) => s.trim()).filter(Boolean)

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  )
}

export default function NewScrape() {
  const navigate = useNavigate()
  const { jobs, error, remove } = useJobs()

  const [mode, setMode] = useState('guided')
  const [plainText, setPlainText] = useState('')
  const [cats, setCats] = useState([])
  const [countryCode, setCountryCode] = useState('US')
  const [stateCode, setStateCode] = useState('')
  const [cities, setCities] = useState([])
  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')
  const [csc, setCsc] = useState(null)
  const [zips, setZips] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [starting, setStarting] = useState(null)

  useEffect(() => {
    import('country-state-city').then(setCsc)
    import('../data/us-zips.json').then((m) => setZips(m.default))
  }, [])

  const countries = useMemo(() => (csc ? csc.Country.getAllCountries() : []), [csc])
  const country = countries.find((c) => c.isoCode === countryCode)
  const states = useMemo(
    () => (csc && countryCode ? csc.State.getStatesOfCountry(countryCode) : []),
    [csc, countryCode]
  )
  const state = states.find((s) => s.isoCode === stateCode)
  const cityOptions = useMemo(() => {
    if (!csc || !stateCode) return []
    const names = csc.City.getCitiesOfState(countryCode, stateCode).map((c) => c.name)
    return [...new Set(names)].sort()
  }, [csc, countryCode, stateCode])

  // A picked city gets its state and country added; a typed place is used exactly as typed
  const placeText = (p) =>
    cityOptions.includes(p) ? p + ', ' + state.name + ', ' + country.name : p

  // ZIP codes for a picked US city. A typed place or a city missing from the data gets none.
  const zipsFor = (p) =>
    countryCode === 'US' && cityOptions.includes(p)
      ? (zips?.[stateCode]?.[normalizePlace(p)] ?? [])
      : []

  const plan = useMemo(() => {
    if (mode === 'plain') return { searches: [...new Set(lines(plainText))], zipCount: 0, noZip: 0 }
    const list = []
    let zipCount = 0
    let noZip = 0
    for (const p of cities) {
      const z = zipsFor(p)
      if (z.length) zipCount += z.length
      else noZip++
      for (const c of cats) {
        if (z.length) z.forEach((code) => list.push(c + ', ' + code + ', ' + p + ', ' + stateCode + ', US'))
        else list.push(c + ' ' + placeText(p))
      }
    }
    return { searches: [...new Set(list)], zipCount, noZip }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, plainText, cats, cities, cityOptions, state, country, zips, stateCode, countryCode])
  const searches = plan.searches

  const projectName = () =>
    name.trim() || (mode === 'plain' ? searches[0] : cats[0] + ' - ' + cities.slice(0, 2).join(', '))

  function review(e) {
    e.preventDefault()

    if (mode === 'guided' && countryCode === 'US' && !zips) {
      setFormError('ZIP code data is still loading. Try again in a moment.')
      return
    }

    if (searches.length === 0) {
      setFormError(
        mode === 'plain'
          ? 'Enter at least one search query.'
          : 'Choose at least one business type and one location.'
      )
      return
    }
    if (searches.length > MAX_SEARCHES) {
      setFormError('That is ' + searches.length + ' searches. Keep it to ' + MAX_SEARCHES + ' or fewer per project: pick fewer cities or business types, or split it into several projects.')
      return
    }
    setFormError('')
    setConfirming(true)
  }

  async function launch() {
    setConfirming(false)
    setStarting({ step: 0, pct: 5 })
    const started = Date.now()
    const timers = [
      setTimeout(() => setStarting({ step: 1, pct: 35 }), 1200),
      setTimeout(() => setStarting({ step: 2, pct: 65 }), 2600),
      setTimeout(() => setStarting({ step: 3, pct: 90 }), 4000),
    ]
    try {
      const r = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName(),
          keywords: searches,
          maxTime: Math.min(21600, Math.max(1800, searches.length * 300)),
        }),
      })
      if (!r.ok) throw new Error('failed')
      // Keep the progress screen up for at least 5 seconds
      await new Promise((res) => setTimeout(res, Math.max(0, 5000 - (Date.now() - started))))
      timers.forEach(clearTimeout)
      setStarting({ step: 3, pct: 100 })
      navigate('/projects')
    } catch {
      timers.forEach(clearTimeout)
      setStarting(null)
      setFormError('Could not start the scrape. Is the server running?')
    }
  }

  return (
    <div>
      <form onSubmit={review} className="mt-6 max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New scrape</h2>
          <div className="inline-flex overflow-hidden rounded border border-gray-300 text-sm">
            {[['guided', 'Guided'], ['plain', 'Plain queries']].map(([m, text]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={'px-3 py-1.5 ' + (mode === m ? 'bg-gray-900 text-white' : 'bg-white text-gray-700')}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {mode === 'plain' ? (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Search queries (one per line)</label>
            <textarea
              value={plainText}
              onChange={(e) => setPlainText(e.target.value)}
              rows={4}
              placeholder={'vacation rental management company Destin FL\nproperty management Destin FL'}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">Search as you would on Google Maps: business type + location.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <MultiSelect
              label="Business type"
              title="Categories"
              options={CATEGORIES}
              selected={cats}
              onChange={setCats}
              placeholder="Select business types"
              allowCustom
              customHint="(your own)"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <select
                  value={countryCode}
                  onChange={(e) => { setCountryCode(e.target.value); setStateCode(''); setCities([]) }}
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {countries.length === 0 && <option>Loading...</option>}
                  {countries.map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">State / region</label>
                <select
                  value={stateCode}
                  onChange={(e) => { setStateCode(e.target.value); setCities([]) }}
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select a state</option>
                  {states.map((s) => (
                    <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <MultiSelect
              label="Cities / places"
              title="Cities"
              options={cityOptions}
              selected={cities}
              onChange={setCities}
              placeholder={stateCode ? 'Select cities' : 'Pick a state first, or type a place'}
              allowCustom
              customHint="(use as typed, e.g. Siesta Key, FL)"
            />
          </div>
        )}

        <label className="mt-4 block text-sm font-medium text-gray-700">Project name (optional)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Filled in automatically if left blank"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />

{searches.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            <p>
              {searches.length} search{searches.length > 1 ? 'es' : ''} will run, for example: "{searches[0]}"
            </p>
            {plan.zipCount > 0 && (
              <p className="mt-1">Includes {plan.zipCount} ZIP codes, searched one by one for wider coverage.</p>
            )}
            {mode === 'guided' && plan.noZip > 0 && (
              <p className="mt-1">
                {plan.noZip} place{plan.noZip > 1 ? 's have' : ' has'} no ZIP data and will run as a single search.
              </p>
            )}
            {searches.length > MAX_SEARCHES && (
              <p className="mt-1 text-red-600">Over the limit of {MAX_SEARCHES} searches per project.</p>
            )}
          </div>
        )}

        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

        <button
          type="submit"
          className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Start scrape
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold text-gray-900">Recent projects</h2>
      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="mt-4">
        <ProjectsTable jobs={jobs.slice(0, 5)} onDelete={remove} />
      </div>
      {jobs.length > 5 && (
        <Link
          to="/projects"
          className="mt-4 inline-block rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          See more
        </Link>
      )}

      {confirming && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Confirm your scrape</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setConfirming(false)}
                className="rounded px-2 text-xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                &times;
              </button>
            </div>

            <p className="mt-3 rounded bg-blue-50 p-3 text-sm text-blue-900">
              These are rough estimates. The actual results depend on what Google Maps returns for each search.
            </p>

            <div className="mt-4 rounded border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-900">Searches to run</p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                {searches.slice(0, 3).map((s) => (
                  <li key={s} className="truncate" title={s}>{s}</li>
                ))}
              </ul>
              {searches.length > 3 && (
                <p className="mt-2 text-sm text-gray-500">
                  ... <strong>{searches.length - 3}</strong> more search{searches.length - 3 > 1 ? 'es' : ''}
                </p>
              )}
            </div>

            <div className="mt-4 rounded border border-gray-200 p-4 text-sm">
              <Row label="Project" value={projectName()} />
              <Row label="Searches" value={searches.length} />
              {plan.zipCount > 0 && <Row label="ZIP codes covered" value={plan.zipCount} />}
              <Row label="Email extraction" value="On" />
              <Row label="Cost" value="Free (runs on your computer)" />
              <Row
                label="Estimated time"
                value={searches.length * MIN_PER_SEARCH + ' - ' + searches.length * MAX_PER_SEARCH + ' minutes'}
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={launch}
                className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {starting && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
              <div
                className="h-full bg-gray-900 transition-all duration-700 ease-out"
                style={{ width: starting.pct + '%' }}
              />
            </div>
            <p className="mt-3 text-sm text-gray-700">{STEPS[starting.step]}</p>
          </div>
        </div>
      )}
    </div>
  )
}