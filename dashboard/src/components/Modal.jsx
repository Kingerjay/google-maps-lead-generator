import { useEffect } from 'react'

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', esc)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden' // stop the page scrolling behind the popup
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded px-2 text-xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}