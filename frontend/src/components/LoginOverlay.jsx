import { useState } from 'react'

function LoginOverlay({ visible, error, onSubmit, onSignup }) {
  const [formState, setFormState] = useState({ username: '', password: '' })

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit(formState)
  }

  return (
    <div className={`login-overlay ${visible ? 'visible' : ''}`}>
      <div className="login-card">
        <div className="login-header">
          <img src="/static/logo.png" alt="3 Strands Cattle Co." className="login-logo" />
          <h1 className="login-title">ranchOS</h1>
          <p className="login-subtitle">Command Center</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-input"
              value={formState.username}
              onChange={handleChange}
              placeholder="Enter username"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              value={formState.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary">
            Access System
          </button>

          {onSignup && (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                Don't have a ranch?{' '}
                <button
                  type="button"
                  onClick={onSignup}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-earth-sage)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    font: 'inherit'
                  }}
                >
                  Create one here
                </button>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default LoginOverlay
