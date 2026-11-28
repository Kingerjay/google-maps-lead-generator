import { useEffect, useRef, useState } from 'react'

export default function DownloadMenu({ items, disabled = false }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false)
    }
    const esc = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        Download <span aria-hidden="true">&#9662;</span>
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-64 rounded border border-gray-200 bg-white py-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white"
            >
              <span>{item.label}</span>
              {item.note && <span className="text-xs text-gray-500">{item.note}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}