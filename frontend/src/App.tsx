import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Alerts from './pages/Alerts'
import ScenarioBuilder from './pages/ScenarioBuilder'
import Rules from './pages/Rules'
import AdminUsers from './pages/AdminUsers'
import Nav from './components/Nav'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsAuthenticated(true)
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()).then(setUser).catch(() => {})
    }
  }, [])

  return (
    <BrowserRouter>
      {isAuthenticated && <Nav user={user} onLogout={() => {
        localStorage.removeItem('token')
        setIsAuthenticated(false)
        setUser(null)
      }} />}
      <Routes>
        <Route path="/login" element={<Login onLogin={(u) => { setIsAuthenticated(true); setUser(u) }} />} />
        <Route path="/" element={<ProtectedRoute isAuth={isAuthenticated}><Overview user={user} /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute isAuth={isAuthenticated}><Alerts /></ProtectedRoute>} />
        <Route path="/scenarios" element={<ProtectedRoute isAuth={isAuthenticated}><ScenarioBuilder /></ProtectedRoute>} />
        <Route path="/rules" element={<ProtectedRoute isAuth={isAuthenticated}><Rules /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute isAuth={isAuthenticated}><AdminUsers user={user} /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
