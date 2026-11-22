import { Link, Route, Routes } from 'react-router-dom'
import Projects from './pages/Projects.jsx'
import ProjectDetails from './pages/ProjectDetails.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Link to="/" className="text-2xl font-bold text-gray-900">
        Google Maps Lead Generator
      </Link>
      <Routes>
        <Route path="/" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
      </Routes>
    </div>
  )
}