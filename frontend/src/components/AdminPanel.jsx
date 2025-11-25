import { useCallback, useEffect, useState } from 'react'
import AdminMapPanel from './AdminMapPanel'
import CattleManagementTab from './CattleManagementTab'
import CameraManagementTab from './CameraManagementTab'

function AdminPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [address, setAddress] = useState('')
  const [isLoadingBoundary, setIsLoadingBoundary] = useState(false)
  const [currentBoundary, setCurrentBoundary] = useState(null)
  const [showMapEditor, setShowMapEditor] = useState(false)
  const [mapboxToken, setMapboxToken] = useState('')
  const [pastures, setPastures] = useState([])
  const [sensors, setSensors] = useState([])
  const [newSensorName, setNewSensorName] = useState('')
  const [newSensorType, setNewSensorType] = useState('temperature')
  const [errorLog, setErrorLog] = useState([])
  const [isLoadingErrors, setIsLoadingErrors] = useState(false)
  const [countyGisApiUrl, setCountyGisApiUrl] = useState('')

  const handleSaveGisUrl = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countyGisApiUrl })
      })

      if (!response.ok) {
        throw new Error('Failed to save GIS URL')
      }

      setSuccess('County GIS API URL saved successfully.')
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const fetchSensors = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sensors')
      if (response.ok) {
        const data = await response.json()
        setSensors(data.sensors || [])
      }
    } catch (err) {
      console.error('Failed to fetch sensors:', err)
    }
  }, [])

  const fetchErrorLog = useCallback(async () => {
    setIsLoadingErrors(true)
    try {
      const response = await fetch('/api/admin/error-log')
      if (response.ok) {
        const data = await response.json()
        setErrorLog(data.errors || [])
      }
    } catch (err) {
      console.error('Failed to fetch error log:', err)
    } finally {
      setIsLoadingErrors(false)
    }
  }, [])

  const fetchCurrentBoundary = useCallback(async () => {
    try {
      const response = await fetch('/api/config')
      if (!response.ok) throw new Error('Failed to fetch config')
      const data = await response.json()

      console.log('Config loaded:', { hasToken: !!data.mapboxToken, hasCenter: !!data.ranchCenter })

      setMapboxToken(data.mapboxToken)
      if (data.fence && data.ranchCenter) {
        setCurrentBoundary({
          center: data.ranchCenter,
          fence: data.fence,
          gates: data.gates || []
        })
      } else {
        setCurrentBoundary(null)
      }

      // Fetch pastures
      const pasturesResponse = await fetch('/api/pastures')
      if (pasturesResponse.ok) {
        const pasturesData = await pasturesResponse.json()
        setPastures(pasturesData.pastures || [])
      }

      // Fetch admin config
      const adminConfigResponse = await fetch('/api/admin/config')
      if (adminConfigResponse.ok) {
        const adminConfigData = await adminConfigResponse.json()
        setCountyGisApiUrl(adminConfigData.countyGisApiUrl || '')
      }
    } catch (err) {
      console.error('Failed to fetch boundary:', err)
      setError('Failed to load configuration: ' + err.message)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'pastures') {
      fetchCurrentBoundary()
    } else if (activeTab === 'sensors') {
      fetchSensors()
    } else if (activeTab === 'errors') {
      fetchErrorLog()
    }
  }, [activeTab])

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create user')
      }

      setSuccess(`User "${newUsername}" created successfully`)
      setNewUsername('')
      setNewPassword('')
      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteUser = async (username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return

    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/users/${username}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      setSuccess(`User "${username}" deleted successfully`)
      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleGenerateBoundary = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoadingBoundary(true)

    try {
      const response = await fetch('/api/admin/pastures/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to lookup boundary')
      }

      const sourceLabel = payload.source || 'unknown source'
      setSuccess(`Property boundary imported from ${sourceLabel} for "${payload.property?.name || address}". Use the map editor to adjust or add pasture subdivisions.`)
      setAddress('')
      fetchCurrentBoundary()
    } catch (err) {
      setError(err.message || 'Failed to lookup property boundary. Try using the map editor to draw it manually.')
    } finally {
      setIsLoadingBoundary(false)
    }
  }

  const handleClearBoundary = async () => {
    if (!confirm('Are you sure you want to clear the current boundary? This will require reconfiguration.')) return

    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/pastures/primary', {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to clear boundary')
      }

      setSuccess('Boundary cleared successfully. Please close this panel to see the map update.')
      setCurrentBoundary(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateSensor = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/sensors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSensorName,
          type: newSensorType
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create sensor')
      }

      setSuccess(`Sensor "${newSensorName}" created successfully`)
      setNewSensorName('')
      setNewSensorType('temperature')
      fetchSensors()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteSensor = async (sensorId) => {
    if (!confirm(`Are you sure you want to delete this sensor?`)) return

    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/sensors/${sensorId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete sensor')
      }

      setSuccess('Sensor deleted successfully')
      fetchSensors()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRenameSensor = async (sensor) => {
    const proposed = prompt('Sensor name', sensor.name)
    if (!proposed) return

    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/sensors/${sensor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: proposed })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to rename sensor')
      }

      setSuccess(`Sensor renamed to "${proposed}"`)
      fetchSensors()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleClearErrorLog = async () => {
    if (!confirm('Are you sure you want to clear the error log?')) return

    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/error-log', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to clear error log')
      }

      setSuccess('Error log cleared successfully')
      fetchErrorLog()
    } catch (err) {
      setError(err.message)
    }
  }

  if (showMapEditor) {
    if (!mapboxToken) {
      return (
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h2 className="admin-panel-title">Loading Map Editor...</h2>
            <button className="admin-panel-close" onClick={() => setShowMapEditor(false)}>×</button>
          </div>
          <div className="admin-panel-content">
            <div className="admin-info-box">
              <p>Loading Mapbox configuration...</p>
              <p>If this persists, check the browser console for errors.</p>
            </div>
          </div>
        </div>
      )
    }

    console.log('Rendering AdminMapPanel with token:', mapboxToken?.substring(0, 20) + '...')

    return (
      <AdminMapPanel
        token={mapboxToken}
        onClose={() => {
          setShowMapEditor(false)
          fetchCurrentBoundary()
        }}
        onSave={() => {
          fetchCurrentBoundary()
          if (onClose) onClose()
        }}
        existingBoundary={currentBoundary}
        existingPastures={pastures.filter(p => !p.isProperty)}
      />
    )
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Admin Panel</h2>
        <button className="admin-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button
          className={`admin-tab ${activeTab === 'pastures' ? 'active' : ''}`}
          onClick={() => setActiveTab('pastures')}
        >
          Pasture Boundaries
        </button>
        <button
          className={`admin-tab ${activeTab === 'cattle' ? 'active' : ''}`}
          onClick={() => setActiveTab('cattle')}
        >
          Cattle Management
        </button>
        <button
          className={`admin-tab ${activeTab === 'cameras' ? 'active' : ''}`}
          onClick={() => setActiveTab('cameras')}
        >
          Camera Management
        </button>
        <button
          className={`admin-tab ${activeTab === 'sensors' ? 'active' : ''}`}
          onClick={() => setActiveTab('sensors')}
        >
          Sensor Management
        </button>
        <button
          className={`admin-tab ${activeTab === 'simulators' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulators')}
        >
          Simulators
        </button>
        <button
          className={`admin-tab ${activeTab === 'errors' ? 'active' : ''}`}
          onClick={() => setActiveTab('errors')}
        >
          Error Log
          {errorLog.length > 0 && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: 'var(--color-status-red)', padding: '0.125rem 0.375rem', borderRadius: '0.75rem' }}>{errorLog.length}</span>}
        </button>
      </div>

      <div className="admin-panel-content">
        {error && (
          <div className="admin-alert admin-alert-error">
            {error}
          </div>
        )}

        {activeTab === 'simulators' && (
          <div className="admin-section">
            <div className="admin-form-section">
              <h3 className="admin-section-title">Simulation Console</h3>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Launch the combined herd + sensor simulator to push strays, trigger perimeter events, and stream IoT data
                against this RanchOS instance. Everything runs in the browser—no additional setup or authentication required.
              </p>
            </div>
            <div className="admin-users-section">
              <div className="admin-user-card">
                <div className="admin-user-info">
                  <div className="admin-user-name">Unified Simulator</div>
                  <div className="admin-user-date">
                    Configure herd dynamics, reset anchor points, and emit water/fence/gate telemetry from one dashboard.
                  </div>
                </div>
                <a
                  className="btn btn-secondary"
                  href="/simulator/index.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Simulation Console
                </a>
              </div>
            </div>

            <div className="admin-info-box" style={{ marginTop: '1.5rem' }}>
              <p>
                Tip: generate property boundaries and gates first so both the herd and sensor engines have geometry to respect.
                The console automatically pulls `/api/pastures`, `/api/config`, and `/api/sensors` from this server.
              </p>
            </div>
          </div>
        )}
        {success && (
          <div className="admin-alert admin-alert-success">
            {success}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-section">
            <div className="admin-form-section">
              <h3 className="admin-section-title">Create New User</h3>
              <form onSubmit={handleCreateUser} className="admin-form">
                <div className="admin-form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    className="admin-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="admin-input"
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Create User
                </button>
              </form>
            </div>

            <div className="admin-users-section">
              <h3 className="admin-section-title">Existing Users ({users.length})</h3>
              <div className="admin-users-list">
                {users.map(user => (
                  <div key={user.username} className="admin-user-card">
                    <div className="admin-user-info">
                      <div className="admin-user-name">{user.username}</div>
                      <div className="admin-user-date">
                        Created: {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      className="btn btn-danger-small"
                      onClick={() => handleDeleteUser(user.username)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="admin-empty-state">
                    No users yet. Create one above.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pastures' && (
          <div className="admin-section">
            <div className="admin-form-section">
              <h3 className="admin-section-title">Property & Pasture Boundaries</h3>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Use the map editor to draw property and pasture boundaries precisely.
              </p>

              {currentBoundary && (
                <div className="admin-info-box" style={{ marginBottom: '1rem' }}>
                  <p><strong>Property Center:</strong> {currentBoundary.center.lat.toFixed(6)}, {currentBoundary.center.lon.toFixed(6)}</p>
                  <p><strong>Property Boundary:</strong> {currentBoundary.fence.coordinates.length} points</p>
                  <p><strong>Gates Configured:</strong> {currentBoundary.gates ? currentBoundary.gates.length : 0}</p>
                  {pastures.length > 1 && (
                    <p><strong>Pastures Defined:</strong> {pastures.length - 1}</p>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: '1rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowMapEditor(true)}
                >
                  {currentBoundary ? 'Edit Boundaries on Map' : 'Draw Boundaries on Map'}
                </button>

                {currentBoundary && (
                  <button
                    className="btn btn-danger-small"
                    onClick={handleClearBoundary}
                  >
                    Clear All Boundaries
                  </button>
                )}
              </div>

              <div className="admin-form-section" style={{ marginTop: '1.5rem' }}>
                <h3 className="admin-section-title">Import Property Boundary from Address</h3>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  Enter your ranch address to automatically import the actual property boundary.
                  RanchOS will search multiple public data sources for accurate parcel information.
                </p>
                <form onSubmit={handleGenerateBoundary} className="admin-form">
                  <div className="admin-form-group">
                    <label htmlFor="ranch-address">Ranch Address</label>
                    <input
                      type="text"
                      id="ranch-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g., 123 County Road, Canyon, TX 79015"
                      required
                      className="admin-input"
                    />
                    <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-tertiary)' }}>
                      Tip: Use the map editor above for complete control over boundaries and pasture subdivisions.
                    </small>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={isLoadingBoundary}>
                    {isLoadingBoundary ? 'Looking up boundary…' : 'Lookup Property Boundary'}
                  </button>
                </form>
              </div>

              <div className="admin-form-section" style={{ marginTop: '2rem' }}>
                <h3 className="admin-section-title">External Boundary Data</h3>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  Optional: provide a county GIS REST API endpoint for automatic boundary import.
                  This is often found on county government websites.
                </p>
                <form onSubmit={handleSaveGisUrl} className="admin-form">
                  <div className="admin-form-group">
                    <label htmlFor="gis-url">County GIS API URL</label>
                    <input
                      type="text"
                      id="gis-url"
                      value={countyGisApiUrl}
                      onChange={(e) => setCountyGisApiUrl(e.target.value)}
                      placeholder="e.g., https://gis.co.my-county.us/arcgis/rest/services/..."
                      className="admin-input"
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary">
                    Save GIS URL
                  </button>
                </form>
              </div>

              {pastures.length > 0 && (
                <div className="admin-users-section">
                  <h3 className="admin-section-title">Defined Pastures</h3>
                  <div className="admin-users-list">
                    {pastures.map(pasture => (
                      <div key={pasture.id} className="admin-user-card">
                        <div className="admin-user-info">
                          <div className="admin-user-name">
                            {pasture.name}
                            {pasture.isProperty && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-earth-copper)' }}>(Property)</span>}
                          </div>
                          {pasture.boundary && (
                            <div className="admin-user-date">
                              {pasture.boundary.length} boundary points
                            </div>
                          )}
                          {pasture.gates && pasture.gates.length > 0 && (
                            <div className="admin-user-date">
                              {pasture.gates.length} gate{pasture.gates.length === 1 ? '' : 's'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'cattle' && <CattleManagementTab />}

        {activeTab === 'cameras' && <CameraManagementTab />}

        {activeTab === 'sensors' && (
          <div className="admin-section">
            <div className="admin-form-section">
              <h3 className="admin-section-title">Add New Sensor</h3>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Add sensors to monitor ranch conditions. Data will be provided by the simulator.
              </p>
              <form onSubmit={handleCreateSensor} className="admin-form">
                <div className="admin-form-group">
                  <label htmlFor="sensorName">Sensor Name</label>
                  <input
                    type="text"
                    id="sensorName"
                    value={newSensorName}
                    onChange={(e) => setNewSensorName(e.target.value)}
                    placeholder="e.g., North Water Tank, Gate 1 Monitor"
                    required
                    className="admin-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="sensorType">Sensor Type</label>
                  <select
                    id="sensorType"
                    value={newSensorType}
                    onChange={(e) => setNewSensorType(e.target.value)}
                    className="admin-input"
                  >
                    <option value="temperature">Temperature</option>
                    <option value="water">Water Level</option>
                    <option value="fence">Fence Voltage</option>
                    <option value="gate">Gate Status</option>
                    <option value="network">Network Signal</option>
                    <option value="weather">Weather Station</option>
                    <option value="soil">Soil Moisture</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary">
                  Add Sensor
                </button>
              </form>
            </div>

            <div className="admin-users-section">
              <h3 className="admin-section-title">Active Sensors ({sensors.length})</h3>
              <div className="admin-users-list">
                {sensors.map(sensor => (
                  <div key={sensor.id} className="admin-user-card">
                    <div className="admin-user-info">
                      <div className="admin-user-name">{sensor.name}</div>
                      <div className="admin-user-date">
                        Type: {sensor.type} • ID: {sensor.id}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                        onClick={() => handleRenameSensor(sensor)}
                      >
                        Rename
                      </button>
                      <button
                        className="btn btn-danger-small"
                        onClick={() => handleDeleteSensor(sensor.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {sensors.length === 0 && (
                  <div className="admin-empty-state">
                    No sensors configured. Add one above to start monitoring.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="admin-section">
            <div className="admin-form-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="admin-section-title">Application Error Log</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={fetchErrorLog}
                    disabled={isLoadingErrors}
                  >
                    {isLoadingErrors ? 'Refreshing...' : 'Refresh'}
                  </button>
                  {errorLog.length > 0 && (
                    <button
                      className="btn btn-danger-small"
                      onClick={handleClearErrorLog}
                    >
                      Clear Log
                    </button>
                  )}
                </div>
              </div>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                View client-side errors captured during operation. Last 500 errors are retained.
              </p>

              {errorLog.length === 0 ? (
                <div className="admin-empty-state">
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
                  <div>No errors logged</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                    Errors will appear here when they occur
                  </div>
                </div>
              ) : (
                <div className="admin-users-section">
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-md)' }}>
                    <strong>Total Errors:</strong> {errorLog.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
                    {errorLog.map((error, idx) => (
                      <div key={idx} style={{
                        padding: '1rem',
                        background: 'var(--color-bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: '3px solid var(--color-status-red)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <strong style={{ color: 'var(--color-status-red)' }}>{error.message}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {new Date(error.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {error.type && (
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            <strong>Type:</strong> {error.type}
                          </div>
                        )}
                        {error.location && (
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            <strong>Location:</strong> {error.location}
                          </div>
                        )}
                        {error.filename && (
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            <strong>File:</strong> {error.filename}:{error.lineno}:{error.colno}
                          </div>
                        )}
                        {error.stack && (
                          <details style={{ marginTop: '0.5rem' }}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                              Stack Trace
                            </summary>
                            <pre style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem',
                              background: 'var(--color-bg-primary)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              overflowX: 'auto',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              {error.stack}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPanel
