import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Alerts from './pages/Alerts'
import DeviceManagement from './pages/DeviceManagement'
import ScenarioBuilder from './pages/ScenarioBuilder'
import CustomScenarioBuilder from './pages/CustomScenarioBuilder'
import Rules from './pages/Rules'
import AdminUsers from './pages/AdminUsers'
import AttackProposals from './pages/AttackProposals'
import SecurityAwareness from './pages/SecurityAwareness'
import Nav from './components/Nav'
import ProtectedRoute from './components/ProtectedRoute'

export interface ActiveAttack {
  runId: string
  scenarioId: string
  scenarioName: string
  attackPattern: string
  targetComponent: string
  durationSeconds: number
  startedAt: string
  targetDeviceId?: string
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ username?: string; role?: string } | null>(null)
  const [activeAttack, setActiveAttack] = useState<ActiveAttack | null>(null)

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
      {isAuthenticated && <Nav user={user} activeAttack={activeAttack} onLogout={() => {
        localStorage.removeItem('token')
        setIsAuthenticated(false)
        setUser(null)
      }} />}
      <Routes>
        <Route path="/login" element={<Login onLogin={(u) => { setIsAuthenticated(true); setUser(u) }} />} />
        <Route path="/" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            <Overview user={user} activeAttack={activeAttack} onAttackEnd={() => setActiveAttack(null)} />
          </ProtectedRoute>
        } />
        <Route path="/alerts" element={<ProtectedRoute isAuth={isAuthenticated}><Alerts /></ProtectedRoute>} />
        <Route path="/devices" element={<ProtectedRoute isAuth={isAuthenticated}><DeviceManagement user={user} /></ProtectedRoute>} />
        <Route path="/scenarios" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            <ScenarioBuilder onAttackLaunched={setActiveAttack} />
          </ProtectedRoute>
        } />
        <Route path="/scenarios/custom" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            <CustomScenarioBuilder />
          </ProtectedRoute>
        } />
        <Route path="/rules" element={<ProtectedRoute isAuth={isAuthenticated}><Rules /></ProtectedRoute>} />
        <Route path="/awareness" element={<ProtectedRoute isAuth={isAuthenticated}><SecurityAwareness /></ProtectedRoute>} />
        <Route path="/proposals" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            <AttackProposals user={user} />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={<ProtectedRoute isAuth={isAuthenticated}><AdminUsers user={user} /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
