import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLang } from '../hooks/useLang'
import LangToggle from '../components/LangToggle'
import ThemeToggle from '../components/ThemeToggle'

export default function Login({ onLogin }: { onLogin: (user: { username?: string; role?: string }) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { tk } = useLang()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('token', data.access_token)

        const userRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        })
        const user = await userRes.json()
        onLogin(user)
        navigate('/')
      } else {
        setError(tk('login.error'))
      }
    } catch (err) {
      setError(tk('login.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-container">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <LangToggle />
          <ThemeToggle />
        </div>
        <div className="login-brand">{tk('login.title').toUpperCase()}</div>
        <div className="login-subtitle">{tk('login.subtitle')}</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{tk('login.username')}</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={tk('login.username')}
              required
            />
          </div>
          <div className="form-group">
            <label>{tk('login.password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={tk('login.password')}
              required
            />
          </div>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? tk('login.signing_in') : tk('login.submit')}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
