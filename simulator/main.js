class RanchSimulatorDashboard {
  constructor() {
    this.serverInput = document.getElementById('serverUrl')
    this.pingStatus = document.getElementById('pingStatus')
    this.pingButton = document.getElementById('pingServerBtn')
    this.pingButton.addEventListener('click', () => this.pingServer())

    this.sensorSimulator = new SensorSimulator(this)
    this.herdSimulator = new HerdSimulator(this)
  }

  getServerUrl() {
    const value = this.serverInput.value.trim()
    return value || 'http://localhost:8082'
  }

  async pingServer() {
    const baseUrl = this.getServerUrl()
    this.pingStatus.textContent = 'Pinging...'
    this.pingStatus.classList.remove('success', 'error')

    try {
      const response = await fetch(`${baseUrl}/api/version`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      this.pingStatus.textContent = `Connected (v${data.version || 'dev'})`
      this.pingStatus.classList.add('success')
    } catch (error) {
      console.error(error)
      this.pingStatus.textContent = 'Connection failed'
      this.pingStatus.classList.add('error')
    }
  }
}

class SensorSimulator {
  constructor(dashboard) {
    this.dashboard = dashboard
    this.isRunning = false
    this.updateInterval = null
    this.sensors = []

    this.elements = {
      connectionStatus: document.getElementById('sensorConnectionStatus'),
      waterCount: document.getElementById('waterCount'),
      fenceCount: document.getElementById('fenceCount'),
      gateCount: document.getElementById('gateCount'),
      tempCount: document.getElementById('tempCount'),
      networkCount: document.getElementById('networkCount'),
      soilCount: document.getElementById('soilCount'),
      updateInterval: document.getElementById('updateInterval'),
      startBtn: document.getElementById('startSensorBtn'),
      stopBtn: document.getElementById('stopSensorBtn'),
      syncBtn: document.getElementById('syncSensorsBtn'),
      sensorCount: document.getElementById('sensorCount'),
      sensorsList: document.getElementById('sensorsList'),
      logs: document.getElementById('sensorLogs'),
      clearLogsBtn: document.getElementById('clearSensorLogsBtn')
    }

    this.bindEvents()
    this.renderSensors()
  }

  bindEvents() {
    this.elements.startBtn.addEventListener('click', () => this.start())
    this.elements.stopBtn.addEventListener('click', () => this.stop())
    this.elements.syncBtn.addEventListener('click', () => this.syncWithServer())
    this.elements.clearLogsBtn.addEventListener('click', () => this.clearLogs())
  }

  log(message, level = 'info') {
    const entry = document.createElement('div')
    entry.className = `log-entry log-${level}`
    const time = new Date().toLocaleTimeString()
    entry.innerHTML = `<span class="log-time">${time}</span><span class="log-message">${message}</span>`
    this.elements.logs.prepend(entry)
    while (this.elements.logs.children.length > 80) {
      this.elements.logs.removeChild(this.elements.logs.lastChild)
    }
  }

  updateConnectionStatus(connected) {
    if (connected) {
      this.elements.connectionStatus.classList.add('connected')
      this.elements.connectionStatus.querySelector('.status-text').textContent = 'Connected'
    } else {
      this.elements.connectionStatus.classList.remove('connected')
      this.elements.connectionStatus.querySelector('.status-text').textContent = 'Disconnected'
    }
  }

  getConfigCounts() {
    return {
      water: parseInt(this.elements.waterCount.value, 10) || 0,
      fence: parseInt(this.elements.fenceCount.value, 10) || 0,
      gate: parseInt(this.elements.gateCount.value, 10) || 0,
      temperature: parseInt(this.elements.tempCount.value, 10) || 0,
      network: parseInt(this.elements.networkCount.value, 10) || 0,
      soil: parseInt(this.elements.soilCount.value, 10) || 0
    }
  }

  createSensorsFromConfig() {
    const config = this.getConfigCounts()
    const now = Date.now()
    const result = []

    const addSensors = (type, count) => {
      for (let i = 0; i < count; i += 1) {
        result.push({
          id: `sim-${type}-${now}-${i}`,
          type,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${i + 1}`,
          value: this.getInitialValue(type),
          lastUpdate: new Date(),
          icon: this.getSensorIcon(type)
        })
      }
    }

    addSensors('water', config.water)
    addSensors('fence', config.fence)
    addSensors('gate', config.gate)
    addSensors('temperature', config.temperature)
    addSensors('network', config.network)
    addSensors('soil', config.soil)

    this.sensors = result
    this.updateSensorCount()
    this.renderSensors()
  }

  updateSensorCount() {
    this.elements.sensorCount.textContent = `${this.sensors.length} sensor${this.sensors.length === 1 ? '' : 's'}`
  }

  getInitialValue(type) {
    switch (type) {
      case 'water':
        return Math.random() * 40 + 60
      case 'fence':
        return Math.random() * 3 + 6.5
      case 'gate':
        return Math.random() > 0.7 ? 'open' : 'closed'
      case 'temperature':
        return Math.random() * 20 + 60
      case 'network':
        return Math.floor(Math.random() * 3) + 3
      case 'soil':
        return Math.random() * 30 + 20
      default:
        return 0
    }
  }

  getSensorIcon(type) {
    const icons = {
      water: '💧',
      fence: '⚡',
      gate: '🚪',
      temperature: '🌡️',
      network: '📡',
      soil: '🌱'
    }
    return icons[type] || '📊'
  }

  adoptServerSensors(serverSensors) {
    if (!serverSensors || serverSensors.length === 0) {
      return false
    }
    this.sensors = serverSensors.map((sensor) => ({
      id: sensor.id,
      type: sensor.type || 'custom',
      name: sensor.name || sensor.id,
      value: sensor.lastValue ?? this.getInitialValue(sensor.type || 'custom'),
      lastUpdate: sensor.lastUpdate ? new Date(sensor.lastUpdate) : new Date(),
      icon: this.getSensorIcon(sensor.type || 'custom')
    }))
    this.updateSensorCount()
    this.renderSensors()
    return true
  }

  updateSensorValue(sensor) {
    let newValue = sensor.value
    switch (sensor.type) {
      case 'water':
        newValue += (Math.random() - 0.6) * 2
        newValue = Math.max(0, Math.min(100, newValue))
        break
      case 'fence':
        newValue += (Math.random() - 0.5) * 0.3
        newValue = Math.max(6, Math.min(10, newValue))
        break
      case 'gate':
        if (Math.random() < 0.1) {
          newValue = newValue === 'open' ? 'closed' : 'open'
        }
        break
      case 'temperature':
        newValue += (Math.random() - 0.5) * 2
        newValue = Math.max(50, Math.min(90, newValue))
        break
      case 'network':
        if (Math.random() < 0.2) {
          newValue = Math.floor(Math.random() * 3) + 3
        }
        break
      case 'soil':
        newValue += (Math.random() - 0.55) * 1.5
        newValue = Math.max(0, Math.min(60, newValue))
        break
      default:
        break
    }
    sensor.value = newValue
    sensor.lastUpdate = new Date()
  }

  formatSensorValue(sensor) {
    const { value, type } = sensor
    switch (type) {
      case 'water':
        return `${value.toFixed(1)}% full`
      case 'fence':
        return `${value.toFixed(2)} kV`
      case 'gate':
        return value
      case 'temperature':
        return `${value.toFixed(1)}°F`
      case 'network':
        return `${value} bars`
      case 'soil':
        return `${value.toFixed(1)}% moisture`
      default:
        return String(value)
    }
  }

  renderSensors() {
    if (this.sensors.length === 0) {
      this.elements.sensorsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <p>No sensors configured</p>
          <p class="empty-hint">Adjust the counts and click "Start Simulation"</p>
        </div>
      `
      return
    }

    this.elements.sensorsList.innerHTML = ''
    this.sensors.forEach((sensor) => {
      const card = document.createElement('div')
      card.className = 'sensor-card'
      card.innerHTML = `
        <div class="sensor-card-header">
          <span class="sensor-icon">${sensor.icon}</span>
          <span class="sensor-pill">${sensor.type}</span>
        </div>
        <div class="sensor-name">${sensor.name}</div>
        <div class="sensor-value">${this.formatSensorValue(sensor)}</div>
        <div class="sensor-timestamp">Updated ${this.getTimeAgo(sensor.lastUpdate)}</div>
      `
      this.elements.sensorsList.appendChild(card)
    })
  }

  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000)
    if (seconds < 5) return 'just now'
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  async sendSensorData(sensor) {
    const baseUrl = this.dashboard.getServerUrl()
    try {
      const response = await fetch(`${baseUrl}/api/simulator/sensor-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensorId: sensor.id,
          name: sensor.name,
          type: sensor.type,
          value: sensor.value,
          timestamp: sensor.lastUpdate.toISOString()
        })
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return true
    } catch (error) {
      this.log(`Failed to send data for ${sensor.name}: ${error.message}`, 'warning')
      return false
    }
  }

  async updateCycle() {
    if (!this.isRunning) return

    this.sensors.forEach((sensor) => this.updateSensorValue(sensor))

    let successCount = 0
    for (const sensor of this.sensors) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await this.sendSensorData(sensor)
      if (ok) successCount += 1
    }

    this.renderSensors()
    this.log(`Sent ${successCount}/${this.sensors.length} sensor readings`, 'info')
  }

  async syncWithServer() {
    const baseUrl = this.dashboard.getServerUrl()
    try {
      const response = await fetch(`${baseUrl}/api/simulator/sensors`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      this.updateConnectionStatus(true)
      this.log(`RanchOS returned ${data.sensors.length} sensors`, 'success')
      return data.sensors
    } catch (error) {
      this.updateConnectionStatus(false)
      this.log(`Could not reach RanchOS: ${error.message}`, 'error')
      return []
    }
  }

  async start() {
    if (this.isRunning) return

    const serverSensors = await this.syncWithServer()
    const adopted = this.adoptServerSensors(serverSensors)
    if (!adopted) {
      this.log('No sensors registered on the server. Generating a local set from the counts.', 'warning')
      this.createSensorsFromConfig()
      if (this.sensors.length === 0) {
        this.log('No sensors configured. Increase the counts above.', 'warning')
        return
      }
    } else {
      this.log('Adopted RanchOS sensors — adjust counts in the Admin Panel if you need different devices.', 'info')
    }

    this.isRunning = true
    this.elements.startBtn.disabled = true
    this.elements.stopBtn.disabled = false

    await this.updateCycle()
    const intervalSeconds = parseInt(this.elements.updateInterval.value, 10) || 5
    this.updateInterval = setInterval(() => this.updateCycle(), intervalSeconds * 1000)
    this.log(`Simulation started (interval ${intervalSeconds}s)`, 'success')
  }

  stop() {
    if (!this.isRunning) return
    this.isRunning = false
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    this.elements.startBtn.disabled = false
    this.elements.stopBtn.disabled = true
    this.log('Simulation stopped', 'warning')
  }

  clearLogs() {
    this.elements.logs.innerHTML = ''
  }
}

class HerdSimulator {
  constructor(dashboard) {
    this.dashboard = dashboard
    this.statsInterval = null

    this.elements = {
      connectionStatus: document.getElementById('herdConnectionStatus'),
      totalCattleCount: document.getElementById('totalCattleCount'),
      strayPercentage: document.getElementById('strayPercentage'),
      movementSpeed: document.getElementById('movementSpeed'),
      herdCohesion: document.getElementById('herdCohesion'),
      boundaryAvoidanceStrength: document.getElementById('boundaryAvoidanceStrength'),
      clusterRadius: document.getElementById('clusterRadius'),
      strayRadius: document.getElementById('strayRadius'),
      strayDistanceThreshold: document.getElementById('strayDistanceThreshold'),
      movementLimit: document.getElementById('movementLimit'),
      labelTotalCattle: document.getElementById('labelTotalCattle'),
      labelStrayPercentage: document.getElementById('labelStrayPercentage'),
      labelMovementSpeed: document.getElementById('labelMovementSpeed'),
      labelHerdCohesion: document.getElementById('labelHerdCohesion'),
      labelBoundaryAvoidance: document.getElementById('labelBoundaryAvoidance'),
      labelClusterRadius: document.getElementById('labelClusterRadius'),
      labelStrayRadius: document.getElementById('labelStrayRadius'),
      labelStrayThreshold: document.getElementById('labelStrayThreshold'),
      labelMovementLimit: document.getElementById('labelMovementLimit'),
      statTotalCattle: document.getElementById('statTotalCattle'),
      statMainHerd: document.getElementById('statMainHerd'),
      statDesignatedStrays: document.getElementById('statDesignatedStrays'),
      statActiveStrays: document.getElementById('statActiveStrays'),
      statAvgSpread: document.getElementById('statAvgSpread'),
      statMaxSpread: document.getElementById('statMaxSpread'),
      fenceBreachWarning: document.getElementById('fenceBreachWarning'),
      applyConfigBtn: document.getElementById('applyConfigBtn'),
      resetHerdBtn: document.getElementById('resetHerdBtn'),
      refreshStatsBtn: document.getElementById('refreshStatsBtn'),
      clearLogsBtn: document.getElementById('clearHerdLogsBtn'),
      logsList: document.getElementById('herdLogs')
    }

    this.bindEvents()
    this.loadConfiguration()
  }

  bindEvents() {
    const sliders = [
      'totalCattleCount',
      'strayPercentage',
      'movementSpeed',
      'herdCohesion',
      'boundaryAvoidanceStrength',
      'clusterRadius',
      'strayRadius',
      'strayDistanceThreshold',
      'movementLimit'
    ]

    sliders.forEach((key) => {
      const element = this.elements[key]
      element.addEventListener('input', () => this.updateSliderLabels())
    })

    this.elements.applyConfigBtn.addEventListener('click', () => this.applyConfiguration())
    this.elements.resetHerdBtn.addEventListener('click', () => this.resetHerd())
    this.elements.refreshStatsBtn.addEventListener('click', () => this.loadStats(true))
    this.elements.clearLogsBtn.addEventListener('click', () => this.clearLogs())
  }

  log(message, level = 'info') {
    const entry = document.createElement('div')
    entry.className = `log-entry log-${level}`
    entry.innerHTML = `<span class="log-time">${new Date().toLocaleTimeString()}</span><span class="log-message">${message}</span>`
    this.elements.logsList.prepend(entry)
    while (this.elements.logsList.children.length > 80) {
      this.elements.logsList.removeChild(this.elements.logsList.lastChild)
    }
  }

  clearLogs() {
    this.elements.logsList.innerHTML = ''
  }

  updateConnectionStatus(connected) {
    if (connected) {
      this.elements.connectionStatus.classList.add('connected')
      this.elements.connectionStatus.querySelector('.status-text').textContent = 'Connected'
    } else {
      this.elements.connectionStatus.classList.remove('connected')
      this.elements.connectionStatus.querySelector('.status-text').textContent = 'Disconnected'
    }
  }

  updateSliderLabels() {
    this.elements.labelTotalCattle.textContent = this.elements.totalCattleCount.value
    this.elements.labelStrayPercentage.textContent = `${this.elements.strayPercentage.value}%`
    this.elements.labelMovementSpeed.textContent = this.elements.movementSpeed.value
    this.elements.labelHerdCohesion.textContent = this.elements.herdCohesion.value
    this.elements.labelBoundaryAvoidance.textContent = this.elements.boundaryAvoidanceStrength.value
    this.elements.labelClusterRadius.textContent = this.elements.clusterRadius.value
    this.elements.labelStrayRadius.textContent = this.elements.strayRadius.value
    this.elements.labelStrayThreshold.textContent = this.elements.strayDistanceThreshold.value
    this.elements.labelMovementLimit.textContent = this.elements.movementLimit.value
  }

  async loadConfiguration() {
    const baseUrl = this.dashboard.getServerUrl()
    try {
      const response = await fetch(`${baseUrl}/api/simulator/herd/config`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const config = data.config

      Object.entries({
        totalCattleCount: config.totalCattleCount,
        strayPercentage: config.strayPercentage,
        movementSpeed: config.movementSpeed,
        herdCohesion: config.herdCohesion,
        boundaryAvoidanceStrength: config.boundaryAvoidanceStrength,
        clusterRadius: config.clusterRadius,
        strayRadius: config.strayRadius,
        strayDistanceThreshold: config.strayDistanceThreshold,
        movementLimit: config.movementLimit
      }).forEach(([key, value]) => {
        if (this.elements[key]) {
          this.elements[key].value = value
        }
      })

      this.updateSliderLabels()
      this.updateConnectionStatus(true)
      this.log('Herd configuration loaded', 'success')
      this.loadStats(false)
      this.startStatsLoop()
    } catch (error) {
      this.updateConnectionStatus(false)
      this.log(`Failed to load herd config: ${error.message}`, 'error')
    }
  }

  async applyConfiguration() {
    const baseUrl = this.dashboard.getServerUrl()
    const payload = {
      totalCattleCount: parseInt(this.elements.totalCattleCount.value, 10),
      strayPercentage: parseInt(this.elements.strayPercentage.value, 10),
      movementSpeed: parseFloat(this.elements.movementSpeed.value),
      herdCohesion: parseFloat(this.elements.herdCohesion.value),
      boundaryAvoidanceStrength: parseFloat(this.elements.boundaryAvoidanceStrength.value),
      clusterRadius: parseFloat(this.elements.clusterRadius.value),
      strayRadius: parseFloat(this.elements.strayRadius.value),
      strayDistanceThreshold: parseFloat(this.elements.strayDistanceThreshold.value),
      movementLimit: parseFloat(this.elements.movementLimit.value)
    }

    try {
      const response = await fetch(`${baseUrl}/api/simulator/herd/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      this.log('Configuration applied. Reset herd to re-anchor positions.', 'success')
      this.updateConnectionStatus(true)
    } catch (error) {
      this.updateConnectionStatus(false)
      this.log(`Failed to apply configuration: ${error.message}`, 'error')
    }
  }

  async resetHerd() {
    const baseUrl = this.dashboard.getServerUrl()
    try {
      const response = await fetch(`${baseUrl}/api/simulator/herd/reset`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      this.log(`Herd reset (${data.cattleCount} cattle, ${data.strayCount} designated strays)`, 'success')
      this.updateConnectionStatus(true)
      this.loadStats(false)
    } catch (error) {
      this.updateConnectionStatus(false)
      this.log(`Failed to reset herd: ${error.message}`, 'error')
    }
  }

  async loadStats(verbose = true) {
    const baseUrl = this.dashboard.getServerUrl()
    try {
      const response = await fetch(`${baseUrl}/api/simulator/herd/stats`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const stats = await response.json()
      this.renderStats(stats)
      if (verbose) {
        this.log('Herd stats refreshed', 'info')
      }
      this.updateConnectionStatus(true)
    } catch (error) {
      this.updateConnectionStatus(false)
      this.log(`Failed to load stats: ${error.message}`, 'error')
    }
  }

  renderStats(stats) {
    this.elements.statTotalCattle.textContent = stats.totalCattle
    this.elements.statMainHerd.textContent = stats.mainHerdCount
    this.elements.statDesignatedStrays.textContent = stats.designatedStrayCount
    this.elements.statActiveStrays.textContent = stats.activeStrayAlerts
    this.elements.statAvgSpread.textContent = `${stats.averageSpread} ft`
    this.elements.statMaxSpread.textContent = `${stats.maxSpread} ft`

    if (stats.fenceBreachActive) {
      this.elements.fenceBreachWarning.classList.add('active')
      this.elements.fenceBreachWarning.textContent = '⚠️ Fence breach automation engaged'
    } else {
      this.elements.fenceBreachWarning.classList.remove('active')
      this.elements.fenceBreachWarning.textContent = 'Perimeter secure'
    }
  }

  startStatsLoop() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
    }
    this.statsInterval = setInterval(() => this.loadStats(false), 8000)
  }
}

// ======================================
// Camera Simulator Section
// ======================================

class CameraSimulator {
  constructor() {
    this.cameras = []
    this.nextPort = 9090
    this.baseUrl = 'http://localhost:8082'

    this.elements = {
      cameraName: document.getElementById('cameraName'),
      youtubeUrl: document.getElementById('youtubeUrl'),
      cameraPort: document.getElementById('cameraPort'),
      addCameraBtn: document.getElementById('addCameraBtn'),
      syncCamerasBtn: document.getElementById('syncCamerasBtn'),
      clearCameraLogsBtn: document.getElementById('clearCameraLogsBtn'),
      camerasList: document.getElementById('camerasList'),
      cameraCount: document.getElementById('cameraCount'),
      cameraLogs: document.getElementById('cameraLogs'),
      cameraConnectionStatus: document.getElementById('cameraConnectionStatus')
    }

    this.init()
  }

  init() {
    this.elements.addCameraBtn.addEventListener('click', () => this.addCamera())
    this.elements.syncCamerasBtn.addEventListener('click', () => this.syncWithRanchOS())
    this.elements.clearCameraLogsBtn.addEventListener('click', () => this.clearLogs())

    this.loadCameras()
  }

  async loadCameras() {
    try {
      const response = await fetch(`${this.baseUrl}/api/simulator/cameras`)
      if (response.ok) {
        const data = await response.json()
        this.cameras = data.cameras || []
        this.updateNextPort()
        this.renderCameras()
        this.updateConnectionStatus('connected')
        this.log('Loaded cameras from server', 'info')
      }
    } catch (error) {
      this.log(`Failed to load cameras: ${error.message}`, 'error')
      this.updateConnectionStatus('disconnected')
    }
  }

  updateNextPort() {
    const usedPorts = this.cameras.map(c => c.port)
    this.nextPort = 9090
    while (usedPorts.includes(this.nextPort)) {
      this.nextPort++
    }
    this.elements.cameraPort.value = `Next: ${this.nextPort}`
  }

  async addCamera() {
    const name = this.elements.cameraName.value.trim()
    const youtubeUrl = this.elements.youtubeUrl.value.trim()

    if (!name || !youtubeUrl) {
      this.log('Please enter both camera name and YouTube URL', 'error')
      return
    }

    if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
      this.log('Please enter a valid YouTube URL', 'error')
      return
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/simulator/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          youtubeUrl,
          port: this.nextPort
        })
      })

      if (response.ok) {
        const data = await response.json()
        this.cameras.push(data.camera)
        this.log(`Camera "${name}" added on port ${this.nextPort}`, 'success')
        this.elements.cameraName.value = ''
        this.elements.youtubeUrl.value = ''
        this.updateNextPort()
        this.renderCameras()
      } else {
        const error = await response.json()
        this.log(`Failed to add camera: ${error.detail || 'Unknown error'}`, 'error')
      }
    } catch (error) {
      this.log(`Error adding camera: ${error.message}`, 'error')
    }
  }

  async removeCamera(id) {
    try {
      const response = await fetch(`${this.baseUrl}/api/simulator/cameras/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        this.cameras = this.cameras.filter(c => c.id !== id)
        this.log(`Camera removed`, 'success')
        this.updateNextPort()
        this.renderCameras()
      }
    } catch (error) {
      this.log(`Error removing camera: ${error.message}`, 'error')
    }
  }

  async syncWithRanchOS() {
    this.log('Syncing cameras with RanchOS...', 'info')
    await this.loadCameras()
  }

  renderCameras() {
    this.elements.cameraCount.textContent = `${this.cameras.length} camera${this.cameras.length !== 1 ? 's' : ''}`

    if (this.cameras.length === 0) {
      this.elements.camerasList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📹</div>
          <p>No cameras configured</p>
          <p class="empty-hint">Add YouTube URLs to host on localhost ports</p>
        </div>
      `
      return
    }

    this.elements.camerasList.innerHTML = this.cameras.map(camera => `
      <div class="camera-item">
        <div class="camera-info">
          <div class="camera-name">📹 ${camera.name}</div>
          <div class="camera-details">
            <span>Port: <strong>${camera.port}</strong></span>
            <span>•</span>
            <a href="http://localhost:${camera.port}" target="_blank">Open Feed</a>
          </div>
          <div class="camera-url">${camera.youtubeUrl}</div>
        </div>
        <button class="btn-small btn-danger" onclick="window.cameraSimulator.removeCamera('${camera.id}')">Remove</button>
      </div>
    `).join('')
  }

  updateConnectionStatus(status) {
    const statusEl = this.elements.cameraConnectionStatus
    const dot = statusEl.querySelector('.status-dot')
    const text = statusEl.querySelector('.status-text')

    if (status === 'connected') {
      dot.style.background = '#10b981'
      text.textContent = 'Connected'
    } else {
      dot.style.background = '#64748b'
      text.textContent = 'Disconnected'
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'
    const logEntry = document.createElement('div')
    logEntry.className = `log-entry log-${type}`
    logEntry.textContent = `${timestamp} ${icon} ${message}`
    this.elements.cameraLogs.prepend(logEntry)

    // Keep only last 50 logs
    while (this.elements.cameraLogs.children.length > 50) {
      this.elements.cameraLogs.removeChild(this.elements.cameraLogs.lastChild)
    }
  }

  clearLogs() {
    this.elements.cameraLogs.innerHTML = ''
    this.log('Logs cleared', 'info')
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.ranchSimulator = new RanchSimulatorDashboard()
  window.cameraSimulator = new CameraSimulator()
})
