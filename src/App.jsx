import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Topbar from './components/Topbar'
import Sidebar from './components/Sidebar'
import Users from './pages/Users'
import Deposit from './pages/Deposit'
import Cancel from './pages/Cancel'
import History from './pages/History'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="app-root">
      <Topbar onToggleSidebar={() => setSidebarOpen(v => !v)} />
      <Sidebar open={sidebarOpen} />

      <main className={`main ${sidebarOpen ? 'with-sidebar' : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/users" replace />} />
          <Route path="/users" element={<Users />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/cancel" element={<Cancel />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/users" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
