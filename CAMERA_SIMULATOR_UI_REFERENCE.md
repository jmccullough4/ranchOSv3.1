# Camera Simulator - UI Integration Reference

## Quick Start for UI Developers

This guide shows how to integrate the camera simulator into the admin UI.

## API Endpoints Summary

### List Available Cameras

```javascript
// GET /api/simulator/cameras
const response = await fetch('/api/simulator/cameras')
const data = await response.json()

// Returns:
{
  cameras: [
    {
      id: 'sim-cam-north-gate',
      name: 'North Gate Entrance',
      description: 'Main entrance monitoring - vehicle and personnel detection',
      suggestedLat: 36.7825,
      suggestedLon: -119.4179,
      status: 'online',
      type: 'fixed',
      capabilities: ['motion_detection', 'vehicle_detection', 'person_detection'],
      resolution: '4K',
      nightVision: true,
      weatherproof: true,
      ptzCapable: false,
      detectionProfile: 'gate',
      currentDetection: { ... }
    },
    // ... 5 more cameras
  ],
  totalAvailable: 6,
  rangeConfigured: true,
  note: '...'
}
```

### Import Single Camera

```javascript
// POST /api/simulator/cameras/import/:id
const importCamera = async (cameraId, customOptions = {}) => {
  const response = await fetch(`/api/simulator/cameras/import/${cameraId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customName: customOptions.name,      // Optional
      customLat: customOptions.lat,        // Optional
      customLon: customOptions.lon         // Optional
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.json()
}

// Usage:
await importCamera('sim-cam-north-gate')
// or with custom options:
await importCamera('sim-cam-north-gate', {
  name: 'My Custom Name',
  lat: 36.7850,
  lon: -119.4200
})
```

### Import All Cameras

```javascript
// POST /api/simulator/cameras/import-all
const importAllCameras = async () => {
  const response = await fetch('/api/simulator/cameras/import-all', {
    method: 'POST'
  })

  return await response.json()
}

// Returns:
{
  status: 'ok',
  message: 'Imported 6 cameras, skipped 0 already imported',
  imported: ['North Gate Entrance', 'South Pasture Perimeter', ...],
  skipped: [],
  total: 6
}
```

### Get Simulator Status

```javascript
// GET /api/simulator/cameras/status
const getStatus = async () => {
  const response = await fetch('/api/simulator/cameras/status')
  return await response.json()
}

// Returns:
{
  simulator: {
    totalPresets: 6,
    presetsAvailable: 3,
    presetsImported: 3
  },
  ranch: {
    totalCameras: 5,
    onlineCameras: 4,
    offlineCameras: 1,
    aiEnabledCameras: 5
  },
  ranchConfigured: true
}
```

## Example UI Components

### Camera Import Dialog

```jsx
import { useState, useEffect } from 'react'

function CameraImportDialog({ onClose, onImport }) {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    fetchAvailableCameras()
  }, [])

  const fetchAvailableCameras = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/simulator/cameras')
      const data = await response.json()
      setCameras(data.cameras)
    } catch (error) {
      console.error('Failed to fetch cameras:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (cameraId) => {
    setImporting(true)
    try {
      const response = await fetch(`/api/simulator/cameras/import/${cameraId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Failed to import camera')
        return
      }

      const result = await response.json()
      alert(result.message)
      onImport(result.camera)
      fetchAvailableCameras() // Refresh list
    } catch (error) {
      alert('Failed to import camera: ' + error.message)
    } finally {
      setImporting(false)
    }
  }

  const handleImportAll = async () => {
    setImporting(true)
    try {
      const response = await fetch('/api/simulator/cameras/import-all', {
        method: 'POST'
      })

      const result = await response.json()
      alert(result.message)
      onImport()
      fetchAvailableCameras() // Refresh list
    } catch (error) {
      alert('Failed to import cameras: ' + error.message)
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return <div>Loading available cameras...</div>
  }

  return (
    <div className="camera-import-dialog">
      <div className="dialog-header">
        <h2>Import Cameras from Simulator</h2>
        <button onClick={onClose}>×</button>
      </div>

      <div className="dialog-body">
        <div className="dialog-actions">
          <button
            onClick={handleImportAll}
            disabled={importing || cameras.length === 0}
            className="btn btn-primary"
          >
            Import All ({cameras.length} cameras)
          </button>
        </div>

        <div className="camera-grid">
          {cameras.map(camera => (
            <div key={camera.id} className="camera-card">
              <div className="camera-header">
                <h3>{camera.name}</h3>
                <span className={`status ${camera.status}`}>
                  {camera.status}
                </span>
              </div>

              <p className="camera-description">{camera.description}</p>

              <div className="camera-specs">
                <div className="spec">
                  <strong>Type:</strong> {camera.type}
                  {camera.ptzCapable && ' (PTZ)'}
                </div>
                <div className="spec">
                  <strong>Resolution:</strong> {camera.resolution}
                </div>
                <div className="spec">
                  <strong>Features:</strong>
                  <div className="features">
                    {camera.nightVision && <span className="badge">Night Vision</span>}
                    {camera.weatherproof && <span className="badge">Weatherproof</span>}
                  </div>
                </div>
                <div className="spec">
                  <strong>Capabilities:</strong>
                  <div className="capabilities">
                    {camera.capabilities.map(cap => (
                      <span key={cap} className="badge-small">
                        {cap.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="camera-location">
                {camera.suggestedLat && camera.suggestedLon ? (
                  <small>
                    Position: {camera.suggestedLat.toFixed(5)}, {camera.suggestedLon.toFixed(5)}
                  </small>
                ) : (
                  <small className="warning">
                    Configure ranch boundaries to auto-calculate position
                  </small>
                )}
              </div>

              <button
                onClick={() => handleImport(camera.id)}
                disabled={importing}
                className="btn btn-secondary btn-import"
              >
                Import This Camera
              </button>
            </div>
          ))}
        </div>

        {cameras.length === 0 && (
          <div className="empty-state">
            <p>All available cameras have been imported!</p>
            <p>Manage your cameras in the Camera Management tab.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CameraImportDialog
```

### Camera Simulator Status Widget

```jsx
import { useState, useEffect } from 'react'

function CameraSimulatorStatus() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/simulator/cameras/status')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    }
  }

  if (!status) return null

  return (
    <div className="simulator-status">
      <h3>Camera Simulator Status</h3>

      <div className="status-grid">
        <div className="status-card">
          <div className="status-value">{status.simulator.totalPresets}</div>
          <div className="status-label">Total Presets</div>
        </div>

        <div className="status-card">
          <div className="status-value">{status.simulator.presetsAvailable}</div>
          <div className="status-label">Available to Import</div>
        </div>

        <div className="status-card">
          <div className="status-value">{status.ranch.totalCameras}</div>
          <div className="status-label">Active Cameras</div>
        </div>

        <div className="status-card">
          <div className="status-value">{status.ranch.onlineCameras}</div>
          <div className="status-label">Online</div>
        </div>

        <div className="status-card">
          <div className="status-value">{status.ranch.aiEnabledCameras}</div>
          <div className="status-label">AI Enabled</div>
        </div>
      </div>

      {!status.ranchConfigured && (
        <div className="warning-banner">
          <strong>Note:</strong> Configure ranch boundaries in Map Editor
          to enable automatic camera positioning.
        </div>
      )}
    </div>
  )
}

export default CameraSimulatorStatus
```

### Enhanced Camera List (with Simulator Info)

```jsx
import { useState, useEffect } from 'react'

function EnhancedCameraList() {
  const [cameras, setCameras] = useState([])

  useEffect(() => {
    fetchCameras()
    const interval = setInterval(fetchCameras, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [])

  const fetchCameras = async () => {
    try {
      const response = await fetch('/api/cameras')
      const data = await response.json()
      setCameras(data.cameras)
    } catch (error) {
      console.error('Failed to fetch cameras:', error)
    }
  }

  return (
    <div className="camera-list">
      {cameras.map(camera => (
        <div key={camera.camera} className="camera-item">
          <div className="camera-header">
            <h3>{camera.name}</h3>
            <span className={`status-badge ${camera.status}`}>
              {camera.status}
            </span>
          </div>

          {/* Show additional info for imported simulator cameras */}
          {camera.detectionProfile && (
            <div className="camera-metadata">
              <span className="badge">{camera.type}</span>
              <span className="badge">{camera.resolution}</span>
              <span className="badge">Profile: {camera.detectionProfile}</span>
            </div>
          )}

          {/* AI Detection Status */}
          {camera.aiDetection && (
            <div className="ai-detection">
              <div className="detection-header">
                AI Detection: {camera.aiDetection.enabled ? '✓ Enabled' : '✗ Disabled'}
              </div>

              {camera.aiDetection.detections && camera.aiDetection.detections.length > 0 && (
                <div className="detections">
                  {camera.aiDetection.detections.map((detection, idx) => (
                    <div
                      key={idx}
                      className={`detection-item alert-${detection.alertLevel}`}
                    >
                      <span className="detection-object">
                        {detection.object.replace('_', ' ')}
                      </span>
                      <span className="detection-confidence">
                        {(detection.confidence * 100).toFixed(1)}%
                      </span>
                      {detection.alertLevel !== 'none' && (
                        <span className={`alert-badge ${detection.alertLevel}`}>
                          {detection.alertLevel}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {camera.aiDetection.lastScan && (
                <small className="last-scan">
                  Last scan: {new Date(camera.aiDetection.lastScan).toLocaleTimeString()}
                </small>
              )}
            </div>
          )}

          {/* Capabilities (for simulator cameras) */}
          {camera.capabilities && (
            <div className="capabilities">
              <strong>Capabilities:</strong>
              <div className="capability-list">
                {camera.capabilities.map(cap => (
                  <span key={cap} className="capability-badge">
                    {cap.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default EnhancedCameraList
```

## Sample Styles

```css
/* Camera Import Dialog */
.camera-import-dialog {
  max-width: 1200px;
  max-height: 80vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.dialog-actions {
  padding: 1rem;
  display: flex;
  justify-content: flex-end;
}

.camera-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
}

.camera-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  background: var(--card-bg);
}

.camera-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.camera-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.status.online {
  color: var(--color-status-green);
  font-weight: 600;
}

.status.offline {
  color: var(--color-status-red);
  font-weight: 600;
}

.camera-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.camera-specs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.features, .capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--color-primary);
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
}

.badge-small {
  padding: 0.15rem 0.35rem;
  font-size: 0.7rem;
  background: var(--color-secondary);
  color: white;
  border-radius: 3px;
}

.camera-location {
  margin-bottom: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color-light);
}

.camera-location small {
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

.camera-location .warning {
  color: var(--color-warning);
}

.btn-import {
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

/* Simulator Status Widget */
.simulator-status {
  padding: 1rem;
  background: var(--card-bg);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.status-card {
  text-align: center;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.status-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-primary);
}

.status-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.warning-banner {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--color-warning-bg);
  border-left: 3px solid var(--color-warning);
  border-radius: 4px;
  font-size: 0.85rem;
}

/* Enhanced Camera List */
.camera-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.camera-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  background: var(--card-bg);
}

.camera-metadata {
  display: flex;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.ai-detection {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color-light);
}

.detection-header {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.detections {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.detection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--bg-secondary);
}

.detection-item.alert-critical {
  background: var(--color-alert-critical-bg);
  border-left: 3px solid var(--color-alert-critical);
}

.detection-item.alert-high {
  background: var(--color-alert-high-bg);
  border-left: 3px solid var(--color-alert-high);
}

.detection-item.alert-medium {
  background: var(--color-alert-medium-bg);
  border-left: 3px solid var(--color-alert-medium);
}

.detection-object {
  font-weight: 500;
  text-transform: capitalize;
}

.detection-confidence {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.alert-badge {
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.alert-badge.critical {
  background: var(--color-alert-critical);
  color: white;
}

.alert-badge.high {
  background: var(--color-alert-high);
  color: white;
}

.alert-badge.medium {
  background: var(--color-alert-medium);
  color: white;
}

.last-scan {
  display: block;
  margin-top: 0.5rem;
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

.capability-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.capability-badge {
  padding: 0.15rem 0.35rem;
  background: var(--color-info);
  color: white;
  border-radius: 3px;
  font-size: 0.7rem;
  text-transform: capitalize;
}
```

## Integration Steps

### 1. Add Import Button to Camera Management Tab

Update `CameraManagementTab.jsx`:

```jsx
import CameraImportDialog from './CameraImportDialog'

function CameraManagementTab() {
  const [showImportDialog, setShowImportDialog] = useState(false)

  // ... existing code ...

  return (
    <div className="admin-section">
      {/* Add this button near the top */}
      <div className="section-actions">
        <button
          className="btn btn-primary"
          onClick={() => setShowImportDialog(true)}
        >
          Import from Simulator
        </button>
      </div>

      {/* Existing camera management UI */}
      {/* ... */}

      {/* Add dialog */}
      {showImportDialog && (
        <CameraImportDialog
          onClose={() => setShowImportDialog(false)}
          onImport={() => {
            setShowImportDialog(false)
            fetchCameras() // Refresh camera list
          }}
        />
      )}
    </div>
  )
}
```

### 2. Add Status Widget to Dashboard

Update `AdminPanel.jsx` or dashboard component:

```jsx
import CameraSimulatorStatus from './CameraSimulatorStatus'

function AdminPanel() {
  return (
    <div className="admin-panel">
      {/* Add status widget */}
      <CameraSimulatorStatus />

      {/* Existing admin content */}
      {/* ... */}
    </div>
  )
}
```

### 3. Test the Integration

1. Start the server: `npm run dev`
2. Navigate to Admin Panel > Camera Management
3. Click "Import from Simulator"
4. See 6 available cameras with specs
5. Click "Import All" or import individually
6. Verify cameras appear in camera list
7. Check that AI detection updates every 5-10 seconds

## Detection Alert Level Colors

Use these CSS variables for consistent alert styling:

```css
:root {
  --color-alert-critical: #dc2626;
  --color-alert-critical-bg: #fef2f2;

  --color-alert-high: #ea580c;
  --color-alert-high-bg: #fff7ed;

  --color-alert-medium: #d97706;
  --color-alert-medium-bg: #fffbeb;

  --color-alert-low: #65a30d;
  --color-alert-low-bg: #f7fee7;

  --color-alert-none: #6b7280;
  --color-alert-none-bg: #f9fafb;
}
```

## Common Use Cases

### Show Camera on Map

If camera has `lat` and `lon`, display on map:

```jsx
// In MapPanel.jsx
{cameras.map(camera => (
  camera.lat && camera.lon && (
    <Marker
      key={camera.camera}
      longitude={camera.lon}
      latitude={camera.lat}
    >
      <div className={`camera-marker ${camera.status}`}>
        📹
        {camera.predator_detected && (
          <span className="alert-indicator">⚠️</span>
        )}
      </div>
    </Marker>
  )
))}
```

### Filter Cameras by Status

```jsx
const onlineCameras = cameras.filter(c => c.status === 'online')
const offlineCameras = cameras.filter(c => c.status === 'offline')
const alertCameras = cameras.filter(c => c.predator_detected)
```

### Sort by Detection Priority

```jsx
const sortedCameras = [...cameras].sort((a, b) => {
  const alertPriority = { critical: 4, high: 3, medium: 2, low: 1, none: 0 }
  const aLevel = a.aiDetection?.alertLevel || 'none'
  const bLevel = b.aiDetection?.alertLevel || 'none'
  return alertPriority[bLevel] - alertPriority[aLevel]
})
```

## Questions?

Refer to the full `CAMERA_SIMULATOR_GUIDE.md` for detailed technical documentation.
