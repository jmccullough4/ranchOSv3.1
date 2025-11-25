import { useState } from 'react'

function RanchSignup({ visible, onSuccess, onCancel }) {
  const [formState, setFormState] = useState({
    ranchId: '',
    companyName: '',
    adminUsername: '',
    adminPassword: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [createdRanch, setCreatedRanch] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((previous) => ({ ...previous, [name]: value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    // Validation
    if (!formState.ranchId || !formState.companyName || !formState.adminUsername || !formState.adminPassword) {
      setError('All fields are required')
      return
    }

    // Validate ranch ID format
    if (!/^[a-z0-9-]+$/.test(formState.ranchId)) {
      setError('Ranch ID must be lowercase letters, numbers, and hyphens only')
      return
    }

    // Validate password match
    if (formState.adminPassword !== formState.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (formState.adminPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ranchId: formState.ranchId,
          companyName: formState.companyName,
          adminUsername: formState.adminUsername,
          adminPassword: formState.adminPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      setSuccess(true)
      setCreatedRanch(data.ranch)

      // Clear form
      setFormState({
        ranchId: '',
        companyName: '',
        adminUsername: '',
        adminPassword: '',
        confirmPassword: ''
      })

      // Call success callback after a brief delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(data.ranch)
        }
      }, 2000)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormState({
      ranchId: '',
      companyName: '',
      adminUsername: '',
      adminPassword: '',
      confirmPassword: ''
    })
    setError('')
    setSuccess(false)
    setCreatedRanch(null)
    if (onCancel) {
      onCancel()
    }
  }

  if (!visible) return null

  return (
    <div className="login-overlay visible">
      <div className="login-card" style={{ maxWidth: '500px' }}>
        <div className="login-header">
          <h1 className="login-title">Create Your Ranch</h1>
          <p className="login-subtitle">Set up your RanchOS instance</p>
        </div>

        {success && createdRanch ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-earth-sage)' }}>
              Ranch Created Successfully!
            </h2>
            <div style={{
              background: 'var(--color-bg-surface)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Ranch ID:</strong> {createdRanch.ranchId}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Company:</strong> {createdRanch.companyName}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>URL:</strong><br />
                <code style={{ fontSize: '0.875rem' }}>{createdRanch.url}</code>
              </div>
              <div>
                <strong>Admin User:</strong> {createdRanch.adminUsername}
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Redirecting to login...
            </p>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="ranchId">
                Ranch ID
              </label>
              <input
                id="ranchId"
                name="ranchId"
                type="text"
                className="form-input"
                value={formState.ranchId}
                onChange={handleChange}
                placeholder="your-ranch-name"
                required
                disabled={loading}
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
              />
              <small style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                Your URL will be: ranch-{formState.ranchId || 'your-ranch-name'}.ranchos.app
              </small>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="companyName">
                Company Name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                className="form-input"
                value={formState.companyName}
                onChange={handleChange}
                placeholder="Your Ranch Name"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="adminUsername">
                Admin Username
              </label>
              <input
                id="adminUsername"
                name="adminUsername"
                type="text"
                className="form-input"
                value={formState.adminUsername}
                onChange={handleChange}
                placeholder="admin"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="adminPassword">
                Admin Password
              </label>
              <input
                id="adminPassword"
                name="adminPassword"
                type="password"
                className="form-input"
                value={formState.adminPassword}
                onChange={handleChange}
                placeholder="Enter password (min 8 characters)"
                required
                disabled={loading}
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="form-input"
                value={formState.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                required
                disabled={loading}
                minLength={8}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? 'Creating Ranch...' : 'Create Ranch'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default RanchSignup
