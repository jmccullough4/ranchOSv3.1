#!/usr/bin/env node

/**
 * RanchOS Cattle Herd Simulator
 *
 * This server simulates realistic cattle herd movement and behavior.
 * It maintains positions, tracks strays, simulates herd cohesion, and
 * pushes updates to the main RanchOS backend at configurable intervals.
 *
 * Features:
 * - Realistic herd cohesion and movement patterns
 * - Stray detection and tracking
 * - Boundary avoidance (stays within fence perimeter)
 * - Configurable herd size and behavior parameters
 * - Health monitoring and vital signs simulation
 * - Independent operation with periodic sync to main server
 */

const express = require('express')
const fs = require('fs')
const path = require('path')

// Configuration
const SIMULATOR_PORT = 9100
const RANCH_OS_URL = process.env.RANCH_OS_URL || 'http://localhost:8082'
const UPDATE_INTERVAL_MS = 5000 // Push updates to RanchOS every 5 seconds

/**
 * Default herd configuration
 */
let herdConfig = {
  totalCattleCount: 50,
  strayPercentage: 10,
  clusterRadius: 0.01,
  strayRadius: 0.05,
  movementSpeed: 0.00018,
  movementLimit: 0.0025,
  strayDistanceThreshold: 0.01,
  boundaryAvoidanceStrength: 0.3,
  herdCohesion: 0.1,
}

// Simulation state
let herdPositions = []
let herdAnchors = []
let strayTracking = {}
let fencePolygon = null
let fenceBounds = null
let ranchCenter = null
let updateTimer = null
let isRunning = false

// Cattle registry (loaded from cattle.json)
let cattleRegistry = []

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const randomBetween = (min, max) => Math.random() * (max - min) + min
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

/**
 * Calculate Euclidean distance between two points in degrees
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2))
}

/**
 * Calculate distance in meters between two lat/lon points
 */
const calculateDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const latDiff = (lat2 - lat1) * 111000 // Approx meters per degree latitude
  const lonDiff = (lon2 - lon1) * 111000 * Math.cos(lat1 * Math.PI / 180)
  return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff)
}

/**
 * Ray-casting algorithm to determine if point is inside polygon
 */
const isPointInPolygon = (lat, lon, polygon) => {
  if (!polygon || polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersect = ((yi > lat) !== (yj > lat))
      && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Calculate minimum distance from point to polygon boundary
 */
const calculateMinDistanceToPolygon = (lat, lon, polygon) => {
  if (!polygon || polygon.length < 2) return Infinity

  let minDist = Infinity
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i]
    const [x2, y2] = polygon[(i + 1) % polygon.length]

    // Distance to line segment
    const dx = x2 - x1
    const dy = y2 - y1
    const lengthSq = dx * dx + dy * dy

    if (lengthSq === 0) {
      // Point segment
      const d = calculateDistance(lat, lon, y1, x1)
      minDist = Math.min(minDist, d)
      continue
    }

    // Project point onto line segment
    const t = Math.max(0, Math.min(1, ((lon - x1) * dx + (lat - y1) * dy) / lengthSq))
    const projX = x1 + t * dx
    const projY = y1 + t * dy
    const d = calculateDistance(lat, lon, projY, projX)
    minDist = Math.min(minDist, d)
  }

  return minDist
}

/**
 * Constrain position to be within fence boundaries
 */
const constrainToFence = (lat, lon) => {
  if (!fencePolygon || !ranchCenter) {
    return { lat, lon, breached: false }
  }

  // Check if point is inside fence
  if (isPointInPolygon(lat, lon, fencePolygon)) {
    return { lat, lon, breached: false }
  }

  // Point is outside - pull it back toward center iteratively
  let constrainedLat = lat
  let constrainedLon = lon
  let breached = true

  for (let iteration = 0; iteration < 50; iteration++) {
    const deltaLat = (ranchCenter.lat - constrainedLat) * 0.05
    const deltaLon = (ranchCenter.lon - constrainedLon) * 0.05
    constrainedLat += deltaLat
    constrainedLon += deltaLon

    if (isPointInPolygon(constrainedLat, constrainedLon, fencePolygon)) {
      break
    }
  }

  return { lat: constrainedLat, lon: constrainedLon, breached }
}

/**
 * Generate random point within fence polygon
 */
const randomPointWithinFence = (spreadRadius = 0.01) => {
  if (!fenceBounds || !ranchCenter) {
    // Fallback to default location if no fence defined
    return {
      lat: 35.0 + randomBetween(-spreadRadius, spreadRadius),
      lon: -106.0 + randomBetween(-spreadRadius, spreadRadius)
    }
  }

  // Try random points until we find one inside the fence
  for (let attempt = 0; attempt < 100; attempt++) {
    const lat = ranchCenter.lat + randomBetween(-spreadRadius, spreadRadius)
    const lon = ranchCenter.lon + randomBetween(-spreadRadius, spreadRadius)

    if (isPointInPolygon(lat, lon, fencePolygon)) {
      return { lat, lon }
    }
  }

  // Fallback to center if no valid point found
  return { lat: ranchCenter.lat, lon: ranchCenter.lon }
}

// ============================================================================
// DATA LOADING AND INITIALIZATION
// ============================================================================

/**
 * Load cattle registry from cattle.json
 */
const loadCattleRegistry = () => {
  try {
    const cattlePath = path.join(__dirname, '../server/cattle.json')
    if (fs.existsSync(cattlePath)) {
      const data = fs.readFileSync(cattlePath, 'utf-8')
      cattleRegistry = JSON.parse(data)
      console.log(`Loaded ${cattleRegistry.length} cattle from registry`)
    } else {
      cattleRegistry = []
      console.log('No cattle.json found - will use default cattle count')
    }
  } catch (error) {
    console.error('Error loading cattle registry:', error)
    cattleRegistry = []
  }
}

/**
 * Load pasture boundary data from RanchOS
 */
const loadPastureData = async () => {
  try {
    const response = await fetch(`${RANCH_OS_URL}/api/admin/pastures`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    if (data.pastures && data.pastures.length > 0) {
      const primaryPasture = data.pastures[0]

      if (primaryPasture.boundary && primaryPasture.boundary.length > 0) {
        fencePolygon = primaryPasture.boundary

        // Calculate bounds
        fenceBounds = fencePolygon.reduce(
          (acc, [lon, lat]) => ({
            minLon: Math.min(acc.minLon, lon),
            maxLon: Math.max(acc.maxLon, lon),
            minLat: Math.min(acc.minLat, lat),
            maxLat: Math.max(acc.maxLat, lat),
          }),
          {
            minLon: Infinity,
            maxLon: -Infinity,
            minLat: Infinity,
            maxLat: -Infinity,
          }
        )

        // Calculate center
        ranchCenter = primaryPasture.center || {
          lat: (fenceBounds.minLat + fenceBounds.maxLat) / 2,
          lon: (fenceBounds.minLon + fenceBounds.maxLon) / 2,
        }

        console.log('Pasture boundary loaded successfully')
        console.log(`  Center: ${ranchCenter.lat.toFixed(6)}, ${ranchCenter.lon.toFixed(6)}`)
        console.log(`  Bounds: [${fenceBounds.minLat.toFixed(6)}, ${fenceBounds.minLon.toFixed(6)}] to [${fenceBounds.maxLat.toFixed(6)}, ${fenceBounds.maxLon.toFixed(6)}]`)
        return true
      }
    }

    console.warn('No pasture boundary found in RanchOS')
    return false
  } catch (error) {
    console.error('Failed to load pasture data:', error.message)
    return false
  }
}

/**
 * Initialize herd positions within the fence
 */
const initializeHerd = () => {
  // Determine herd size
  const targetCount = cattleRegistry.length > 0
    ? cattleRegistry.length
    : herdConfig.totalCattleCount

  console.log(`Initializing herd with ${targetCount} cattle...`)

  herdPositions = []
  herdAnchors = []
  strayTracking = {}

  // Calculate stray count
  const strayCount = Math.floor(targetCount * (herdConfig.strayPercentage / 100))
  const mainHerdCount = targetCount - strayCount

  // Initialize main herd (clustered)
  for (let i = 0; i < mainHerdCount; i++) {
    const position = randomPointWithinFence(herdConfig.clusterRadius)
    herdPositions.push(position)
    herdAnchors.push({ ...position })
  }

  // Initialize strays (more spread out)
  for (let i = 0; i < strayCount; i++) {
    const position = randomPointWithinFence(herdConfig.strayRadius)
    herdPositions.push(position)
    herdAnchors.push({ ...position })
  }

  console.log(`  Main herd: ${mainHerdCount} cattle`)
  console.log(`  Designated strays: ${strayCount} cattle`)
  console.log('Herd initialization complete')
}

/**
 * Load herd configuration from RanchOS
 */
const loadHerdConfig = async () => {
  try {
    const response = await fetch(`${RANCH_OS_URL}/api/simulator/herd/config`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    herdConfig = { ...herdConfig, ...data.config }
    console.log('Herd configuration loaded from RanchOS')
    return true
  } catch (error) {
    console.warn('Could not load herd config from RanchOS, using defaults:', error.message)
    return false
  }
}

// ============================================================================
// SIMULATION UPDATE LOGIC
// ============================================================================

/**
 * Update all cattle positions with realistic movement
 */
const updateHerdPositions = () => {
  if (herdPositions.length === 0) return

  // Calculate current herd center
  const herdCenter = {
    lat: herdPositions.reduce((sum, pos) => sum + pos.lat, 0) / herdPositions.length,
    lon: herdPositions.reduce((sum, pos) => sum + pos.lon, 0) / herdPositions.length,
  }

  // Update each cattle position
  herdPositions = herdPositions.map((position, index) => {
    const anchor = herdAnchors[index]

    // Base random movement
    let deltaLat = randomBetween(-herdConfig.movementSpeed, herdConfig.movementSpeed)
    let deltaLon = randomBetween(-herdConfig.movementSpeed, herdConfig.movementSpeed)

    // Apply herd cohesion (cattle stay together)
    if (herdConfig.herdCohesion > 0) {
      const cohesionLat = (herdCenter.lat - position.lat) * herdConfig.herdCohesion
      const cohesionLon = (herdCenter.lon - position.lon) * herdConfig.herdCohesion
      deltaLat += cohesionLat
      deltaLon += cohesionLon
    }

    // Apply boundary avoidance if near fence
    if (fencePolygon && herdConfig.boundaryAvoidanceStrength > 0) {
      const distToBoundary = calculateMinDistanceToPolygon(position.lat, position.lon, fencePolygon)
      const boundaryThreshold = 0.003 // Start avoiding when within ~300m

      if (distToBoundary < boundaryThreshold) {
        // Push away from boundary
        const avoidanceStrength = (1 - distToBoundary / boundaryThreshold) * herdConfig.boundaryAvoidanceStrength
        const awayFromBoundaryLat = (ranchCenter.lat - position.lat) * avoidanceStrength
        const awayFromBoundaryLon = (ranchCenter.lon - position.lon) * avoidanceStrength
        deltaLat += awayFromBoundaryLat
        deltaLon += awayFromBoundaryLon
      }
    }

    // Calculate new position with movement limits
    let nextLat = position.lat + deltaLat
    let nextLon = position.lon + deltaLon

    // Constrain to movement limit from anchor
    nextLat = clamp(nextLat, anchor.lat - herdConfig.movementLimit, anchor.lat + herdConfig.movementLimit)
    nextLon = clamp(nextLon, anchor.lon - herdConfig.movementLimit, anchor.lon + herdConfig.movementLimit)

    // Ensure within fence boundaries
    const constrained = constrainToFence(nextLat, nextLon)

    return { lat: constrained.lat, lon: constrained.lon }
  })
}

/**
 * Build herd data with stray detection
 */
const buildHerdData = () => {
  if (herdPositions.length === 0) return []

  // Calculate herd center
  const herdCenter = {
    lat: herdPositions.reduce((sum, pos) => sum + pos.lat, 0) / herdPositions.length,
    lon: herdPositions.reduce((sum, pos) => sum + pos.lon, 0) / herdPositions.length,
  }

  // Use registered cattle if available, otherwise generate default data
  const cattleCount = herdPositions.length
  const cattleData = cattleRegistry.length >= cattleCount
    ? cattleRegistry.slice(0, cattleCount)
    : Array.from({ length: cattleCount }, (_, i) => ({
        id: `3S-${String(i + 1).padStart(3, '0')}`,
        earTag: `3S-${String(i + 1).padStart(3, '0')}`,
        name: `Cattle ${i + 1}`,
        breed: 'Angus',
        weight: Math.floor(randomBetween(800, 1400)),
        temperature: Number(randomBetween(99, 103).toFixed(1)),
        healthStatus: 'healthy',
        vaccines: []
      }))

  return cattleData.map((cattle, index) => {
    const position = herdPositions[index]

    // Calculate distance from herd center
    const distance = calculateDistance(position.lat, position.lon, herdCenter.lat, herdCenter.lon)
    const isStray = distance > herdConfig.strayDistanceThreshold
    const now = Date.now()

    // Track when cow became a stray
    if (isStray && !strayTracking[cattle.id]) {
      strayTracking[cattle.id] = {
        detectedAt: now,
        initialLat: position.lat,
        initialLon: position.lon,
      }
    } else if (!isStray && strayTracking[cattle.id]) {
      delete strayTracking[cattle.id]
    }

    // Calculate stray duration
    const strayData = strayTracking[cattle.id]
    const strayDurationMs = strayData ? now - strayData.detectedAt : 0
    const strayDurationMinutes = Math.floor(strayDurationMs / 60000)

    // Add simulated altitude
    const baseAltitude = 850
    const altitudeVariation = ranchCenter
      ? (position.lat - ranchCenter.lat) * 2000 + randomBetween(-20, 20)
      : 0
    const altitude = Math.round(baseAltitude + altitudeVariation)

    return {
      id: cattle.id,
      earTag: cattle.earTag,
      name: cattle.name,
      breed: cattle.breed,
      weight: cattle.weight,
      temperature: cattle.temperature,
      healthStatus: cattle.healthStatus,
      vaccines: cattle.vaccines,
      lat: position.lat,
      lon: position.lon,
      altitude,
      isStray,
      strayDuration: strayDurationMinutes,
      distanceFromHerd: Number(distance.toFixed(4)),
      pasture: cattle.pasture,
    }
  })
}

/**
 * Push herd data to RanchOS backend
 */
const pushToRanchOS = async () => {
  try {
    const herdData = buildHerdData()

    const payload = {
      positions: herdData.map(cattle => ({
        lat: cattle.lat,
        lon: cattle.lon
      })),
      cattle: herdData,
      config: herdConfig,
      timestamp: new Date().toISOString()
    }

    const response = await fetch(`${RANCH_OS_URL}/api/herd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    console.log(`✓ Pushed ${herdData.length} cattle positions to RanchOS`)
    return true
  } catch (error) {
    console.error('Failed to push data to RanchOS:', error.message)
    return false
  }
}

/**
 * Main simulation update cycle
 */
const simulationCycle = async () => {
  updateHerdPositions()
  await pushToRanchOS()
}

/**
 * Start the simulation
 */
const startSimulation = () => {
  if (isRunning) return

  console.log('\nStarting cattle herd simulation...')
  isRunning = true

  // Initial push
  simulationCycle()

  // Set up periodic updates
  updateTimer = setInterval(simulationCycle, UPDATE_INTERVAL_MS)

  console.log(`Simulation running - updating every ${UPDATE_INTERVAL_MS / 1000}s`)
}

/**
 * Stop the simulation
 */
const stopSimulation = () => {
  if (!isRunning) return

  console.log('Stopping simulation...')
  isRunning = false

  if (updateTimer) {
    clearInterval(updateTimer)
    updateTimer = null
  }

  console.log('Simulation stopped')
}

// ============================================================================
// EXPRESS API (for monitoring and control)
// ============================================================================

const app = express()
app.use(express.json())

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    simulator: 'cattle',
    isRunning,
    cattleCount: herdPositions.length,
    strayCount: Object.keys(strayTracking).length,
    uptime: process.uptime(),
    ranchOsUrl: RANCH_OS_URL
  })
})

/**
 * Get current herd data
 */
app.get('/herd', (req, res) => {
  const herdData = buildHerdData()
  res.json({
    herd: herdData,
    config: herdConfig,
    stats: {
      totalCattle: herdPositions.length,
      activeStrays: Object.keys(strayTracking).length,
      hasPassture: fencePolygon !== null
    }
  })
})

/**
 * Get simulation stats
 */
app.get('/stats', (req, res) => {
  const herdData = buildHerdData()
  const strays = herdData.filter(c => c.isStray)
  const spreads = herdData.map(c => c.distanceFromHerd * 111000) // Convert to meters

  res.json({
    totalCattle: herdPositions.length,
    mainHerdCount: herdPositions.length - strays.length,
    designatedStrayCount: Math.floor(herdConfig.totalCattleCount * (herdConfig.strayPercentage / 100)),
    activeStrayAlerts: strays.length,
    averageSpread: Math.round(spreads.reduce((a, b) => a + b, 0) / spreads.length),
    maxSpread: Math.round(Math.max(...spreads)),
    isRunning,
    fenceBreachActive: false // TODO: implement breach detection
  })
})

/**
 * Update configuration
 */
app.post('/config', (req, res) => {
  const newConfig = req.body
  herdConfig = { ...herdConfig, ...newConfig }
  console.log('Configuration updated:', herdConfig)
  res.json({ success: true, config: herdConfig })
})

/**
 * Reset herd positions
 */
app.post('/reset', (req, res) => {
  initializeHerd()
  res.json({
    success: true,
    message: 'Herd reset successfully',
    cattleCount: herdPositions.length
  })
})

/**
 * Start simulation
 */
app.post('/start', (req, res) => {
  if (isRunning) {
    return res.json({ success: false, message: 'Simulation already running' })
  }
  startSimulation()
  res.json({ success: true, message: 'Simulation started' })
})

/**
 * Stop simulation
 */
app.post('/stop', (req, res) => {
  if (!isRunning) {
    return res.json({ success: false, message: 'Simulation not running' })
  }
  stopSimulation()
  res.json({ success: true, message: 'Simulation stopped' })
})

// ============================================================================
// STARTUP SEQUENCE
// ============================================================================

const startupSequence = async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🐄 RanchOS Cattle Herd Simulator')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Load cattle registry
  loadCattleRegistry()

  // Load pasture data from RanchOS
  console.log(`Connecting to RanchOS at ${RANCH_OS_URL}...`)
  const pastureLoaded = await loadPastureData()

  if (!pastureLoaded) {
    console.warn('⚠️  No pasture boundary loaded - using default location')
  }

  // Load herd configuration
  await loadHerdConfig()

  // Initialize herd
  initializeHerd()

  // Start API server
  app.listen(SIMULATOR_PORT, () => {
    console.log(`\n✓ Cattle simulator API: http://localhost:${SIMULATOR_PORT}`)
    console.log(`  Health: http://localhost:${SIMULATOR_PORT}/health`)
    console.log(`  Stats: http://localhost:${SIMULATOR_PORT}/stats`)
    console.log(`  Herd: http://localhost:${SIMULATOR_PORT}/herd`)
    console.log()
  })

  // Start simulation
  startSimulation()

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Cattle simulator ready! Press Ctrl+C to stop.')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down cattle simulator...')
  stopSimulation()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n\nShutting down cattle simulator...')
  stopSimulation()
  process.exit(0)
})

// Start the simulator
if (require.main === module) {
  startupSequence().catch(error => {
    console.error('Fatal error during startup:', error)
    process.exit(1)
  })
}

module.exports = {
  startSimulation,
  stopSimulation,
  updateHerdPositions,
  buildHerdData,
  herdConfig
}
