import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapPanel from './components/MapPanel'
import LoginOverlay from './components/LoginOverlay'
import RanchSignup from './components/RanchSignup'
import Modal from './components/Modal'
import AdminPanel from './components/AdminPanel'

// Global error handler for logging
const logErrorToBackend = async (error, errorInfo = {}) => {
  try {
    await fetch('/api/error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message || String(error),
        stack: error.stack,
        location: window.location.href,
        userAgent: navigator.userAgent,
        ...errorInfo
      })
    })
  } catch (err) {
    console.error('Failed to log error to backend:', err)
  }
}

const SENSOR_REFRESH_MS = 5000
const HERD_REFRESH_MS = 4000
const GATE_REFRESH_MS = 6000
const CHUTE_REFRESH_MS = 8000
const CAMERA_REFRESH_MS = 10000
const TOAST_DURATION_MS = 6000
const DEMO_NOTIFICATION_INTERVAL_MS = 7000

const MAX_CHUTE_LOG = 40

const distanceBetween = (cow, center) => {
  if (!cow || !center) return 0
  const latDiff = cow.lat - center.lat
  const lonDiff = cow.lon - center.lon
  return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff)
}

const getIconForSensor = (key) => {
  const icons = {
    SYSTEM: '⚡',
    WATER: '💧',
    FENCE: '⛭',
    GATE: '⛩',
    NETWORK: '📡',
    ALERTS: '⚠',
  }
  return icons[key] || '●'
}

const getIconForLevel = (level) => {
  const icons = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠️',
    alert: '🔴',
  }
  return icons[level] || 'ℹ️'
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('ranchOS_token') !== null
  })
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('ranchOS_user') || null
  })
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('ranchOS_role') || 'user'
  })
  const [ranchId, setRanchId] = useState(() => {
    return localStorage.getItem('ranchOS_ranchId') || 'demo'
  })
  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('ranchOS_token') || null
  })
  const [loginError, setLoginError] = useState('')
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [sensors, setSensors] = useState({})
  const [sensorsList, setSensorsList] = useState([])
  const [herd, setHerd] = useState([])
  const [gates, setGates] = useState([])
  const [chute, setChute] = useState(null)
  const [chuteLog, setChuteLog] = useState([])
  const [cameras, setCameras] = useState([])
  const [selectedCow, setSelectedCow] = useState(null)
  const [config, setConfig] = useState({ token: '', center: null, fence: null })
  const [vaccineLog, setVaccineLog] = useState([])
  const [activeToasts, setActiveToasts] = useState([])
  const [strayAlerts, setStrayAlerts] = useState([])
  const [showStrayLines, setShowStrayLines] = useState(true)
  const [strayPanelExpanded, setStrayPanelExpanded] = useState(true)
  const [straySuppressedUntil, setStraySuppressedUntil] = useState(0)
  const [versionInfo, setVersionInfo] = useState(null)
  const [pastures, setPastures] = useState([])
  const [networkStatus, setNetworkStatus] = useState(null)
  const [ranchName, setRanchName] = useState('RanchOS')

  // Modals
  const [showCowModal, setShowCowModal] = useState(false)
  const [showCamerasModal, setShowCamerasModal] = useState(false)
  const [showChuteModal, setShowChuteModal] = useState(false)
  const [showVaccinesModal, setShowVaccinesModal] = useState(false)
  const [showSensorModal, setShowSensorModal] = useState(false)
  const [selectedSensor, setSelectedSensor] = useState(null)
  const [showStrayAlertsModal, setShowStrayAlertsModal] = useState(false)

  const previousSensorsRef = useRef({})
  const previousGatesRef = useRef([])
  const previousCamerasRef = useRef({})
  const toastTimeoutsRef = useRef({})
  const demoIntervalRef = useRef(null)
  const demoCursorRef = useRef(0)

  const pushNotification = useCallback(
    (notification) => {
      if (!isAuthenticated) {
        return
      }

      const entry = {
        ...notification,
        id: notification.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp: notification.timestamp || new Date().toISOString(),
      }

      setActiveToasts((previous) => {
        const filtered = previous.filter((item) => item.id !== entry.id)
        return [entry, ...filtered]
      })

      if (toastTimeoutsRef.current[entry.id]) {
        clearTimeout(toastTimeoutsRef.current[entry.id])
      }

      toastTimeoutsRef.current[entry.id] = setTimeout(() => {
        setActiveToasts((previous) => previous.filter((item) => item.id !== entry.id))
        delete toastTimeoutsRef.current[entry.id]
      }, TOAST_DURATION_MS)
    },
    [isAuthenticated]
  )

  const handleDismissToast = useCallback((id) => {
    if (toastTimeoutsRef.current[id]) {
      clearTimeout(toastTimeoutsRef.current[id])
      delete toastTimeoutsRef.current[id]
    }
    setActiveToasts((previous) => previous.filter((notification) => notification.id !== id))
  }, [])

  const handleSelectCow = useCallback((cow) => {
    if (!cow) {
      setSelectedCow(null)
      setShowCowModal(false)
      return
    }

    setSelectedCow(cow)
    setShowCowModal(true)
  }, [])

  useEffect(() => {
    // Set up global error handler
    const handleError = (event) => {
      console.error('Global error caught:', event.error)
      logErrorToBackend(event.error, {
        type: 'uncaught',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    }

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      logErrorToBackend(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { type: 'unhandledRejection' }
      )
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      Object.values(toastTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId))
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
        demoIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !demoMode) {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
        demoIntervalRef.current = null
      }
      return
    }

    pushNotification({
      type: 'system',
      level: 'info',
      title: 'Demo mode activated',
      message: 'Simulated ranch alerts will roll in automatically.',
    })

    //     const emitNext = () => {
    //       const blueprint = DEMO_NOTIFICATIONS[demoCursorRef.current % DEMO_NOTIFICATIONS.length]
    //       demoCursorRef.current += 1
    //       pushNotification({
    //         ...blueprint,
    //         id: `demo-${Date.now()}-${demoCursorRef.current}`,
    //       })
    //     }
    // 
    //     emitNext()
    demoIntervalRef.current = setInterval(emitNext, DEMO_NOTIFICATION_INTERVAL_MS)

    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
        demoIntervalRef.current = null
      }
    }
  }, [demoMode, isAuthenticated, pushNotification])

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('ranchOS_token')
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    }
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/config', {
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error('Unable to load map configuration')
      const data = await response.json()
      setConfig({
        token: data.mapboxToken,
        center: data.ranchCenter,
        fence: data.fence,
      })

      // Set ranch name if available
      if (data.ranchName) {
        setRanchName(data.ranchName)
      }

      // Fetch pastures
      const pasturesResponse = await fetch('/api/pastures', {
        headers: getAuthHeaders()
      })
      if (pasturesResponse.ok) {
        const pasturesData = await pasturesResponse.json()
        setPastures(pasturesData.pastures || [])
      }
    } catch (error) {
      console.error(error)
    }
  }, [getAuthHeaders])

  const fetchVersion = useCallback(async () => {
    try {
      const response = await fetch('/api/version')
      if (response.ok) {
        const data = await response.json()
        setVersionInfo(data)
      }
    } catch (error) {
      console.error('Failed to fetch version:', error)
    }
  }, [])

  const fetchSensors = useCallback(async () => {
    try {
      const response = await fetch('/api/sensors', {
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error('Sensor endpoint failed')
      const data = await response.json()
      const nextSensors = data.sensors || {}
      const sanitizedSensors = {}
      const previous = previousSensorsRef.current || {}

      const parseBars = (reading) => {
        if (typeof reading?.bars === 'number') return reading.bars
        const fromValue = parseInt(String(reading?.value || '').replace(/\D/g, ''), 10)
        if (!Number.isNaN(fromValue)) return fromValue
        return 0
      }

      let latestNetwork = null
      Object.entries(nextSensors).forEach(([rawKey, reading]) => {
        const normalizedKey = rawKey.toUpperCase()
        const looksNetwork = normalizedKey.includes('NETWORK')

        if (looksNetwork || typeof reading?.bars !== 'undefined') {
          if (!latestNetwork) {
            latestNetwork = {
              key: normalizedKey,
              bars: Math.max(0, Math.min(5, parseBars(reading))),
              detail: reading?.detail,
              status: reading?.status || 'green'
            }
          }
          return
        }

        sanitizedSensors[normalizedKey] = reading

        if (reading?.status === 'red' && previous[normalizedKey]?.status !== 'red') {
          pushNotification({
            type: 'sensor',
            level: 'alert',
            title: `${normalizedKey} sensor alert`,
            message: reading.detail || `${normalizedKey} reported a critical condition.`,
          })
        }
      })

      setNetworkStatus(latestNetwork)
      previousSensorsRef.current = sanitizedSensors
      setSensors(sanitizedSensors)
      setSensorsList(data.sensorsList || [])
    } catch (error) {
      console.error(error)
    }
  }, [pushNotification, getAuthHeaders])

  const fetchHerd = useCallback(async () => {
    try {
      const response = await fetch('/api/herd', {
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error('Herd endpoint failed')
      const data = await response.json()
      setHerd(data.herd)
      // Vaccine log should come from backend API in the future
    } catch (error) {
      console.error(error)
    }
  }, [getAuthHeaders])

  const fetchGates = useCallback(async () => {
    try {
      const response = await fetch('/api/gates', {
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error('Gates endpoint failed')
      const data = await response.json()
      const previous = previousGatesRef.current || []
      const nextGates = data.gates || []
      nextGates.forEach((gate) => {
        const previousGate = previous.find((entry) => entry.id === gate.id)
        if (previousGate && previousGate.status !== gate.status) {
          pushNotification({
            type: 'gate',
            level: gate.status === 'open' ? 'warning' : 'success',
            title: `${gate.id} ${gate.status === 'open' ? 'opened' : 'secured'}`,
            message:
              gate.status === 'open'
                ? 'Perimeter gate opened — confirm this is expected.'
                : 'Perimeter gate locked and secured.',
          })
        }
      })
      previousGatesRef.current = nextGates
      setGates(nextGates)
    } catch (error) {
      console.error(error)
    }
  }, [pushNotification, getAuthHeaders])

  const fetchChute = useCallback(async () => {
    try {
      const response = await fetch('/api/chute', {
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error('Chute endpoint failed')
      const data = await response.json()
      setChute(data.chute)
      setChuteLog((previous) => {
        const filtered = previous.filter((entry) => entry.last_weighed !== data.chute.last_weighed)
        return [data.chute, ...filtered].slice(0, MAX_CHUTE_LOG)
      })
    } catch (error) {
      console.error(error)
    }
  }, [getAuthHeaders])

  const fetchCameras = useCallback(async () => {
    try {
      const response = await fetch('/api/cameras', {
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error('Camera endpoint failed')
      const data = await response.json()
      const previous = previousCamerasRef.current || {}
      const nextCameras = data.cameras || []
      nextCameras.forEach((camera) => {
        const previousCamera = previous[camera.camera]
        if (camera.predator_detected && !previousCamera?.predator_detected) {
          pushNotification({
            type: 'predator',
            level: 'alert',
            title: `Predator near ${camera.location}`,
            message: `${camera.camera.toUpperCase()} flagged predator movement.`,
          })
        }
      })
      previousCamerasRef.current = nextCameras.reduce((accumulator, camera) => {
        accumulator[camera.camera] = camera
        return accumulator
      }, {})
      setCameras(nextCameras)
    } catch (error) {
      console.error(error)
    }
  }, [pushNotification, getAuthHeaders])

  const fetchStrayAlerts = useCallback(async () => {
    // Skip if alerts are suppressed
    if (Date.now() < straySuppressedUntil) {
      setStrayAlerts([])
      return
    }

    try {
      const response = await fetch('/api/stray-alerts', {
        headers: getAuthHeaders()
      })
      if (!response.ok) throw new Error('Stray alerts endpoint failed')
      const data = await response.json()
      const alerts = data.alerts || []

      // Notify about new strays
      const previousStrayIds = new Set(strayAlerts.map((a) => a.cowId))
      alerts.forEach((alert) => {
        if (!previousStrayIds.has(alert.cowId)) {
          pushNotification({
            type: 'stray',
            level: 'warning',
            title: `AI Alert: Cattle Wandered Off`,
            message: `${alert.name} detected away from herd`,
          })
        }
      })

      setStrayAlerts(alerts)
    } catch (error) {
      console.error(error)
    }
  }, [strayAlerts, pushNotification, straySuppressedUntil, getAuthHeaders])

  useEffect(() => {
    fetchConfig()
    fetchVersion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = useCallback(() => {
    // Clear authentication state
    setIsAuthenticated(false)
    setCurrentUser(null)
    setUserRole('user')
    setAuthToken(null)
    setRanchId('demo')
    localStorage.removeItem('ranchOS_token')
    localStorage.removeItem('ranchOS_user')
    localStorage.removeItem('ranchOS_role')
    localStorage.removeItem('ranchOS_ranchId')
    sessionStorage.removeItem('ranchOS_session_active')
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchSensors()
    const interval = setInterval(fetchSensors, SENSOR_REFRESH_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchHerd()
    const interval = setInterval(fetchHerd, HERD_REFRESH_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchGates()
    const interval = setInterval(fetchGates, GATE_REFRESH_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchChute()
    const interval = setInterval(fetchChute, CHUTE_REFRESH_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchCameras()
    const interval = setInterval(fetchCameras, CAMERA_REFRESH_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchStrayAlerts()
    const interval = setInterval(fetchStrayAlerts, 7000) // Poll every 7 seconds
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleLogin = useCallback(async ({ username, password }) => {
    try {
      setLoginError('')
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Invalid credentials')
      }
      const data = await response.json()

      // Store authentication data
      const user = data.user || username
      const role = data.role || 'user'
      const token = data.token
      const userRanchId = data.ranchId || 'demo'

      setCurrentUser(user)
      setUserRole(role)
      setAuthToken(token)
      setRanchId(userRanchId)
      setIsAuthenticated(true)

      localStorage.setItem('ranchOS_token', token)
      localStorage.setItem('ranchOS_user', user)
      localStorage.setItem('ranchOS_role', role)
      localStorage.setItem('ranchOS_ranchId', userRanchId)
    } catch (error) {
      setLoginError(error.message)
      setIsAuthenticated(false)
      localStorage.removeItem('ranchOS_token')
      localStorage.removeItem('ranchOS_user')
      localStorage.removeItem('ranchOS_role')
      localStorage.removeItem('ranchOS_ranchId')
    }
  }, [])

  const handleSignupSuccess = useCallback((ranch) => {
    setShowSignup(false)
    // Close signup and show login
    // User can now log in with their newly created credentials
  }, [])

  const handleShowSignup = useCallback(() => {
    setShowSignup(true)
    setLoginError('')
  }, [])

  const handleCancelSignup = useCallback(() => {
    setShowSignup(false)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentUser(null)
      setSelectedCow(null)
      setChuteLog([])
      setShowCowModal(false)
      setShowCamerasModal(false)
      setShowChuteModal(false)
      setShowVaccinesModal(false)
      setShowSensorModal(false)
      setSelectedSensor(null)
      setActiveToasts([])
      previousSensorsRef.current = {}
      previousGatesRef.current = []
      previousCamerasRef.current = {}
      Object.values(toastTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId))
      toastTimeoutsRef.current = {}
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current)
        demoIntervalRef.current = null
      }
      demoCursorRef.current = 0
    }
  }, [isAuthenticated])


  const herdStats = useMemo(() => {
    // Stray count comes from strayAlerts state
    return { total: herd.length, strays: 0 }
  }, [herd, config.center])

  const sensorEntries = useMemo(() => Object.entries(sensors ?? {}), [sensors])

  const systemStatus = useMemo(() => {
    const hasRed = sensorEntries.some(([, reading]) => reading?.status === 'red')
    const hasYellow = sensorEntries.some(([, reading]) => reading?.status === 'yellow')
    if (hasRed) return 'critical'
    if (hasYellow) return 'warning'
    return 'normal'
  }, [sensorEntries])

  const cameraAlerts = useMemo(() => {
    return cameras.filter((cam) => cam.predator_detected).length
  }, [cameras])

  return (
    <div className="app-container">
      {/* Full-Screen Map */}
      <div className="map-container">
        <MapPanel
          token={config.token}
          center={config.center}
          fence={config.fence}
          herd={herd}
          gates={gates}
          selectedCow={selectedCow}
          onSelectCow={handleSelectCow}
          stats={herdStats}
          strayAlerts={strayAlerts}
          showStrayLines={showStrayLines}
          pastures={pastures}
          sensors={sensorsList}
        />
      </div>

      {/* Admin Panel */}
      {isAuthenticated && userRole === 'admin' && showAdminPanel && (
        <AdminPanel onClose={async () => {
          setShowAdminPanel(false)
          // Wait for config to be fetched before re-rendering map
          await fetchConfig()
        }} />
      )}

      {/* AI Stray Detection Overlay - Critical Alert (Regular Users Only) */}
      {isAuthenticated && userRole !== 'admin' && (
        <>
          <button
            className="stray-overlay-toggle-tab"
            onClick={() => setStrayPanelExpanded(!strayPanelExpanded)}
            title={strayPanelExpanded ? 'Hide AI alerts' : 'Show AI alerts'}
          >
            <span className="stray-overlay-toggle-icon">🤖</span>
            <span className="stray-overlay-toggle-count">{strayAlerts.length}</span>
            <span className="stray-overlay-toggle-arrow">{strayPanelExpanded ? '◀' : '▶'}</span>
          </button>
          <div className={`stray-overlay-panel ${strayPanelExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="stray-overlay-header">
              <div className="stray-overlay-title">
                <span className="stray-overlay-icon">🤖</span>
                <div>
                  <div className="stray-overlay-main-title">AI STRAY DETECTION</div>
                  <div className="stray-overlay-subtitle">
                    {strayAlerts.length > 0
                      ? `${strayAlerts.length} cattle away from herd`
                      : 'No detections'}
                  </div>
                </div>
              </div>
              <div className="stray-overlay-actions">
                {strayAlerts.length > 0 && (
                  <>
                    <button
                      className={`stray-overlay-toggle ${showStrayLines ? 'active' : ''}`}
                      onClick={() => setShowStrayLines(!showStrayLines)}
                      title={showStrayLines ? 'Hide connection lines' : 'Show connection lines'}
                    >
                      {showStrayLines ? '━' : '╌'}
                    </button>
                    <button
                      className="stray-overlay-clear"
                      onClick={() => setStraySuppressedUntil(Date.now() + 2 * 60 * 1000)}
                      title="Clear alerts for 2 minutes"
                    >
                      Clear 2min
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="stray-overlay-body">
              {strayAlerts.length > 0 ? (
                strayAlerts.map((alert) => (
                <div
                  key={alert.cowId}
                  className="stray-overlay-card"
                  onClick={() => {
                    const cow = herd.find((c) => c.id === alert.cowId)
                    if (cow) {
                      setSelectedCow(cow)
                      setShowCowModal(true)
                    }
                  }}
                >
                  <div className="stray-overlay-card-header">
                    <div>
                      <div className="stray-overlay-card-id">{alert.cowId}</div>
                      <div className="stray-overlay-card-name">{alert.name}</div>
                    </div>
                    <div className="stray-overlay-card-badge">{alert.duration}</div>
                  </div>
                  <div className="stray-overlay-card-location">
                    <div className="stray-overlay-card-coord">
                      <span>📍</span>
                      <span>{alert.lat.toFixed(5)}°, {alert.lon.toFixed(5)}°</span>
                    </div>
                    <div className="stray-overlay-card-alt">
                      <span>⛰️</span>
                      <span>{alert.altitude} ft</span>
                    </div>
                    {alert.distanceToClosest && (
                      <div className="stray-overlay-card-distance">
                        <span>🎯</span>
                        <span>{alert.distanceToClosest}ft to {alert.closestCow?.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="stray-overlay-card-action">
                    👆 Tap to locate and deploy ranch hands
                  </div>
                </div>
              ))
              ) : (
                <div className="stray-overlay-empty">
                  <div className="stray-overlay-empty-icon">✓</div>
                  <div className="stray-overlay-empty-text">All cattle within herd boundaries</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Floating Header */}
      <header className="floating-header glass-panel">
        <div className="header-brand">
          <img src="/static/logo.png" alt={ranchName} className="header-logo" />
          <div className="header-brand-text">
            <div className="header-company-name">{ranchName.toUpperCase()}</div>
            <div className="header-brand-title">ranchOS Command Center</div>
          </div>
        </div>

        <div className="header-actions">
          {isAuthenticated && userRole !== 'admin' && (
            <div className={`header-system-status status-${systemStatus}`}>
              <span className="system-status-dot" />
              <span className="system-status-text">
                {systemStatus === 'critical' ? 'Systems Critical' : systemStatus === 'warning' ? 'Systems Warning' : 'All Systems Normal'}
              </span>
            </div>
          )}

          {isAuthenticated && userRole === 'admin' && (
            <button className="btn btn-primary" onClick={() => setShowAdminPanel(true)}>
              Admin Panel
            </button>
          )}

          {isAuthenticated && currentUser && (
            <>
              <div className="header-user-info">
                <div className="user-avatar">{currentUser.charAt(0).toUpperCase()}</div>
                <span>{currentUser}</span>
                {userRole === 'admin' && <span className="user-role-badge">Admin</span>}
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleLogout}
                title="Logout"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      {/* Command Bar (Bottom Sensor Tiles) - Regular Users Only */}
      {isAuthenticated && userRole !== 'admin' && sensorEntries.length > 0 && (
        <div className="command-bar glass-panel">
          {sensorEntries.map(([key, reading]) => (
            <div
              key={key}
              className={`sensor-tile status-${reading?.status || 'green'}`}
              onClick={() => {
                setSelectedSensor({ key, reading })
                setShowSensorModal(true)
              }}
              title="Click for details"
            >
              <div className="sensor-icon">{getIconForSensor(key)}</div>
              <div className="sensor-label">{key}</div>
              <div className="sensor-value">{reading?.value || 'OK'}</div>
            </div>
          ))}
        </div>
      )}

      {/* No Sensors Message for Regular Users */}
      {isAuthenticated && userRole !== 'admin' && sensorEntries.length === 0 && (
        <div className="command-bar glass-panel" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📊</div>
            <div style={{ fontSize: '0.875rem' }}>No sensors configured</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Contact admin to set up ranch sensors
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions (Right Side) */}
      {isAuthenticated && (
        <div className="quick-actions">
          <button
            className="quick-action-btn"
            onClick={() => setShowCamerasModal(true)}
            title="Security Cameras"
          >
            📹
            {cameraAlerts > 0 && <span className="badge">{cameraAlerts}</span>}
          </button>

          <button
            className="quick-action-btn"
            onClick={() => setShowChuteModal(true)}
            title="Weighing Chute"
          >
            ⚖
            {chuteLog.length > 0 && <span className="badge">{chuteLog.length}</span>}
          </button>

          <button
            className="quick-action-btn"
            onClick={() => setShowVaccinesModal(true)}
            title="Health Records"
          >
            🏥
          </button>

          <button
            className="quick-action-btn"
            onClick={() => setShowStrayAlertsModal(true)}
            title="AI Stray Detection"
          >
            🤖
            {strayAlerts.length > 0 && <span className="badge">{strayAlerts.length}</span>}
          </button>
        </div>
      )}

      {/* Toast Notifications */}
      {activeToasts.length > 0 && (
        <div className="toast-container">
          {activeToasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast level-${toast.level || 'info'}`}
              onClick={() => handleDismissToast(toast.id)}
            >
              <div className="toast-icon">{getIconForLevel(toast.level)}</div>
              <div className="toast-content">
                <div className="toast-title">{toast.title}</div>
                <div className="toast-message">{toast.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Network Indicator - Top Right Corner (Cell Phone Style) */}
      {isAuthenticated && networkStatus && (
        <div className="network-indicator-mobile">
          <div className="network-bars">
            {[0, 1, 2, 3, 4].map((index) => (
              <span
                key={`bar-${index}`}
                className={`network-bar ${networkStatus.bars > index ? 'active' : ''}`}
                style={{ height: `${8 + index * 3}px` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Version Display */}
      {versionInfo && isAuthenticated && (
        <div className="version-display" title={`Build: ${versionInfo.buildNumber}\nBuilt: ${new Date(versionInfo.buildDate).toLocaleString()}`}>
          v{versionInfo.version}
        </div>
      )}

      {/* Login Overlay */}
      <LoginOverlay
        visible={!isAuthenticated && !showSignup}
        error={loginError}
        onSubmit={handleLogin}
        onSignup={handleShowSignup}
      />

      {/* Ranch Signup */}
      <RanchSignup
        visible={showSignup}
        onSuccess={handleSignupSuccess}
        onCancel={handleCancelSignup}
      />

      {/* Cow Details Modal */}
      <Modal open={showCowModal} title={selectedCow ? `${selectedCow.id} • ${selectedCow.name}` : 'Cow Details'} onClose={() => setShowCowModal(false)}>
        {selectedCow ? (
          <div className="data-grid">
            <div className="stat-card">
              <div className="stat-label">Weight</div>
              <div className="stat-value">{selectedCow.weight} lbs</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Temperature</div>
              <div className="stat-value">{selectedCow.temperature}°F</div>
            </div>
            <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
              <div className="stat-label">Vaccines</div>
              {selectedCow.vaccines && selectedCow.vaccines.length > 0 ? (
                <div style={{ marginTop: '0.5rem' }}>
                  {selectedCow.vaccines.map((vaccine, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      <span>{vaccine.name}</span>
                      <span style={{ color: 'var(--text-tertiary)' }}>{vaccine.date}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No vaccine records</div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state">No cow selected</div>
        )}
      </Modal>

      {/* Cameras Modal - Quad View */}
      <Modal open={showCamerasModal} title="Security Cameras • Live Feed" size="lg" onClose={() => setShowCamerasModal(false)}>
        <div className="camera-grid">
          {cameras.map((camera) => (
            <div key={camera.camera} className="camera-feed-container">
              <div className="camera-feed-header">
                <span className="camera-feed-label">{camera.camera.toUpperCase()}</span>
                <span className={`camera-feed-status status-${camera.status}`}>
                  {camera.status}
                </span>
              </div>
              {camera.status === 'online' ? (
                <>
                  {camera.embedUrl ? (
                    <iframe
                      className="camera-feed-video"
                      src={camera.embedUrl}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={camera.name}
                    />
                  ) : (
                    <div className="camera-feed-placeholder">
                      <div>📹</div>
                      <div>Live Feed Unavailable</div>
                    </div>
                  )}
                  <div className="camera-feed-footer">
                    <span className="camera-feed-location">{camera.location}</span>
                    {camera.predator_detected && (
                      <span className="camera-feed-alert">⚠️ PREDATOR</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="camera-feed-offline">
                  <div className="camera-feed-offline-icon">📹</div>
                  <div className="camera-feed-offline-text">Camera Offline</div>
                  <div className="camera-feed-location">{camera.location}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Chute Log Modal */}
      <Modal open={showChuteModal} title="Chute Sync Log" onClose={() => setShowChuteModal(false)}>
        <div className="log-table">
          <div className="log-table-header">
            <span>Tag</span>
            <span>Weight</span>
            <span>Temp</span>
            <span>Operator</span>
            <span>Timestamp</span>
          </div>
          <div className="log-table-body">
            {chuteLog.length === 0 ? (
              <div className="empty-state">No chute records yet</div>
            ) : (
              chuteLog.map((entry) => (
                <div key={entry.last_weighed} className="log-table-row">
                  <span>{entry.id}</span>
                  <span>{entry.weight} lbs</span>
                  <span>{entry.temperature}°F</span>
                  <span>{entry.operator}</span>
                  <span>{new Date(entry.last_weighed).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Vaccines Modal */}
      <Modal open={showVaccinesModal} title="Vaccination Ledger" size="lg" onClose={() => setShowVaccinesModal(false)}>
        <div className="log-table">
          <div className="log-table-header">
            <span>Cattle</span>
            <span>Vaccine</span>
            <span>Admin</span>
            <span>Logged</span>
          </div>
          <div className="log-table-body">
            {vaccineLog.length === 0 ? (
              <div className="empty-state">Vaccine data not yet synchronized</div>
            ) : (
              vaccineLog.map((entry) => (
                <div key={entry.id} className="log-table-row">
                  <span>
                    <strong>{entry.cowId}</strong>
                    <small>{entry.cowName}</small>
                  </span>
                  <span>{entry.vaccine}</span>
                  <span>{entry.administeredBy}</span>
                  <span>
                    {new Date(entry.timestamp).toLocaleDateString()} · {entry.note}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* AI Stray Detection Modal */}
      <Modal open={showStrayAlertsModal} title="🤖 AI Stray Detection Alerts" size="lg" onClose={() => setShowStrayAlertsModal(false)}>
        {strayAlerts.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🎯</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              All Cattle Accounted For
            </div>
            <div style={{ color: 'var(--text-tertiary)' }}>
              AI monitoring detects no cattle away from the herd
            </div>
          </div>
        ) : (
          <div className="stray-alerts-grid">
            {strayAlerts.map((alert) => (
              <div key={alert.cowId} className="stray-alert-card" onClick={() => {
                const cow = herd.find((c) => c.id === alert.cowId)
                if (cow) {
                  setSelectedCow(cow)
                  setShowStrayAlertsModal(false)
                  setShowCowModal(true)
                }
              }}>
                <div className="stray-alert-header">
                  <div>
                    <div className="stray-alert-id">{alert.cowId}</div>
                    <div className="stray-alert-name">{alert.name}</div>
                  </div>
                  <div className="stray-alert-duration">{alert.duration}</div>
                </div>
                <div className="stray-alert-details">
                  <div className="stray-alert-detail">
                    <span className="stray-alert-label">Latitude</span>
                    <span className="stray-alert-value">{alert.lat.toFixed(6)}°</span>
                  </div>
                  <div className="stray-alert-detail">
                    <span className="stray-alert-label">Longitude</span>
                    <span className="stray-alert-value">{alert.lon.toFixed(6)}°</span>
                  </div>
                  <div className="stray-alert-detail">
                    <span className="stray-alert-label">Altitude</span>
                    <span className="stray-alert-value">{alert.altitude} ft</span>
                  </div>
                </div>
                <div className="stray-alert-footer">
                  <span>🎯 Click to locate on map</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Sensor Details Modal */}
      <Modal
        open={showSensorModal}
        title={selectedSensor ? `${selectedSensor.key} Sensor` : 'Sensor Details'}
        onClose={() => setShowSensorModal(false)}
      >
        {selectedSensor ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div className="data-grid">
              <div className="stat-card">
                <div className="stat-label">Status</div>
                <div className={`stat-value accent-${selectedSensor.reading?.status || 'green'}`}>
                  {selectedSensor.reading?.status?.toUpperCase() || 'NORMAL'}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Current Reading</div>
                <div className="stat-value">{selectedSensor.reading?.value || 'N/A'}</div>
              </div>
            </div>

            <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
              <div className="stat-label">Details</div>
              <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {selectedSensor.reading?.detail || 'All systems operating normally.'}
              </p>
            </div>

            {selectedSensor.key === 'GATE' && gates.length > 0 && (
              <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
                <div className="stat-label">Gate Status</div>
                <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {gates.map((gate) => (
                    <div
                      key={gate.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: 'var(--spacing-sm)',
                        background: 'var(--color-bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: `3px solid ${gate.status === 'open' ? '#ff3b3b' : '#00ff88'}`,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{gate.id}</span>
                      <span style={{ color: gate.status === 'open' ? '#ff3b3b' : '#00ff88', textTransform: 'uppercase', fontSize: '0.875rem' }}>
                        {gate.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">No sensor data available</div>
        )}
      </Modal>
    </div>
  )
}

export default App
