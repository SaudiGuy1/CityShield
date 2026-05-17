import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
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
import SmartCityDashboard from './pages/SmartCityDashboard'
import TeamAnalytics from './pages/TeamAnalytics'
import ResolutionAnalytics from './pages/ResolutionAnalytics'
import { useLang } from './hooks/useLang'
import { useTheme } from './hooks/useTheme'
import Nav from './components/Nav'
import ProtectedRoute from './components/ProtectedRoute'
import CityBackground from './components/CityBackground'
import PageTransition from './components/PageTransition'

// Roles whose default surface is restricted away from the analyst dashboard.
// Each entry is redirected to its landing route when it visits a non-permitted page.
const LIMITED_ROLES = ['Viewer', 'Manager']
const LANDING: Record<string, string> = { Viewer: '/awareness', Manager: '/team' }

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

function AnimatedRoutes({
  isAuthenticated,
  user,
  activeAttack,
  setActiveAttack,
  setIsAuthenticated,
  setUser,
}: {
  isAuthenticated: boolean
  user: { username?: string; role?: string } | null
  activeAttack: ActiveAttack | null
  setActiveAttack: (a: ActiveAttack | null) => void
  setIsAuthenticated: (v: boolean) => void
  setUser: (u: { username?: string; role?: string } | null) => void
}) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={
          <PageTransition>
            <Login onLogin={(u) => { setIsAuthenticated(true); setUser(u) }} />
          </PageTransition>
        } />
        <Route path="/" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            {LIMITED_ROLES.includes(user?.role ?? '') ? <Navigate to={LANDING[user?.role ?? ''] ?? '/awareness'} replace /> : (
              <PageTransition>
                <Overview user={user} activeAttack={activeAttack} onAttackEnd={() => setActiveAttack(null)} />
              </PageTransition>
            )}
          </ProtectedRoute>
        } />
        <Route path="/alerts" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            {LIMITED_ROLES.includes(user?.role ?? '') ? <Navigate to={LANDING[user?.role ?? ''] ?? '/awareness'} replace /> : (
              <PageTransition><Alerts activeAttack={activeAttack} /></PageTransition>
            )}
          </ProtectedRoute>
        } />
        <Route path="/devices" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            {LIMITED_ROLES.includes(user?.role ?? '') ? <Navigate to={LANDING[user?.role ?? ''] ?? '/awareness'} replace /> : (
              <PageTransition><DeviceManagement user={user} /></PageTransition>
            )}
          </ProtectedRoute>
        } />
        <Route path="/scenarios" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            {LIMITED_ROLES.includes(user?.role ?? '') ? <Navigate to={LANDING[user?.role ?? ''] ?? '/awareness'} replace /> : (
              <PageTransition><ScenarioBuilder onAttackLaunched={setActiveAttack} /></PageTransition>
            )}
          </ProtectedRoute>
        } />
        <Route path="/scenarios/custom" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            {LIMITED_ROLES.includes(user?.role ?? '') ? <Navigate to={LANDING[user?.role ?? ''] ?? '/awareness'} replace /> : (
              <PageTransition><CustomScenarioBuilder /></PageTransition>
            )}
          </ProtectedRoute>
        } />
        <Route path="/rules" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            {LIMITED_ROLES.includes(user?.role ?? '') ? <Navigate to={LANDING[user?.role ?? ''] ?? '/awareness'} replace /> : (
              <PageTransition><Rules /></PageTransition>
            )}
          </ProtectedRoute>
        } />
        <Route path="/awareness" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            <PageTransition><SecurityAwareness /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/team" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            {user?.role === 'Manager' || user?.role === 'Administrator' ? (
              <PageTransition><TeamAnalytics user={user} /></PageTransition>
            ) : <Navigate to={LANDING[user?.role ?? ''] ?? '/awareness'} replace />}
          </ProtectedRoute>
        } />
        <Route path="/analytics/resolutions" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            {user?.role === 'Analyst' || user?.role === 'Administrator' ? (
              <PageTransition><ResolutionAnalytics /></PageTransition>
            ) : <Navigate to={LANDING[user?.role ?? ''] ?? '/'} replace />}
          </ProtectedRoute>
        } />
        <Route path="/proposals" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            {LIMITED_ROLES.includes(user?.role ?? '') ? <Navigate to={LANDING[user?.role ?? ''] ?? '/awareness'} replace /> : (
              <PageTransition><AttackProposals user={user} /></PageTransition>
            )}
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            {LIMITED_ROLES.includes(user?.role ?? '') ? <Navigate to={LANDING[user?.role ?? ''] ?? '/awareness'} replace /> : (
              <PageTransition><AdminUsers user={user} /></PageTransition>
            )}
          </ProtectedRoute>
        } />
        <Route path="/city" element={
          <ProtectedRoute isAuth={isAuthenticated}>
            {LIMITED_ROLES.includes(user?.role ?? '') ? <Navigate to={LANDING[user?.role ?? ''] ?? '/awareness'} replace /> : (
              <SmartCityDashboard />
            )}
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to={LANDING[user?.role ?? ''] ?? '/'} />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ username?: string; role?: string } | null>(null)
  const [activeAttack, setActiveAttack] = useState<ActiveAttack | null>(null)
  const { dir, lang } = useLang()
  const { theme } = useTheme()

  // Propagate the active language + theme to <html> so global CSS (RTL,
  // light-theme variables, font stack) flips synchronously without
  // requiring every page to spread `dir` on its own container.
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('dir', dir)
    html.setAttribute('lang', lang)
    html.setAttribute('data-theme', theme)
  }, [dir, lang, theme])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => {
        if (res.ok) return res.json()
        throw new Error('Token expired')
      }).then(u => {
        setUser(u)
        setIsAuthenticated(true)
      }).catch(() => {
        localStorage.removeItem('token')
        setIsAuthenticated(false)
        setUser(null)
      })
    }
  }, [])

  return (
    <BrowserRouter>
      {/* City skyline background - always visible */}
      <CityBackground />

      {/* Sidebar nav when authenticated */}
      {isAuthenticated && <Nav user={user} activeAttack={activeAttack} onLogout={() => {
        localStorage.removeItem('token')
        setIsAuthenticated(false)
        setUser(null)
      }} />}

      {/* Main content area */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AnimatedRoutes
          isAuthenticated={isAuthenticated}
          user={user}
          activeAttack={activeAttack}
          setActiveAttack={setActiveAttack}
          setIsAuthenticated={setIsAuthenticated}
          setUser={setUser}
        />
      </div>
    </BrowserRouter>
  )
}

export default App
