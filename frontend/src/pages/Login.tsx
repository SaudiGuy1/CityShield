import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Login({ onLogin }: { onLogin: (user: { username?: string; role?: string }) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

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
        setError('Invalid credentials')
      }
    } catch (err) {
      setError('Login failed')
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
        <div className="login-brand">CITYSHIELD</div>
        <div className="login-subtitle">Security Operations Platform</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}
          <button type="submit">Access System</button>
        </form>
      </motion.div>
    </div>
  )
}
