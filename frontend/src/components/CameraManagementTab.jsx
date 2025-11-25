import { useState, useEffect } from 'react'

function CameraManagementTab() {
  const [cameras, setCameras] = useState([])
  const [simulatorCameras, setSimulatorCameras] = useState([])
  const [loading, setLoading] = useState(false)
  const [simulatorLoading, setSimulatorLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [addMode, setAddMode] = useState('manual') // 'manual' or 'simulator'

  // Manual entry form state
  const [name, setName] = useState('')
  const [ipAddress, setIpAddress] = useState('')
  const [port, setPort] = useState('')
  const [aiDetection, setAiDetection] = useState(true)

  // Helper to validate IP address format
  const isValidIpAddress = (ip) => {
    if (ip === 'localhost') return true
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipRegex.test(ip)
  }

  // Helper to validate port number
  const isValidPort = (portNum) => {
    const num = parseInt(portNum, 10)
    return num > 0 && num <= 65535
  }

  // Fetch all configured cameras
  const fetchCameras = async () => {
    try {
      const response = await fetch('/api/admin/cameras')
      if (response.ok) {
        const data = await response.json()
        setCameras(data.cameras || [])
      }
    } catch (err) {
      console.error('Failed to fetch cameras:', err)
    }
  }

  // Fetch available simulator cameras
  const fetchSimulatorCameras = async () => {
    setSimulatorLoading(true)
    setError('')
    try {
      const response = await fetch('/api/simulator/cameras')
      if (response.ok) {
        const data = await response.json()
        setSimulatorCameras(data.cameras || [])
      } else {
        throw new Error('Simulator unavailable')
      }
    } catch (err) {
      setError('Cannot connect to simulator. Make sure it is running and try again.')
      setSimulatorCameras([])
    } finally {
      setSimulatorLoading(false)
    }
  }

  useEffect(() => {
    fetchCameras()
  }, [])

  // Fetch simulator cameras when switching to simulator mode
  useEffect(() => {
    if (addMode === 'simulator' && simulatorCameras.length === 0) {
      fetchSimulatorCameras()
    }
  }, [addMode])

  const handleAddManualCamera = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Validate IP address
      if (!isValidIpAddress(ipAddress)) {
        throw new Error('Invalid IP address. Use format like 192.168.1.100 or localhost')
      }

      // Validate port
      if (!isValidPort(port)) {
        throw new Error('Invalid port number. Must be between 1 and 65535')
      }

      const streamUrl = `${ipAddress}:${port}`

      const response = await fetch('/api/admin/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ipAddress,
          port: parseInt(port, 10),
          streamUrl,
          aiDetection,
          lat: null,
          lon: null,
          source: 'manual'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add camera')
      }

      setSuccess(`Camera "${name}" added successfully`)

      // Reset form
      setName('')
      setIpAddress('')
      setPort('')
      setAiDetection(true)

      // Refresh list
      fetchCameras()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImportSimulatorCamera = async (simCamera) => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch(`/api/simulator/cameras/${simCamera.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to import camera')
      }

      setSuccess(`Camera "${simCamera.name}" imported successfully`)

      // Refresh both lists
      fetchCameras()
      fetchSimulatorCameras()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCamera = async (cameraId) => {
    const camera = cameras.find(c => c.id === cameraId)
    if (!confirm(`Are you sure you want to remove camera "${camera?.name}"?`)) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/cameras/${cameraId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete camera')
      }

      setSuccess('Camera removed successfully')
      fetchCameras()

      // Refresh simulator list if we deleted a simulator camera
      if (camera?.source === 'simulator') {
        fetchSimulatorCameras()
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleToggleAI = async (camera) => {
    try {
      const response = await fetch(`/api/admin/cameras/${camera.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...camera,
          aiDetection: {
            ...camera.aiDetection,
            enabled: !camera.aiDetection?.enabled
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle AI detection')
      }

      fetchCameras()
    } catch (err) {
      setError(err.message)
    }
  }

  const isSimulatorCameraImported = (simCameraId) => {
    return cameras.some(cam => cam.simulatorId === simCameraId)
  }

  const getSourceBadge = (source) => {
    if (source === 'simulator') {
      return (
        <span style={{
          fontSize: '0.7rem',
          padding: '0.15rem 0.4rem',
          borderRadius: '0.25rem',
          backgroundColor: 'var(--color-status-blue)',
          color: 'white',
          fontWeight: '600',
          marginLeft: '0.5rem'
        }}>
          SIMULATOR
        </span>
      )
    }
    return (
      <span style={{
        fontSize: '0.7rem',
        padding: '0.15rem 0.4rem',
        borderRadius: '0.25rem',
        backgroundColor: 'var(--color-status-gray)',
        color: 'white',
        fontWeight: '600',
        marginLeft: '0.5rem'
      }}>
        MANUAL
      </span>
    )
  }

  return (
    <div className="admin-section">
      <div className="admin-form-section">
        <h3 className="admin-section-title">Add New Camera</h3>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Import cameras from the simulator or add custom cameras using IP address and port number.
        </p>

        {error && (
          <div className="admin-alert admin-alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="admin-alert admin-alert-success" style={{ marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '2px solid var(--border-color)'
        }}>
          <button
            onClick={() => setAddMode('manual')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              color: addMode === 'manual' ? 'var(--color-primary)' : 'var(--text-secondary)',
              borderBottom: addMode === 'manual' ? '3px solid var(--color-primary)' : 'none',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setAddMode('simulator')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              color: addMode === 'simulator' ? 'var(--color-primary)' : 'var(--text-secondary)',
              borderBottom: addMode === 'simulator' ? '3px solid var(--color-primary)' : 'none',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            Import from Simulator
          </button>
        </div>

        {/* Manual Entry Form */}
        {addMode === 'manual' && (
          <form onSubmit={handleAddManualCamera} className="admin-form">
            <div className="admin-form-group">
              <label htmlFor="cameraName">Camera Name *</label>
              <input
                type="text"
                id="cameraName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., North Gate Camera"
                required
                className="admin-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-md)' }}>
              <div className="admin-form-group">
                <label htmlFor="ipAddress">IP Address *</label>
                <input
                  type="text"
                  id="ipAddress"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="e.g., 192.168.1.100 or localhost"
                  required
                  className="admin-input"
                />
                <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-tertiary)' }}>
                  Use localhost for local cameras or network IP for remote cameras
                </small>
              </div>

              <div className="admin-form-group">
                <label htmlFor="port">Port *</label>
                <input
                  type="number"
                  id="port"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="e.g., 9090"
                  required
                  min="1"
                  max="65535"
                  className="admin-input"
                />
                <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-tertiary)' }}>
                  1-65535
                </small>
              </div>
            </div>

            <div className="admin-form-group" style={{ marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={aiDetection}
                  onChange={(e) => setAiDetection(e.target.checked)}
                />
                Enable AI Predator Detection
              </label>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
              {loading ? 'Adding...' : 'Add Camera'}
            </button>
          </form>
        )}

        {/* Simulator Import Section */}
        {addMode === 'simulator' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Available Simulator Cameras</h4>
              <button
                onClick={fetchSimulatorCameras}
                className="btn btn-secondary"
                disabled={simulatorLoading}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
              >
                {simulatorLoading ? 'Loading...' : 'Refresh List'}
              </button>
            </div>

            {simulatorLoading ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)'
              }}>
                Loading simulator cameras...
              </div>
            ) : simulatorCameras.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Cannot connect to simulator
                </div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Make sure the simulator is running and try again.
                </div>
                <button
                  onClick={fetchSimulatorCameras}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Retry Connection
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {simulatorCameras.map(simCam => {
                  const isImported = isSimulatorCameraImported(simCam.id)
                  return (
                    <div
                      key={simCam.id}
                      style={{
                        padding: '1rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius)',
                        opacity: isImported ? 0.6 : 1
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>📹</span>
                            <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                              {simCam.name}
                            </span>
                            {isImported && (
                              <span style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'var(--color-status-green)',
                                color: 'white',
                                fontWeight: '600'
                              }}>
                                IMPORTED
                              </span>
                            )}
                          </div>

                          {simCam.metadata?.description && (
                            <div style={{
                              fontSize: '0.85rem',
                              color: 'var(--text-secondary)',
                              marginBottom: '0.5rem'
                            }}>
                              {simCam.metadata.description}
                            </div>
                          )}

                          <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-tertiary)',
                            display: 'flex',
                            gap: '1rem',
                            flexWrap: 'wrap'
                          }}>
                            {simCam.lat && simCam.lon && (
                              <span>
                                Location: {simCam.lat.toFixed(4)}, {simCam.lon.toFixed(4)}
                              </span>
                            )}
                            <span>
                              Status: <span style={{
                                color: simCam.status === 'online' ? 'var(--color-status-green)' : 'var(--color-status-red)',
                                fontWeight: '600'
                              }}>
                                {simCam.status === 'online' ? '● Online' : '● Offline'}
                              </span>
                            </span>
                            <span>
                              AI Detection: {simCam.aiDetection?.enabled ? '✓ Enabled' : '✗ Disabled'}
                            </span>
                          </div>

                          {simCam.metadata?.coverage && (
                            <div style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-tertiary)',
                              marginTop: '0.25rem'
                            }}>
                              {simCam.metadata.coverage} • {simCam.metadata.resolution}
                            </div>
                          )}
                        </div>

                        <div>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                            onClick={() => handleImportSimulatorCamera(simCam)}
                            disabled={loading || isImported}
                          >
                            {isImported ? 'Already Imported' : 'Import Camera'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Cameras List */}
      <div className="admin-users-section">
        <h3 className="admin-section-title">Your Cameras ({cameras.length})</h3>
        <div className="admin-users-list">
          {cameras.length === 0 ? (
            <div className="admin-empty-state">
              No cameras configured yet. Add your first camera above to begin monitoring.
            </div>
          ) : (
            cameras.map(camera => (
              <div key={camera.id} className="admin-user-card">
                <div className="admin-user-info">
                  <div className="admin-user-name" style={{ display: 'flex', alignItems: 'center' }}>
                    {camera.name}
                    {getSourceBadge(camera.source)}
                    {camera.status === 'online' && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-status-green)' }}>
                        ● Online
                      </span>
                    )}
                  </div>

                  {camera.source === 'simulator' && camera.simulatorId && (
                    <div className="admin-user-date" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Simulator ID: {camera.simulatorId}
                    </div>
                  )}

                  {camera.source === 'manual' && camera.streamUrl && (
                    <div className="admin-user-date" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      Stream: {camera.streamUrl}
                    </div>
                  )}

                  {camera.source === 'manual' && camera.ipAddress && camera.port && (
                    <div className="admin-user-date" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      IP: {camera.ipAddress} | Port: {camera.port}
                    </div>
                  )}

                  {camera.aiDetection && (
                    <div className="admin-user-date" style={{ fontSize: '0.75rem' }}>
                      AI Detection: {camera.aiDetection.enabled ? '✓ Enabled' : '✗ Disabled'}
                    </div>
                  )}

                  {camera.lat && camera.lon && (
                    <div className="admin-user-date" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Location: {camera.lat.toFixed(5)}, {camera.lon.toFixed(5)}
                    </div>
                  )}

                  {camera.importedAt && (
                    <div className="admin-user-date" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                      Imported: {new Date(camera.importedAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {camera.aiDetection && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                      onClick={() => handleToggleAI(camera)}
                    >
                      {camera.aiDetection.enabled ? 'Disable AI' : 'Enable AI'}
                    </button>
                  )}
                  <button
                    className="btn btn-danger-small"
                    onClick={() => handleDeleteCamera(camera.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {cameras.length > 0 && (
        <div className="admin-info-box" style={{ marginTop: '1.5rem' }}>
          <p>
            <strong>Tip:</strong> Cameras imported from the simulator include GPS coordinates and AI detection settings.
            Use the Map Editor (Pasture Boundaries tab) to view camera locations on the map.
          </p>
        </div>
      )}
    </div>
  )
}

export default CameraManagementTab
