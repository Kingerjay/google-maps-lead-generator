import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const GAP = 4 // matches the gap between chips (gap-1)
const RESERVE = 84 // room kept free for the "+N more" badge
const chipClass =
  'inline-flex max-w-[10rem] shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800'

export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  title,
  allowCustom = false,
  customHint = '',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(selected.length)
  const box = useRef(null)
  const chipsArea = useRef(null)
  const measureRow = useRef(null)

  // Close the dropdown when clicking elsewhere
  useEffect(() => {
    const close = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // Work out how many chips fit on one row; the rest become "+N more"
  useLayoutEffect(() => {
    const compute = () => {
      const area = chipsArea.current
      const row = measureRow.current
      if (!area || !row) return
      const widths = [...row.children].map((c) => c.offsetWidth + GAP)
      const available = area.clientWidth
      if (widths.reduce((a, b) => a + b, 0) <= available) {
        setVisible(widths.length)
        return
      }
      let used = 0
      let count = 0
      for (const w of widths) {
        if (used + w > available - RESERVE) break
        used += w
        count++
      }
      setVisible(count)
    }
    compute()
    const ro = new ResizeObserver(compute)
    if (chipsArea.current) ro.observe(chipsArea.current)
    return () => ro.disconnect()
  }, [selected])

  const q = query.trim().toLowerCase()
  const allMatches = useMemo(
    () => options.filter((o) => !q || o.toLowerCase().includes(q)),
    [options, q]
  )
  const matches = allMatches
  
  const extra = selected.filter((s) => !options.includes(s) && (!q || s.toLowerCase().includes(q)))
  const canAdd =
    allowCustom &&
    q &&
    !options.some((o) => o.toLowerCase() === q) &&
    !selected.some((s) => s.toLowerCase() === q)

  const toggle = (value) =>
    onChange(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value])

  const addCustom = () => {
    onChange([...selected, query.trim()])
    setQuery('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (canAdd) addCustom()
    else if (matches.length === 1 && extra.length === 0) toggle(matches[0])
  }

  const chip = (s) => (
    <span key={s} className={chipClass}>
      <span className="truncate">{s}</span>
      <button
        type="button"
        aria-label={'Remove ' + s}
        onClick={(e) => {
          e.stopPropagation()
          toggle(s)
        }}
        className="text-gray-500 hover:text-gray-900"
      >
        &times;
      </button>
    </span>
  )

  const hidden = selected.length - visible

  return (
    <div ref={box}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="relative mt-1">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(!open)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen(!open)
            }
          }}
          className="flex h-10 w-full cursor-pointer items-center gap-2 overflow-hidden rounded border border-gray-300 bg-white px-3 text-sm"
        >
          <div ref={chipsArea} className="relative min-w-0 flex-1 overflow-hidden">
            {selected.length === 0 ? (
              <span className="text-gray-400">{placeholder}</span>
            ) : (
              <div className="flex items-center gap-1 whitespace-nowrap">
                {selected.slice(0, visible).map(chip)}
                {hidden > 0 && (
                  <span className="inline-flex shrink-0 rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-700">
                    +{hidden} more
                  </span>
                )}
              </div>
            )}
            {/* Invisible copy of all chips, used only to measure widths */}
            <div
              ref={measureRow}
              aria-hidden="true"
              className="pointer-events-none invisible absolute left-0 top-0 flex gap-1 whitespace-nowrap"
            >
              {selected.map(chip)}
            </div>
          </div>
          <span className="text-gray-400">&#9662;</span>
        </div>

        {open && (
                    <div className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
                      <span className="text-sm font-semibold text-gray-900">{title ?? label}</span>
                      <button
                        type="button"
                        title="Close"
                        aria-label="Close"
                        onClick={() => setOpen(false)}
                        className="rounded px-2 text-lg leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      >
                        &times;
                      </button>
                    </div>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={allowCustom ? 'Search or type your own' : 'Search'}
              className="w-full border-b border-gray-200 px-3 py-2 text-sm outline-none"
            />
            <div className="max-h-56 overflow-y-auto">
              {canAdd && (
                <button
                  type="button"
                  onClick={addCustom}
                  className="block w-full px-3 py-2 text-left text-sm text-blue-700 hover:bg-gray-50"
                >
                  Add "{query.trim()}" {customHint}
                </button>
              )}
              {[...extra, ...matches].map((o) => (
                <label key={o} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
                  {o}
                </label>
              ))}
              {matches.length === 0 && extra.length === 0 && !canAdd && (
                <p className="px-3 py-2 text-sm text-gray-500">No matches</p>
              )}
              
            </div>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span>{selected.length} selected</span>
          <button type="button" onClick={() => onChange([])} className="text-blue-700 hover:underline">
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}