import { Link, NavLink, Route, Routes } from 'react-router-dom'
import NewScrape from './pages/NewScrape.jsx'
import Projects from './pages/Projects.jsx'
import ProjectDetails from './pages/ProjectDetails.jsx'

const navClass = ({ isActive }) =>
  'rounded px-3 py-1.5 text-sm font-medium ' +
  (isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100')

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="text-2xl font-bold text-gray-900">
          Google Maps Lead Generator
        </Link>
        <nav className="flex gap-2">
          <NavLink to="/" end className={navClass}>New scrape</NavLink>
          <NavLink to="/projects" className={navClass}>Projects</NavLink>
        </nav>
      </div>
      <Routes>
        <Route path="/" element={<NewScrape />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
      </Routes>

      <p className="mt-10 text-xs text-gray-400">
        ZIP code data from{' '}
        <a href="https://www.geonames.org" target="_blank" rel="noreferrer" className="underline">
          GeoNames
        </a>{' '}
        (CC BY).
      </p>
      
    </div>
  )
}