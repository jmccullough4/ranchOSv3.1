const express = require('express')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 8082

app.use(express.json())

// Helper functions for user and pasture management
const readUsers = () => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'users.json'), 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return { users: [] }
  }
}

const writeUsers = (data) => {
  fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(data, null, 2))
}

const readPastures = () => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'pastures.json'), 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return { pastures: [] }
  }
}

const writePastures = (data) => {
  fs.writeFileSync(path.join(__dirname, 'pastures.json'), JSON.stringify(data, null, 2))
}

const readSensors = () => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'sensors.json'), 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return { sensors: [] }
  }
}

const writeSensors = (data) => {
  fs.writeFileSync(path.join(__dirname, 'sensors.json'), JSON.stringify(data, null, 2))
}

const readConfig = () => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return { countyGisApiUrl: null }
  }
}

const writeConfig = (data) => {
  fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(data, null, 2))
}

const readCameras = () => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'cameras.json'), 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return { cameras: [] }
  }
}

const writeCameras = (data) => {
  fs.writeFileSync(path.join(__dirname, 'cameras.json'), JSON.stringify(data, null, 2))
}

// Error logging
const logError = (error) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...error
  }
  const logFile = path.join(__dirname, 'error-log.json')
  let logs = []
  try {
    if (fs.existsSync(logFile)) {
      const data = fs.readFileSync(logFile, 'utf-8')
      logs = JSON.parse(data)
    }
  } catch (err) {
    console.error('Failed to read error log:', err)
  }
  logs.unshift(logEntry) // Add to beginning
  // Keep only last 500 errors
  if (logs.length > 500) {
    logs = logs.slice(0, 500)
  }
  try {
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2))
  } catch (err) {
    console.error('Failed to write error log:', err)
  }
}

const DEFAULT_MAPBOX_TOKEN =
  'pk.eyJ1Ijoiam1jY3VsbG91Z2g0IiwiYSI6ImNtMGJvOXh3cDBjNncya3B4cDg0MXFuYnUifQ.uDJKnqE9WgkvGXYGLge-NQ'

// ============================================================================
// CAMERA SENSOR CONFIGURATION
// ============================================================================

/**
 * AI/ML Detection Categories and Confidence Thresholds
 */
const DETECTION_CATEGORIES = {
  PREDATOR: ['coyote', 'wolf', 'bear', 'mountain_lion', 'bobcat', 'fox'],
  THREAT: ['unauthorized_vehicle', 'unauthorized_person', 'unknown_animal'],
  LIVESTOCK: ['cattle', 'horse', 'deer', 'elk'],
  NORMAL: ['bird', 'rabbit', 'vegetation_movement', 'weather_event']
}

const ALERT_LEVELS = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

/**
 * Simulate AI/ML predator detection with realistic patterns
 * Detection probability varies by time of day (predators more active at dawn/dusk)
 */
const simulateAIDetection = (camera) => {
  const now = new Date()
  const hour = now.getHours()

  // Higher detection probability during dawn (5-7am) and dusk (6-9pm)
  const isDawnDusk = (hour >= 5 && hour <= 7) || (hour >= 18 && hour <= 21)
  const baseDetectionChance = isDawnDusk ? 0.18 : 0.08

  // Randomly determine if anything is detected
  const hasDetection = Math.random() < baseDetectionChance

  if (!hasDetection) {
    return {
      enabled: camera.aiDetection?.enabled !== false,
      lastScan: now.toISOString(),
      detections: [],
      alertLevel: ALERT_LEVELS.NONE,
      confidence: 0
    }
  }

  // Determine what was detected
  const detectionRoll = Math.random()
  let category
  let detectedObject
  let alertLevel
  let confidence

  if (detectionRoll < 0.15) {
    // Predator detected (15% of detections)
    category = 'PREDATOR'
    detectedObject = DETECTION_CATEGORIES.PREDATOR[Math.floor(Math.random() * DETECTION_CATEGORIES.PREDATOR.length)]
    alertLevel = detectedObject === 'bear' || detectedObject === 'mountain_lion'
      ? ALERT_LEVELS.CRITICAL
      : detectedObject === 'wolf' || detectedObject === 'coyote'
        ? ALERT_LEVELS.HIGH
        : ALERT_LEVELS.MEDIUM
    confidence = randomBetween(0.72, 0.95)
  } else if (detectionRoll < 0.25) {
    // Threat detected (10% of detections)
    category = 'THREAT'
    detectedObject = DETECTION_CATEGORIES.THREAT[Math.floor(Math.random() * DETECTION_CATEGORIES.THREAT.length)]
    alertLevel = detectedObject === 'unauthorized_vehicle'
      ? ALERT_LEVELS.HIGH
      : ALERT_LEVELS.MEDIUM
    confidence = randomBetween(0.65, 0.88)
  } else if (detectionRoll < 0.60) {
    // Livestock detected (35% of detections)
    category = 'LIVESTOCK'
    detectedObject = DETECTION_CATEGORIES.LIVESTOCK[Math.floor(Math.random() * DETECTION_CATEGORIES.LIVESTOCK.length)]
    alertLevel = ALERT_LEVELS.NONE
    confidence = randomBetween(0.85, 0.98)
  } else {
    // Normal activity (40% of detections)
    category = 'NORMAL'
    detectedObject = DETECTION_CATEGORIES.NORMAL[Math.floor(Math.random() * DETECTION_CATEGORIES.NORMAL.length)]
    alertLevel = ALERT_LEVELS.NONE
    confidence = randomBetween(0.60, 0.85)
  }

  const detection = {
    timestamp: now.toISOString(),
    category,
    object: detectedObject,
    confidence: Number(confidence.toFixed(3)),
    alertLevel,
    boundingBox: {
      x: Math.floor(randomBetween(50, 600)),
      y: Math.floor(randomBetween(50, 400)),
      width: Math.floor(randomBetween(80, 250)),
      height: Math.floor(randomBetween(60, 200))
    }
  }

  return {
    enabled: camera.aiDetection?.enabled !== false,
    lastScan: now.toISOString(),
    detections: [detection],
    alertLevel,
    confidence: detection.confidence
  }
}

/**
 * Convert YouTube URL to embed URL
 */
const convertToYouTubeEmbed = (url, options = {}) => {
  if (!url) return null

  // Extract video ID from various YouTube URL formats
  let videoId = null

  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/)
  if (watchMatch) {
    videoId = watchMatch[1]
  }

  // Format: https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) {
    videoId = shortMatch[1]
  }

  // Format: https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?]+)/)
  if (embedMatch) {
    videoId = embedMatch[1]
  }

  if (!videoId) {
    return url // Return original if we can't parse it
  }

  // Build embed URL with options
  const params = new URLSearchParams({
    autoplay: options.autoplay !== false ? '1' : '0',
    mute: options.mute !== false ? '1' : '0',
    controls: options.controls !== false ? '1' : '0',
    loop: options.loop !== false ? '1' : '0',
    playlist: videoId // Required for loop to work
  })

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}

// Legacy camera feeds (kept for backward compatibility)
const CAMERA_FEEDS = [
  {
    id: 'cam1',
    name: 'Times Square — New York, NY',
    embedUrl: 'https://www.youtube.com/embed/eJ7ZkQ5TC08?autoplay=1&mute=1&controls=0&loop=1&playlist=eJ7ZkQ5TC08'
  },
  {
    id: 'cam2',
    name: 'Santa Monica Pier — Los Angeles, CA',
    embedUrl: 'https://www.youtube.com/embed/sV-ojmLwMt0?autoplay=1&mute=1&controls=0&loop=1&playlist=sV-ojmLwMt0'
  },
  {
    id: 'cam3',
    name: 'Venice Beach — Los Angeles, CA',
    embedUrl: 'https://www.youtube.com/embed/7QLnIQz2dmw?autoplay=1&mute=1&controls=0&loop=1&playlist=7QLnIQz2dmw'
  },
  {
    id: 'cam4',
    name: 'Jackson Hole Town Square — Wyoming',
    embedUrl: 'https://www.youtube.com/embed/1EiC9bvVGnk?autoplay=1&mute=1&controls=0&loop=1&playlist=1EiC9bvVGnk'
  }
]
// ============================================================================
// CATTLE HERD SIMULATION CONFIGURATION
// ============================================================================
/**
 * Configurable cattle herd simulation parameters
 * These can be adjusted via the /api/simulator/herd/config endpoint
 */
let herdConfig = {
  totalCattleCount: 50,        // Total number of cattle in the herd
  strayPercentage: 10,          // Percentage of cattle that will be strays (0-100)
  clusterRadius: 0.01,          // How tightly the main herd clusters (degrees)
  strayRadius: 0.05,            // How far strays can wander from center (degrees)
  movementSpeed: 0.00018,       // Per-update movement step size (degrees)
  movementLimit: 0.0025,        // Maximum drift from anchor point (degrees)
  strayDistanceThreshold: 0.01, // Distance from herd center to be considered a stray
  boundaryAvoidanceStrength: 0.3, // How strongly cattle avoid pasture boundaries (0-1)
  herdCohesion: 0.1,            // How much cattle are attracted to herd center (0-1)
}

const USER_LIST = ['Jay', 'Kevin', 'April', 'Ashley']

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
 * Generate realistic cattle name
 */
const generateCattleName = (index) => {
  const names = [
    'Bessie', 'Buttercup', 'Daisy', 'Rosie', 'Bella', 'Molly', 'Lucy', 'Maggie',
    'Sadie', 'Penny', 'Ginger', 'Ruby', 'Pearl', 'Hazel', 'Willow', 'Clover',
    'Honey', 'Maple', 'Autumn', 'Cookie', 'Patches', 'Star', 'Luna', 'Nova',
    'Dusty', 'Rocky', 'Thunder', 'Ranger', 'Duke', 'Chief', 'Rusty', 'Boone',
    'Buck', 'Cash', 'Diesel', 'Max', 'Tank', 'Bear', 'Bandit', 'Scout',
  ]
  // Use index to deterministically pick names, or generate numbered ones
  if (index < names.length) {
    return names[index]
  }
  return `Cow ${index + 1}`
}
/**
 * Initialize the base cattle array with realistic properties
 * This will be regenerated when herd config changes
 */
let baseCattle = []
/**
 * Generate base cattle with realistic properties
 */
const generateBaseCattle = () => {
  return Array.from({ length: herdConfig.totalCattleCount }, (_, index) => ({
    id: `3S-${String(index + 1).padStart(3, '0')}`,
    name: generateCattleName(index),
    weight: Math.floor(randomBetween(800, 1400)), // More realistic weight range
    temperature: Number(randomBetween(99, 103).toFixed(1)), // Normal cattle temp range
    vaccines: [
      { name: 'Bovine Respiratory', date: '2023-11-14' },
      { name: 'Blackleg', date: '2024-03-03' },
    ],
  }))
}

baseCattle = generateBaseCattle()

// Gates and fence data will be loaded from pastures.json
// No default location - start with null to show globe view until ranch is set up
let gates = []
let fencePolygon = null
let fenceBounds = null
let ranchCenter = null
const DEFAULT_SENSOR_BLUEPRINT = [
  { name: 'Water Tank 1', type: 'water' },
  { name: 'Fence Section 1', type: 'fence' },
  { name: 'South Pasture Gate', type: 'gate' },
  { name: 'Network Node', type: 'network' },
  { name: 'Soil Probe', type: 'soil' }
]

// Load pasture boundary data
const loadPastureData = () => {
  const pasturesData = readPastures()
  if (pasturesData.pastures && pasturesData.pastures.length > 0) {
    // Use the first (or primary) pasture
    const primaryPasture = pasturesData.pastures[0]
    if (primaryPasture.boundary && primaryPasture.boundary.length > 0) {
      // Boundary should be array of [lon, lat] pairs
      fencePolygon = primaryPasture.boundary
      // Calculate fence bounds
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
      // Calculate center from fence polygon
      if (primaryPasture.center) {
        ranchCenter = primaryPasture.center
      } else {
        ranchCenter = {
          lat: (fenceBounds.minLat + fenceBounds.maxLat) / 2,
          lon: (fenceBounds.minLon + fenceBounds.maxLon) / 2,
        }
      }
      // Generate gates from boundary if not specified
      const generatedGates = primaryPasture.gates || generateGateLayout(fenceBounds) || DEFAULT_GATES
      gates = generatedGates.map((gate, index) => ({
        id: gate.id || `Gate ${index + 1}`,
        status: gate.status || 'closed',
        lat: gate.lat,
        lon: gate.lon
      }))
    }
  } else {
    fencePolygon = null
    fenceBounds = null
    ranchCenter = null
    gates = []
  }
}

// Load pasture data on startup
loadPastureData()

const BOUNDARY_SIZE_METERS = {
  small: 600,
  medium: 1400,
  large: 2500
}

const DEFAULT_LAYOUT = { rows: 2, columns: 2 }

const clampNumber = (value, min, max) => {
  if (Number.isNaN(Number(value))) return min
  return Math.min(Math.max(Number(value), min), max)
}

const ensureClosedPolygon = (coords = []) => {
  if (!coords.length) return coords
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) {
    return coords
  }
  return [...coords, first]
}

const calculateBoundsFromPolygon = (polygon) => {
  return polygon.reduce(
    (acc, [lon, lat]) => ({
      minLon: Math.min(acc.minLon, lon),
      maxLon: Math.max(acc.maxLon, lon),
      minLat: Math.min(acc.minLat, lat),
      maxLat: Math.max(acc.maxLat, lat)
    }),
    {
      minLon: Infinity,
      maxLon: -Infinity,
      minLat: Infinity,
      maxLat: -Infinity
    }
  )
}

const metersToLatDegrees = (meters) => meters / 111320
const metersToLonDegrees = (meters, lat) => {
  const denominator = 111320 * Math.cos((lat * Math.PI) / 180)
  if (Math.abs(denominator) < 0.0000001) {
    return 0
  }
  return meters / denominator
}

const buildBoundaryFromBbox = (bbox, paddingRatio = 0.02) => {
  if (!Array.isArray(bbox) || bbox.length !== 4) return null
  const [minLon, minLat, maxLon, maxLat] = bbox
  const lonPadding = (maxLon - minLon) * paddingRatio
  const latPadding = (maxLat - minLat) * paddingRatio

  const coords = [
    [minLon - lonPadding, minLat - latPadding],
    [maxLon + lonPadding, minLat - latPadding],
    [maxLon + lonPadding, maxLat + latPadding],
    [minLon - lonPadding, maxLat + latPadding]
  ]
  return ensureClosedPolygon(coords)
}

const buildBoundaryFromCenter = (center, sizeKey = 'medium') => {
  const meters = BOUNDARY_SIZE_METERS[sizeKey] || BOUNDARY_SIZE_METERS.medium
  const halfLat = metersToLatDegrees(meters / 2)
  const halfLon = metersToLonDegrees(meters / 2, center.lat)

  const coords = [
    [center.lon - halfLon, center.lat - halfLat],
    [center.lon + halfLon, center.lat - halfLat],
    [center.lon + halfLon, center.lat + halfLat],
    [center.lon - halfLon, center.lat + halfLat]
  ]
  return ensureClosedPolygon(coords)
}

const generateGateLayout = (bounds, gateCount = 4) => {
  if (!bounds || !isFinite(bounds.minLat)) return null
  const centerLon = (bounds.minLon + bounds.maxLon) / 2
  const centerLat = (bounds.minLat + bounds.maxLat) / 2
  const templates = [
    { id: 'North Gate', lat: bounds.maxLat, lon: centerLon },
    { id: 'South Gate', lat: bounds.minLat, lon: centerLon },
    { id: 'East Gate', lat: centerLat, lon: bounds.maxLon },
    { id: 'West Gate', lat: centerLat, lon: bounds.minLon },
    { id: 'Northeast Gate', lat: bounds.maxLat, lon: bounds.maxLon },
    { id: 'Northwest Gate', lat: bounds.maxLat, lon: bounds.minLon },
    { id: 'Southeast Gate', lat: bounds.minLat, lon: bounds.maxLon },
    { id: 'Southwest Gate', lat: bounds.minLat, lon: bounds.minLon }
  ]
  const count = clampNumber(gateCount, 1, templates.length)
  return templates.slice(0, count).map((template, index) => {
    const label = template.id || `Gate ${index + 1}`
    return {
      id: label,
      name: label,
      status: index === 1 ? 'open' : 'closed',
      lat: template.lat,
      lon: template.lon
    }
  })
}

const generateGridPastures = (bounds, rows, columns) => {
  const total = rows * columns
  if (total <= 1 || !isFinite(bounds.minLat)) return []
  const lonStep = (bounds.maxLon - bounds.minLon) / columns
  const latStep = (bounds.maxLat - bounds.minLat) / rows
  const now = Date.now()
  const createdAt = new Date().toISOString()
  const plots = []
  let index = 1

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const west = bounds.minLon + col * lonStep
      const east = col === columns - 1 ? bounds.maxLon : west + lonStep
      const south = bounds.minLat + row * latStep
      const north = row === rows - 1 ? bounds.maxLat : south + latStep

      const coords = ensureClosedPolygon([
        [west, south],
        [east, south],
        [east, north],
        [west, north]
      ])

      plots.push({
        id: `pasture-${now}-${index}`,
        name: `Plot ${index}`,
        boundary: coords,
        createdAt
      })
      index++
    }
  }

  return plots
}

const savePrimaryPasture = ({ name, boundary, center, gates: gatesData }) => {
  if (!boundary || !Array.isArray(boundary) || boundary.length < 3) {
    throw new Error('Boundary array required')
  }

  const pasturesData = readPastures()
  if (!Array.isArray(pasturesData.pastures)) {
    pasturesData.pastures = []
  }

  const timestamp = new Date().toISOString()

  if (pasturesData.pastures.length > 0) {
    pasturesData.pastures[0] = {
      ...pasturesData.pastures[0],
      name: name || pasturesData.pastures[0].name || 'Primary Pasture',
      boundary,
      center: center || null,
      gates: gatesData || null,
      isProperty: true,
      updatedAt: timestamp
    }
  } else {
    pasturesData.pastures.push({
      id: 'primary',
      name: name || 'Primary Pasture',
      boundary,
      center: center || null,
      gates: gatesData || null,
      createdAt: timestamp,
      isProperty: true
    })
  }

  writePastures(pasturesData)

  // Reload pasture data to update runtime state
  loadPastureData()

  return pasturesData.pastures[0]
}

const buildDefaultSensorReading = () => {
  const now = Date.now()
  const randomWater = randomBetween(65, 95)
  const randomFence = randomBetween(7, 9.5)
  const gateStatus = Math.random() > 0.85 ? 'open' : 'closed'
  const networkBars = Math.floor(randomBetween(3, 5.9))
  const soilMoisture = randomBetween(25, 45)

  return {
    SYSTEM: {
      status: 'green',
      value: 'nominal',
      detail: 'Simulation baseline running. Configure sensors or open the simulator to push live data.'
    },
    WATER_TANK_1: {
      status: randomWater > 70 ? 'green' : 'yellow',
      value: `${randomWater.toFixed(1)}% full`,
      detail: randomWater > 70
        ? 'Water Tank 1 level healthy.'
        : 'Water Tank 1 trending low, schedule refill.'
    },
    FENCE_SECTION_1: {
      status: randomFence >= 7.5 ? 'green' : 'yellow',
      value: `${randomFence.toFixed(2)} kV`,
      detail: 'Fence energizer reading pulled from cached simulation baseline.'
    },
    MAIN_GATE: {
      status: gateStatus === 'open' ? 'yellow' : 'green',
      value: gateStatus,
      detail: gateStatus === 'open' ? 'Gate unlatched for demo traffic.' : 'Gate secured.'
    },
    NETWORK_NODE: {
      status: networkBars >= 4 ? 'green' : 'yellow',
      value: `${networkBars} bars`,
      detail: `LTE backhaul signal at ${networkBars}/5 bars.`
    },
    SOIL_PROBE: {
      status: soilMoisture > 30 ? 'green' : 'yellow',
      value: `${soilMoisture.toFixed(1)}% moisture`,
      detail: 'Soil probe uses default simulation moisture until sensors push data.'
    },
    SYSTEM_TIMESTAMP: {
      status: 'info',
      value: new Date(now).toISOString(),
      detail: 'Timestamp injected to make it obvious defaults are being used.'
    }
  }
}

const geocodeAddress = async (address) => {
  const token = resolveMapboxToken()
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?limit=1&autocomplete=false&access_token=${token}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to geocode address')
  }
  const data = await response.json()
  if (!data.features || data.features.length === 0) {
    throw new Error('Address not found')
  }
  const feature = data.features[0]
  const [lon, lat] = feature.center
  return {
    feature,
    center: { lat, lon },
    placeName: feature.place_name || address
  }
}

const fetchParcelFromCountyGis = async (lat, lon) => {
  const { countyGisApiUrl } = readConfig()
  if (!countyGisApiUrl) return null

  try {
    const baseUrl = countyGisApiUrl.replace(/\/+$/, '')
    const params = new URLSearchParams({
      geometry: `${lon},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'true',
      f: 'json'
    })
    const queryUrl = `${baseUrl}/query?${params.toString()}`
    const response = await fetch(queryUrl)
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    const feature = data.features && data.features[0]
    if (feature?.geometry?.rings?.length) {
      return ensureClosedPolygon(feature.geometry.rings[0])
    }
    return null
  } catch (error) {
    console.warn('Failed to fetch county GIS parcel:', error.message)
    return null
  }
}

const fetchBoundaryFromOverpass = async (lat, lon) => {
  try {
    const query = `
      [out:json][timeout:25];
      (
        way["landuse"](around:80,${lat},${lon});
        way["leisure"="pasture"](around:80,${lat},${lon});
        relation["landuse"](around:80,${lat},${lon});
      );
      out geom;
    `
    const params = new URLSearchParams()
    params.set('data', query)
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: params
    })
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    if (!data.elements || data.elements.length === 0) {
      return null
    }
    let closest = null
    let minDistance = Infinity
    for (const element of data.elements) {
      if (!element.geometry || element.geometry.length === 0) continue
      const firstPoint = element.geometry[0]
      const distance = Math.sqrt((firstPoint.lat - lat) ** 2 + (firstPoint.lon - lon) ** 2)
      if (distance < minDistance) {
        minDistance = distance
        closest = element
      }
    }
    if (closest && closest.geometry) {
      const coords = closest.geometry.map(point => [point.lon, point.lat])
      return ensureClosedPolygon(coords)
    }
    return null
  } catch (error) {
    console.warn('Failed to fetch Overpass boundary:', error.message)
    return null
  }
}

const generatePastureLayoutFromAddress = async ({ address }, options = {}) => {
  const persist = options.persist !== false
  const { feature, center, placeName } = await geocodeAddress(address)

  // Try multiple sources for parcel boundary data
  let boundary = null
  let source = 'unknown'

  // 1. Try County GIS API (if configured by admin)
  boundary = await fetchParcelFromCountyGis(center.lat, center.lon)
  if (boundary) {
    source = 'County GIS'
  }

  // 2. Try OpenStreetMap Overpass API
  if (!boundary) {
    boundary = await fetchBoundaryFromOverpass(center.lat, center.lon)
    if (boundary) {
      source = 'OpenStreetMap'
    }
  }

  // 3. Try Mapbox bbox from geocoder result
  if (!boundary && feature.bbox) {
    boundary = buildBoundaryFromBbox(feature.bbox, 0.01)
    source = 'Mapbox Geocoder (approximate)'
  }

  // 4. Fallback: generate approximate boundary from center point
  if (!boundary) {
    boundary = buildBoundaryFromCenter(center, 'medium')
    source = 'Generated (please adjust manually)'
  }

  const normalizedBoundary = ensureClosedPolygon(boundary)
  const timestamp = new Date().toISOString()

  // Create property record WITHOUT auto-generated gates or pastures
  // Admin will use map editor to add these manually
  const propertyRecord = {
    id: 'primary',
    name: placeName,
    boundary: normalizedBoundary,
    center,
    isProperty: true,
    gates: [], // No auto-generated gates - admin adds manually
    createdAt: timestamp,
    updatedAt: timestamp,
    source
  }

  const payload = {
    pastures: [propertyRecord] // Only the main property boundary
  }

  if (persist) {
    writePastures(payload)
    loadPastureData()
  }

  return {
    property: propertyRecord,
    plots: [], // No auto-generated plots
    layout: { rows: 1, columns: 1 },
    source
  }
}

const ensureDefaultSensors = () => {
  // No longer create default sensors - start with empty array
  const sensorsData = readSensors()
  return sensorsData
}

const isPointInPolygon = (point, polygon) => {
  if (!polygon || polygon.length === 0) return true
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]
    const yi = polygon[i][1]
    const xj = polygon[j][0]
    const yj = polygon[j][1]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}
/**
 * Generate a random point within the fence boundary
 * @param {number} radius - Maximum distance from ranch center (in degrees)
 * @param {number} minDistance - Minimum distance from fence boundary (in degrees, for avoidance)
 * @returns {Object} - {lat, lon} coordinates
 */
const randomPointWithinFence = (radius, minDistance = 0.001) => {
  // If no ranch center or fence is defined, return origin
  if (!ranchCenter) {
    return { lat: 0, lon: 0 }
  }
  // If no fence polygon, just use circular area around center
  if (!fencePolygon || !fenceBounds) {
    const angle = randomBetween(0, Math.PI * 2)
    const distance = Math.random() * radius
    return {
      lat: ranchCenter.lat + Math.cos(angle) * distance,
      lon: ranchCenter.lon + Math.sin(angle) * distance,
    }
  }
  const attempts = 100
  for (let attempt = 0; attempt < attempts; attempt++) {
    let lat
    let lon
    // First half: try clustered around center
    if (attempt < attempts / 2) {
      const angle = randomBetween(0, Math.PI * 2)
      const distance = Math.random() * radius
      lat = ranchCenter.lat + Math.cos(angle) * distance
      lon = ranchCenter.lon + Math.sin(angle) * distance
    } else {
      // Second half: random within bounds
      lat = randomBetween(fenceBounds.minLat, fenceBounds.maxLat)
      lon = randomBetween(fenceBounds.minLon, fenceBounds.maxLon)
    }
    // Check if point is inside fence and not too close to boundary
    if (isPointInPolygon([lon, lat], fencePolygon)) {
      // If minDistance is specified, check distance to boundary
      if (minDistance > 0) {
        const distanceToBoundary = calculateMinDistanceToPolygon(lat, lon, fencePolygon)
        if (distanceToBoundary >= minDistance) {
          return { lat, lon }
        }
      } else {
        return { lat, lon }
      }
    }
  }
  // Fallback to center
  return { lat: ranchCenter.lat, lon: ranchCenter.lon }
}
/**
 * Calculate minimum distance from a point to a polygon boundary
 * @param {number} lat - Latitude of point
 * @param {number} lon - Longitude of point
 * @param {Array} polygon - Array of [lon, lat] coordinates
 * @returns {number} - Minimum distance to boundary
 */
const calculateMinDistanceToPolygon = (lat, lon, polygon) => {
  let minDist = Infinity
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i]
    const [x2, y2] = polygon[(i + 1) % polygon.length]
    // Distance to line segment
    const dist = distanceToLineSegment(lon, lat, x1, y1, x2, y2)
    minDist = Math.min(minDist, dist)
  }
  return minDist
}
/**
 * Calculate distance from a point to a line segment
 */
const distanceToLineSegment = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return calculateDistance(py, px, y1, x1)
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared
  t = Math.max(0, Math.min(1, t))
  const projX = x1 + t * dx
  const projY = y1 + t * dy
  return calculateDistance(py, px, projY, projX)
}

const constrainToFence = (lat, lon) => {
  // If no fence, don't constrain
  if (!fencePolygon || !ranchCenter) {
    return { lat, lon, breached: false }
  }
  if (isPointInPolygon([lon, lat], fencePolygon)) {
    return { lat, lon, breached: false }
  }
  let adjustedLat = lat
  let adjustedLon = lon
  for (let i = 0; i < 12; i++) {
    adjustedLat = (adjustedLat + ranchCenter.lat) / 2
    adjustedLon = (adjustedLon + ranchCenter.lon) / 2
    if (isPointInPolygon([adjustedLon, adjustedLat], fencePolygon)) {
      return { lat: adjustedLat, lon: adjustedLon, breached: true }
    }
  }
  return { lat: ranchCenter.lat, lon: ranchCenter.lon, breached: true }
}
/**
 * Initialize herd anchor points and positions
 * Anchors determine which cattle are part of main herd vs strays
 */
let herdAnchors = []
let herdPositions = []
let fenceBreachActiveUntil = 0

// AI Stray Cattle Tracking
const strayTracking = {}
/**
 * Initialize or reset the herd positions based on current config
 */
const initializeHerd = () => {
  const strayCount = Math.floor(herdConfig.totalCattleCount * (herdConfig.strayPercentage / 100))
  herdAnchors = baseCattle.map((cow, index) => {
    const isStray = index >= herdConfig.totalCattleCount - strayCount
    const radius = isStray ? herdConfig.strayRadius : herdConfig.clusterRadius
    return randomPointWithinFence(radius, 0.002) // Keep cattle away from boundary initially
  })
  herdPositions = herdAnchors.map((anchor) => ({ ...anchor }))
  // Clear stray tracking when resetting herd
  Object.keys(strayTracking).forEach(key => delete strayTracking[key])
  console.log(`Herd initialized: ${herdConfig.totalCattleCount} cattle (${strayCount} strays)`)
}

// Initialize herd on startup
initializeHerd()

const randomVoltage = () => Number(randomBetween(6.5, 9.5).toFixed(2))
const randomTroughLevel = () => Number(randomBetween(65, 100).toFixed(1))
const randomNetworkStrength = () => Math.floor(randomBetween(3, 6))

const resolveMapboxToken = () => {
  if (process.env.MAPBOX_TOKEN) {
    return process.env.MAPBOX_TOKEN
  }
  try {
    const secretPath = '/run/secrets/mapbox_token'
    if (fs.existsSync(secretPath)) {
      return fs.readFileSync(secretPath, 'utf-8').trim()
    }
  } catch (error) {
    // ignore secret resolution errors
  }
  return DEFAULT_MAPBOX_TOKEN
}

const distDir = path.join(__dirname, '..', 'frontend', 'dist')
const staticDir = path.join(distDir, 'static')
const mediaDir = path.join(distDir, 'media')
const simulatorDir = path.join(__dirname, '..', 'simulator')

const ensureStaticMounts = () => {
  if (fs.existsSync(staticDir)) {
    app.use('/static', express.static(staticDir, { fallthrough: true }))
  }
  if (fs.existsSync(mediaDir)) {
    app.use('/media', express.static(mediaDir, { fallthrough: true }))
  }
  if (fs.existsSync(simulatorDir)) {
    app.use('/simulator', express.static(simulatorDir, { fallthrough: true }))
  }
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { index: false }))
  }
}

ensureStaticMounts()

app.post('/api/login', (req, res) => {
  const username = String(req.body?.username ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  const usersData = readUsers()
  const user = usersData.users.find(u => u.username.toLowerCase() === username && u.password === password)
  if (user) {
    return res.json({
      status: 'ok',
      user: user.username,
      role: user.role
    })
  }
  return res.status(401).json({ detail: 'Invalid credentials' })
})

// Admin endpoints - General config
app.get('/api/admin/config', (req, res) => {
  const config = readConfig()
  res.json(config)
})

app.post('/api/admin/config', (req, res) => {
  const { countyGisApiUrl } = req.body
  const config = readConfig()
  if (countyGisApiUrl !== undefined) {
    config.countyGisApiUrl = countyGisApiUrl
  }
  writeConfig(config)
  res.json({ status: 'ok', config })
})

// Admin endpoints - User management
app.get('/api/admin/users', (req, res) => {
  const usersData = readUsers()
  // Don't send passwords to frontend
  const safeUsers = usersData.users
    .filter(u => u.role !== 'admin')
    .map(({ password, ...user }) => user)
  res.json({ users: safeUsers })
})

app.post('/api/admin/users', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  const usersData = readUsers()

  // Check if username already exists
  if (usersData.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'Username already exists' })
  }

  const newUser = {
    username: username.trim(),
    password: password,
    role: 'user',
    createdAt: new Date().toISOString()
  }

  usersData.users.push(newUser)
  writeUsers(usersData)

  res.json({ status: 'ok', user: { username: newUser.username, role: newUser.role, createdAt: newUser.createdAt } })
})

app.delete('/api/admin/users/:username', (req, res) => {
  const { username } = req.params
  const usersData = readUsers()

  const userIndex = usersData.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase())

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (usersData.users[userIndex].role === 'admin') {
    return res.status(403).json({ error: 'Cannot delete admin user' })
  }

  usersData.users.splice(userIndex, 1)
  writeUsers(usersData)

  res.json({ status: 'ok' })
})

// Sensor management endpoints
app.get('/api/admin/sensors', (_req, res) => {
  const sensorsData = readSensors()
  res.json({ sensors: sensorsData.sensors })
})

app.post('/api/admin/sensors', (req, res) => {
  const { name, type } = req.body

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type required' })
  }

  const sensorsData = readSensors()

  const newSensor = {
    id: `sensor-${Date.now()}`,
    name: name.trim(),
    type: type,
    createdAt: new Date().toISOString(),
    lastValue: null,
    status: 'active'
  }

  sensorsData.sensors.push(newSensor)
  writeSensors(sensorsData)

  res.json({ status: 'ok', sensor: newSensor })
})

app.delete('/api/admin/sensors/:id', (req, res) => {
  const { id } = req.params
  const sensorsData = readSensors()

  const sensorIndex = sensorsData.sensors.findIndex(s => s.id === id)

  if (sensorIndex === -1) {
    return res.status(404).json({ error: 'Sensor not found' })
  }

  sensorsData.sensors.splice(sensorIndex, 1)
  writeSensors(sensorsData)

  res.json({ status: 'ok' })
})

app.put('/api/admin/sensors/:id', (req, res) => {
  const { id } = req.params
  const { name, type } = req.body

  if (!name && !type) {
    return res.status(400).json({ error: 'Provide name or type to update' })
  }

  const sensorsData = readSensors()
  const sensor = sensorsData.sensors.find(s => s.id === id)

  if (!sensor) {
    return res.status(404).json({ error: 'Sensor not found' })
  }

  if (name) {
    sensor.name = name.trim()
  }
  if (type) {
    sensor.type = type
  }
  sensor.updatedAt = new Date().toISOString()

  writeSensors(sensorsData)

  res.json({ status: 'ok', sensor })
})

// Update sensor location
app.put('/api/admin/sensors/:id/location', (req, res) => {
  const { id } = req.params
  const { lat, lon } = req.body

  if (lat === undefined || lon === undefined) {
    return res.status(400).json({ error: 'Latitude and longitude required' })
  }

  const sensorsData = readSensors()
  const sensor = sensorsData.sensors.find(s => s.id === id)

  if (!sensor) {
    return res.status(404).json({ error: 'Sensor not found' })
  }

  sensor.lat = lat
  sensor.lon = lon
  sensor.updatedAt = new Date().toISOString()

  writeSensors(sensorsData)

  res.json({ status: 'ok', sensor })
})

// ============================================================================
// CATTLE MANAGEMENT ENDPOINTS
// ============================================================================

const readCattle = () => {
  try {
    const filePath = path.join(__dirname, 'cattle.json')
    if (!fs.existsSync(filePath)) {
      return []
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to read cattle.json:', error)
    return []
  }
}

const writeCattle = (cattle) => {
  try {
    const filePath = path.join(__dirname, 'cattle.json')
    fs.writeFileSync(filePath, JSON.stringify(cattle, null, 2))
  } catch (error) {
    console.error('Failed to write cattle.json:', error)
  }
}

/**
 * Get all cattle
 */
app.get('/api/admin/cattle', (_req, res) => {
  const cattle = readCattle()
  res.json({ cattle })
})

/**
 * Get specific cattle by ear tag ID
 */
app.get('/api/admin/cattle/:earTag', (req, res) => {
  const { earTag } = req.params
  const cattle = readCattle()
  const animal = cattle.find(c => c.earTag === earTag)

  if (!animal) {
    return res.status(404).json({ error: 'Cattle not found' })
  }

  res.json({ cattle: animal })
})

/**
 * Add new cattle
 */
app.post('/api/admin/cattle', (req, res) => {
  const { earTag, name, breed, weight, pasture, purchaseDate } = req.body

  if (!earTag) {
    return res.status(400).json({ error: 'Ear tag ID is required' })
  }

  const cattle = readCattle()

  // Check for duplicate ear tag
  if (cattle.find(c => c.earTag === earTag)) {
    return res.status(400).json({ error: 'Ear tag ID already exists' })
  }

  const newAnimal = {
    id: `cattle-${Date.now()}`,
    earTag: earTag.trim(),
    name: name || earTag.trim(),
    breed: breed || 'Unknown',
    weight: weight || null,
    temperature: null,
    lat: null,
    lon: null,
    altitude: null,
    pasture: pasture || null,
    purchaseDate: purchaseDate || new Date().toISOString(),
    vaccines: [],
    healthStatus: 'healthy',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  cattle.push(newAnimal)
  writeCattle(cattle)

  res.json({ status: 'ok', cattle: newAnimal })
})

/**
 * Update cattle
 */
app.put('/api/admin/cattle/:earTag', (req, res) => {
  const { earTag } = req.params
  const updates = req.body

  const cattle = readCattle()
  const index = cattle.findIndex(c => c.earTag === earTag)

  if (index === -1) {
    return res.status(404).json({ error: 'Cattle not found' })
  }

  cattle[index] = {
    ...cattle[index],
    ...updates,
    id: cattle[index].id, // Preserve ID
    earTag: cattle[index].earTag, // Preserve ear tag
    createdAt: cattle[index].createdAt, // Preserve creation date
    updatedAt: new Date().toISOString()
  }

  writeCattle(cattle)

  res.json({ status: 'ok', cattle: cattle[index] })
})

/**
 * Delete cattle
 */
app.delete('/api/admin/cattle/:earTag', (req, res) => {
  const { earTag } = req.params

  const cattle = readCattle()
  const index = cattle.findIndex(c => c.earTag === earTag)

  if (index === -1) {
    return res.status(404).json({ error: 'Cattle not found' })
  }

  cattle.splice(index, 1)
  writeCattle(cattle)

  res.json({ status: 'ok' })
})

/**
 * Bulk import cattle from CSV/JSON
 */
app.post('/api/admin/cattle/bulk', (req, res) => {
  const { cattle: importedCattle } = req.body

  if (!Array.isArray(importedCattle)) {
    return res.status(400).json({ error: 'Expected array of cattle' })
  }

  const existingCattle = readCattle()
  const added = []
  const skipped = []

  importedCattle.forEach(animal => {
    if (!animal.earTag) {
      skipped.push({ reason: 'Missing ear tag', data: animal })
      return
    }

    // Skip duplicates
    if (existingCattle.find(c => c.earTag === animal.earTag)) {
      skipped.push({ reason: 'Duplicate ear tag', earTag: animal.earTag })
      return
    }

    const newAnimal = {
      id: `cattle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      earTag: animal.earTag.trim(),
      name: animal.name || animal.earTag.trim(),
      breed: animal.breed || 'Unknown',
      weight: animal.weight || null,
      temperature: null,
      lat: null,
      lon: null,
      altitude: null,
      pasture: animal.pasture || null,
      purchaseDate: animal.purchaseDate || new Date().toISOString(),
      vaccines: animal.vaccines || [],
      healthStatus: animal.healthStatus || 'healthy',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    existingCattle.push(newAnimal)
    added.push(newAnimal)
  })

  writeCattle(existingCattle)

  res.json({
    status: 'ok',
    added: added.length,
    skipped: skipped.length,
    details: { added, skipped }
  })
})

// ============================================================================
// CAMERA SENSOR MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get all camera sensors
 */
app.get('/api/admin/cameras', (_req, res) => {
  const camerasData = readCameras()
  res.json({ cameras: camerasData.cameras })
})

/**
 * Add new camera sensor
 */
app.post('/api/admin/cameras', (req, res) => {
  const { name, lat, lon, youtubeUrl } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Camera name required' })
  }

  const camerasData = readCameras()

  // Generate camera ID
  const cameraCount = camerasData.cameras.length
  const newId = `cam${cameraCount + 1}`

  const embedUrl = youtubeUrl ? convertToYouTubeEmbed(youtubeUrl) : null

  const newCamera = {
    id: newId,
    name: name.trim(),
    lat: lat || null,
    lon: lon || null,
    status: 'online',
    youtubeUrl: youtubeUrl || null,
    embedUrl: embedUrl,
    type: 'camera',
    createdAt: new Date().toISOString(),
    aiDetection: {
      enabled: true,
      lastScan: null,
      detections: []
    }
  }

  camerasData.cameras.push(newCamera)
  writeCameras(camerasData)

  res.json({ status: 'ok', camera: newCamera })
})

/**
 * Update camera sensor
 */
app.put('/api/admin/cameras/:id', (req, res) => {
  const { id } = req.params
  const { name, lat, lon, youtubeUrl, status, aiDetectionEnabled } = req.body

  const camerasData = readCameras()
  const camera = camerasData.cameras.find(c => c.id === id)

  if (!camera) {
    return res.status(404).json({ error: 'Camera not found' })
  }

  // Update fields
  if (name !== undefined) {
    camera.name = name.trim()
  }
  if (lat !== undefined) {
    camera.lat = lat
  }
  if (lon !== undefined) {
    camera.lon = lon
  }
  if (youtubeUrl !== undefined) {
    camera.youtubeUrl = youtubeUrl
    camera.embedUrl = youtubeUrl ? convertToYouTubeEmbed(youtubeUrl) : null
  }
  if (status !== undefined) {
    camera.status = status
  }
  if (aiDetectionEnabled !== undefined) {
    camera.aiDetection = camera.aiDetection || {}
    camera.aiDetection.enabled = aiDetectionEnabled
  }

  camera.updatedAt = new Date().toISOString()

  writeCameras(camerasData)

  res.json({ status: 'ok', camera })
})

/**
 * Delete camera sensor
 */
app.delete('/api/admin/cameras/:id', (req, res) => {
  const { id } = req.params
  const camerasData = readCameras()

  const cameraIndex = camerasData.cameras.findIndex(c => c.id === id)

  if (cameraIndex === -1) {
    return res.status(404).json({ error: 'Camera not found' })
  }

  camerasData.cameras.splice(cameraIndex, 1)
  writeCameras(camerasData)

  res.json({ status: 'ok' })
})

/**
 * Update camera location
 */
app.put('/api/admin/cameras/:id/location', (req, res) => {
  const { id } = req.params
  const { lat, lon } = req.body

  if (lat === undefined || lon === undefined) {
    return res.status(400).json({ error: 'Latitude and longitude required' })
  }

  const camerasData = readCameras()
  const camera = camerasData.cameras.find(c => c.id === id)

  if (!camera) {
    return res.status(404).json({ error: 'Camera not found' })
  }

  camera.lat = lat
  camera.lon = lon
  camera.updatedAt = new Date().toISOString()

  writeCameras(camerasData)

  res.json({ status: 'ok', camera })
})

/**
 * Manually trigger AI detection for a camera (for testing)
 */
app.post('/api/admin/cameras/:id/detect', (req, res) => {
  const { id } = req.params
  const camerasData = readCameras()
  const camera = camerasData.cameras.find(c => c.id === id)

  if (!camera) {
    return res.status(404).json({ error: 'Camera not found' })
  }

  // Run AI detection simulation
  const aiResult = simulateAIDetection(camera)

  // Update camera with detection results
  camera.aiDetection = aiResult
  camera.updatedAt = new Date().toISOString()

  writeCameras(camerasData)

  res.json({ status: 'ok', camera, detection: aiResult })
})

// ============================================================================
// CAMERA SIMULATOR - PRE-CONFIGURED CAMERA LIBRARY
// ============================================================================

/**
 * Camera Simulator Presets
 * These represent "available" IP cameras that can be imported into the ranch system
 * In production, this could represent actual discovered cameras on the network
 */
const CAMERA_SIMULATOR_PRESETS = [
  {
    id: 'sim-cam-north-gate',
    name: 'North Gate Entrance',
    description: 'Main entrance monitoring - vehicle and personnel detection',
    type: 'fixed',
    suggestedLocation: 'north',
    capabilities: ['motion_detection', 'vehicle_detection', 'person_detection', 'license_plate'],
    resolution: '4K',
    nightVision: true,
    weatherproof: true,
    ptzCapable: false,
    feedType: 'rtsp',
    youtubeUrl: null, // To be provided by simulator agent
    detectionProfile: 'gate' // Custom detection behavior
  },
  {
    id: 'sim-cam-south-pasture',
    name: 'South Pasture Perimeter',
    description: 'Wide-angle pasture monitoring - predator detection focus',
    type: 'fixed',
    suggestedLocation: 'south',
    capabilities: ['motion_detection', 'predator_detection', 'livestock_counting'],
    resolution: '1080p',
    nightVision: true,
    weatherproof: true,
    ptzCapable: false,
    feedType: 'rtsp',
    youtubeUrl: null, // To be provided by simulator agent
    detectionProfile: 'perimeter'
  },
  {
    id: 'sim-cam-east-water',
    name: 'East Water Trough Monitor',
    description: 'Water station monitoring - livestock behavior analysis',
    type: 'fixed',
    suggestedLocation: 'east',
    capabilities: ['motion_detection', 'livestock_counting', 'behavior_analysis'],
    resolution: '1080p',
    nightVision: true,
    weatherproof: true,
    ptzCapable: false,
    feedType: 'rtsp',
    youtubeUrl: null, // To be provided by simulator agent
    detectionProfile: 'feeding'
  },
  {
    id: 'sim-cam-west-chute',
    name: 'West Chute Station',
    description: 'Chute area monitoring - operational safety and logging',
    type: 'fixed',
    suggestedLocation: 'west',
    capabilities: ['motion_detection', 'person_detection', 'livestock_counting'],
    resolution: '1080p',
    nightVision: false,
    weatherproof: false,
    ptzCapable: false,
    feedType: 'rtsp',
    youtubeUrl: null, // To be provided by simulator agent
    detectionProfile: 'operational'
  },
  {
    id: 'sim-cam-central-ptz',
    name: 'Central Ranch Overview (PTZ)',
    description: 'Pan-tilt-zoom camera for broad ranch monitoring',
    type: 'ptz',
    suggestedLocation: 'center',
    capabilities: ['motion_detection', 'tracking', 'panoramic', 'predator_detection', 'vehicle_detection'],
    resolution: '4K',
    nightVision: true,
    weatherproof: true,
    ptzCapable: true,
    feedType: 'rtsp',
    youtubeUrl: null, // To be provided by simulator agent
    detectionProfile: 'overview'
  },
  {
    id: 'sim-cam-barn-interior',
    name: 'Barn Interior Monitor',
    description: 'Interior barn monitoring - livestock health and security',
    type: 'fixed',
    suggestedLocation: 'barn',
    capabilities: ['motion_detection', 'livestock_counting', 'temperature_overlay'],
    resolution: '1080p',
    nightVision: true,
    weatherproof: false,
    ptzCapable: false,
    feedType: 'rtsp',
    youtubeUrl: null, // To be provided by simulator agent
    detectionProfile: 'interior'
  }
]

/**
 * Detection profile configurations - define behavior patterns for different camera types
 */
const DETECTION_PROFILES = {
  gate: {
    vehicleDetectionBoost: 2.0, // 2x more likely to detect vehicles
    predatorDetectionBoost: 0.5, // 50% less likely (not a predator hotspot)
    peakHours: [6, 7, 8, 16, 17, 18], // Morning/evening when people arrive/leave
  },
  perimeter: {
    vehicleDetectionBoost: 0.3,
    predatorDetectionBoost: 2.5, // 2.5x more predator detections
    peakHours: [5, 6, 7, 19, 20, 21, 22], // Dawn/dusk predator activity
  },
  feeding: {
    vehicleDetectionBoost: 0.2,
    predatorDetectionBoost: 0.8,
    livestockDetectionBoost: 3.0, // 3x livestock detection rate
    peakHours: [6, 7, 8, 16, 17], // Feeding times
  },
  operational: {
    vehicleDetectionBoost: 1.2,
    predatorDetectionBoost: 0.1, // Very low predator risk in operational areas
    personDetectionBoost: 2.0, // More person detections
    peakHours: [8, 9, 10, 11, 12, 13, 14, 15, 16], // Work hours
  },
  overview: {
    vehicleDetectionBoost: 1.0,
    predatorDetectionBoost: 1.0,
    livestockDetectionBoost: 1.0,
    peakHours: [5, 6, 7, 8, 18, 19, 20, 21], // General activity
  },
  interior: {
    vehicleDetectionBoost: 0.0, // No vehicles inside
    predatorDetectionBoost: 0.3, // Low but possible (rodents, etc)
    livestockDetectionBoost: 2.0,
    peakHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], // Always active
  }
}

/**
 * Calculate suggested camera position based on location hint and ranch boundaries
 */
const calculateCameraPosition = (suggestedLocation, ranchCenter, fencePolygon) => {
  if (!ranchCenter || !fencePolygon) {
    return { lat: null, lon: null }
  }

  // Calculate fence bounds
  const lats = fencePolygon.map(coord => coord[1])
  const lons = fencePolygon.map(coord => coord[0])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)

  const centerLat = ranchCenter.lat
  const centerLon = ranchCenter.lon
  const latRange = maxLat - minLat
  const lonRange = maxLon - minLon

  // Position cameras based on location hint
  const positions = {
    north: { lat: centerLat + latRange * 0.35, lon: centerLon },
    south: { lat: centerLat - latRange * 0.35, lon: centerLon },
    east: { lat: centerLat, lon: centerLon + lonRange * 0.35 },
    west: { lat: centerLat, lon: centerLon - lonRange * 0.35 },
    center: { lat: centerLat, lon: centerLon },
    barn: { lat: centerLat + latRange * 0.1, lon: centerLon + lonRange * 0.1 },
  }

  return positions[suggestedLocation] || { lat: centerLat, lon: centerLon }
}

/**
 * Enhanced AI detection with location-based profiles
 */
const simulateAIDetectionWithProfile = (camera, detectionProfile) => {
  const now = new Date()
  const hour = now.getHours()

  // Get profile configuration
  const profile = DETECTION_PROFILES[detectionProfile] || DETECTION_PROFILES.overview
  const isPeakHour = profile.peakHours.includes(hour)

  // Higher detection probability during dawn (5-7am) and dusk (6-9pm)
  const isDawnDusk = (hour >= 5 && hour <= 7) || (hour >= 18 && hour <= 21)
  let baseDetectionChance = isDawnDusk ? 0.18 : 0.08

  // Boost detection during peak hours for this camera type
  if (isPeakHour) {
    baseDetectionChance *= 1.5
  }

  // Randomly determine if anything is detected
  const hasDetection = Math.random() < baseDetectionChance

  if (!hasDetection || camera.aiDetection?.enabled === false) {
    return {
      enabled: camera.aiDetection?.enabled !== false,
      lastScan: now.toISOString(),
      detections: [],
      alertLevel: ALERT_LEVELS.NONE,
      confidence: 0
    }
  }

  // Determine what was detected (weighted by profile)
  const detectionRoll = Math.random()
  let category
  let detectedObject
  let alertLevel
  let confidence

  // Apply profile-based detection weights
  const predatorThreshold = 0.15 * (profile.predatorDetectionBoost || 1.0)
  const threatThreshold = predatorThreshold + (0.10 * (profile.vehicleDetectionBoost || 1.0))
  const livestockThreshold = threatThreshold + (0.35 * (profile.livestockDetectionBoost || 1.0))

  if (detectionRoll < predatorThreshold) {
    // Predator detected
    category = 'PREDATOR'
    detectedObject = DETECTION_CATEGORIES.PREDATOR[Math.floor(Math.random() * DETECTION_CATEGORIES.PREDATOR.length)]
    alertLevel = detectedObject === 'bear' || detectedObject === 'mountain_lion'
      ? ALERT_LEVELS.CRITICAL
      : detectedObject === 'wolf' || detectedObject === 'coyote'
        ? ALERT_LEVELS.HIGH
        : ALERT_LEVELS.MEDIUM
    confidence = randomBetween(0.72, 0.95)
  } else if (detectionRoll < threatThreshold) {
    // Threat/Vehicle detected
    category = 'THREAT'
    detectedObject = DETECTION_CATEGORIES.THREAT[Math.floor(Math.random() * DETECTION_CATEGORIES.THREAT.length)]
    alertLevel = detectedObject === 'unauthorized_vehicle'
      ? ALERT_LEVELS.HIGH
      : ALERT_LEVELS.MEDIUM
    confidence = randomBetween(0.65, 0.88)
  } else if (detectionRoll < livestockThreshold) {
    // Livestock detected
    category = 'LIVESTOCK'
    detectedObject = DETECTION_CATEGORIES.LIVESTOCK[Math.floor(Math.random() * DETECTION_CATEGORIES.LIVESTOCK.length)]
    alertLevel = ALERT_LEVELS.NONE
    confidence = randomBetween(0.85, 0.98)
  } else {
    // Normal activity
    category = 'NORMAL'
    detectedObject = DETECTION_CATEGORIES.NORMAL[Math.floor(Math.random() * DETECTION_CATEGORIES.NORMAL.length)]
    alertLevel = ALERT_LEVELS.NONE
    confidence = randomBetween(0.60, 0.85)
  }

  const detection = {
    timestamp: now.toISOString(),
    category,
    object: detectedObject,
    confidence: Number(confidence.toFixed(3)),
    alertLevel,
    boundingBox: {
      x: randomBetween(0.1, 0.6),
      y: randomBetween(0.1, 0.6),
      width: randomBetween(0.15, 0.4),
      height: randomBetween(0.15, 0.4)
    }
  }

  return {
    enabled: camera.aiDetection?.enabled !== false,
    lastScan: now.toISOString(),
    detections: [detection],
    alertLevel: detection.alertLevel,
    confidence: detection.confidence
  }
}

/**
 * Simulate camera online/offline status with realistic patterns
 * - Most cameras stay online (95%+ uptime)
 * - Brief outages possible due to network/weather
 * - PTZ cameras slightly less reliable (more moving parts)
 */
const simulateCameraStatus = (camera, baseOnlineChance = 0.97) => {
  // PTZ cameras have slightly lower reliability
  const onlineChance = camera.ptzCapable ? baseOnlineChance - 0.02 : baseOnlineChance

  // Weather-related outages (would be enhanced with actual weather data)
  const hour = new Date().getHours()
  const isNighttime = hour < 6 || hour > 20

  // Slightly higher failure rate at night for non-nightvision cameras
  const weatherAdjustment = (!camera.nightVision && isNighttime) ? 0.03 : 0

  return Math.random() < (onlineChance - weatherAdjustment) ? 'online' : 'offline'
}

// ============================================================================
// CAMERA SIMULATOR API ENDPOINTS
// ============================================================================

/**
 * Get camera simulator status and statistics
 * IMPORTANT: This must come BEFORE the /:id route to avoid route collision
 */
app.get('/api/simulator/cameras/status', (_req, res) => {
  const camerasData = readCameras()

  // Count imported cameras
  const importedCount = camerasData.cameras.filter(c => c.simulatorId).length

  // Get online/offline stats
  const onlineCount = camerasData.cameras.filter(c => c.status === 'online').length

  // Detection stats
  const camerasWithAI = camerasData.cameras.filter(c => c.aiDetection?.enabled).length

  res.json({
    simulator: {
      totalPresets: CAMERA_SIMULATOR_PRESETS.length,
      presetsAvailable: CAMERA_SIMULATOR_PRESETS.length - importedCount,
      presetsImported: importedCount
    },
    ranch: {
      totalCameras: camerasData.cameras.length,
      onlineCameras: onlineCount,
      offlineCameras: camerasData.cameras.length - onlineCount,
      aiEnabledCameras: camerasWithAI
    },
    ranchConfigured: !!(ranchCenter && fencePolygon)
  })
})

/**
 * Get user-added cameras from simulator
 */
app.get('/api/simulator/cameras', (_req, res) => {
  const camerasData = readCameras()

  // Filter for user-added cameras (those with youtubeUrl and port)
  const simulatorCameras = camerasData.cameras.filter(c => c.youtubeUrl && c.port)

  res.json({
    cameras: simulatorCameras,
    totalCameras: simulatorCameras.length
  })
})

/**
 * Add a new camera to the simulator
 */
app.post('/api/simulator/cameras', (req, res) => {
  const { name, youtubeUrl, port } = req.body

  if (!name || !youtubeUrl || !port) {
    return res.status(400).json({ detail: 'Name, youtubeUrl, and port are required' })
  }

  const camerasData = readCameras()

  // Check if port is already in use
  const portExists = camerasData.cameras.some(c => c.port === port)
  if (portExists) {
    return res.status(400).json({ detail: `Port ${port} is already in use` })
  }

  // Generate camera ID
  const cameraId = `sim-cam-${Date.now()}`

  // Create new camera
  const newCamera = {
    id: cameraId,
    name,
    youtubeUrl,
    port,
    ipAddress: 'localhost',
    embedUrl: `http://localhost:${port}/embed`,
    feedType: 'youtube',
    status: 'online',
    addedAt: new Date().toISOString()
  }

  camerasData.cameras.push(newCamera)
  writeCameras(camerasData)

  res.json({
    status: 'ok',
    camera: newCamera
  })
})

/**
 * Remove a camera from the simulator
 */
app.delete('/api/simulator/cameras/:id', (req, res) => {
  const { id } = req.params
  const camerasData = readCameras()

  const cameraIndex = camerasData.cameras.findIndex(c => c.id === id)
  if (cameraIndex === -1) {
    return res.status(404).json({ detail: 'Camera not found' })
  }

  camerasData.cameras.splice(cameraIndex, 1)
  writeCameras(camerasData)

  res.json({ status: 'ok' })
})

/**
 * Get details for a specific simulator camera
 */
app.get('/api/simulator/cameras/:id', (req, res) => {
  const { id } = req.params
  const preset = CAMERA_SIMULATOR_PRESETS.find(c => c.id === id)

  if (!preset) {
    return res.status(404).json({ error: 'Camera not found in simulator library' })
  }

  const position = calculateCameraPosition(preset.suggestedLocation, ranchCenter, fencePolygon)

  res.json({
    ...preset,
    suggestedLat: position.lat,
    suggestedLon: position.lon,
    status: simulateCameraStatus(preset),
    currentDetection: simulateAIDetectionWithProfile(
      { aiDetection: { enabled: true } },
      preset.detectionProfile
    )
  })
})

/**
 * Import a camera from simulator into the ranch system
 * This creates a real camera entry in cameras.json based on a simulator preset
 */
app.post('/api/simulator/cameras/import/:id', (req, res) => {
  const { id } = req.params
  const { customName, customLat, customLon } = req.body

  const preset = CAMERA_SIMULATOR_PRESETS.find(c => c.id === id)

  if (!preset) {
    return res.status(404).json({ error: 'Camera not found in simulator library' })
  }

  const camerasData = readCameras()

  // Check if already imported
  const alreadyImported = camerasData.cameras.find(c => c.simulatorId === preset.id)
  if (alreadyImported) {
    return res.status(400).json({
      error: 'Camera already imported',
      existingCamera: alreadyImported
    })
  }

  // Calculate position
  const suggestedPosition = calculateCameraPosition(preset.suggestedLocation, ranchCenter, fencePolygon)
  const finalLat = customLat !== undefined ? customLat : suggestedPosition.lat
  const finalLon = customLon !== undefined ? customLon : suggestedPosition.lon

  // Generate new camera ID
  const cameraCount = camerasData.cameras.length
  const newId = `cam${cameraCount + 1}`

  // Convert YouTube URL to embed format
  const embedUrl = preset.youtubeUrl ? convertToYouTubeEmbed(preset.youtubeUrl) : null

  // Create camera from preset
  const newCamera = {
    id: newId,
    simulatorId: preset.id, // Track which preset this came from
    name: customName || preset.name,
    description: preset.description,
    lat: finalLat,
    lon: finalLon,
    status: 'online',
    youtubeUrl: preset.youtubeUrl,
    embedUrl: embedUrl,
    type: preset.type,
    capabilities: preset.capabilities,
    resolution: preset.resolution,
    nightVision: preset.nightVision,
    weatherproof: preset.weatherproof,
    ptzCapable: preset.ptzCapable,
    detectionProfile: preset.detectionProfile,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiDetection: {
      enabled: true,
      lastScan: null,
      detections: []
    }
  }

  camerasData.cameras.push(newCamera)
  writeCameras(camerasData)

  res.json({
    status: 'ok',
    message: `Camera "${newCamera.name}" imported successfully`,
    camera: newCamera
  })
})

/**
 * Bulk import all simulator cameras
 */
app.post('/api/simulator/cameras/import-all', (_req, res) => {
  const camerasData = readCameras()
  const imported = []
  const skipped = []

  CAMERA_SIMULATOR_PRESETS.forEach(preset => {
    // Check if already imported
    const alreadyImported = camerasData.cameras.find(c => c.simulatorId === preset.id)
    if (alreadyImported) {
      skipped.push(preset.name)
      return
    }

    // Calculate position
    const position = calculateCameraPosition(preset.suggestedLocation, ranchCenter, fencePolygon)

    // Generate new camera ID
    const cameraCount = camerasData.cameras.length
    const newId = `cam${cameraCount + 1}`

    // Convert YouTube URL to embed format
    const embedUrl = preset.youtubeUrl ? convertToYouTubeEmbed(preset.youtubeUrl) : null

    const newCamera = {
      id: newId,
      simulatorId: preset.id,
      name: preset.name,
      description: preset.description,
      lat: position.lat,
      lon: position.lon,
      status: 'online',
      youtubeUrl: preset.youtubeUrl,
      embedUrl: embedUrl,
      type: preset.type,
      capabilities: preset.capabilities,
      resolution: preset.resolution,
      nightVision: preset.nightVision,
      weatherproof: preset.weatherproof,
      ptzCapable: preset.ptzCapable,
      detectionProfile: preset.detectionProfile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiDetection: {
        enabled: true,
        lastScan: null,
        detections: []
      }
    }

    camerasData.cameras.push(newCamera)
    imported.push(newCamera.name)
  })

  writeCameras(camerasData)

  res.json({
    status: 'ok',
    message: `Imported ${imported.length} cameras, skipped ${skipped.length} already imported`,
    imported,
    skipped,
    total: camerasData.cameras.length
  })
})

// ============================================================================
// HERD SIMULATOR ENDPOINTS
// ============================================================================

/**
 * Get current herd configuration
 */
app.get('/api/simulator/herd/config', (_req, res) => {
  res.json({
    config: herdConfig,
    currentState: {
      totalCattle: baseCattle.length,
      strayCount: Math.floor(herdConfig.totalCattleCount * (herdConfig.strayPercentage / 100)),
      activeStrays: Object.keys(strayTracking).length,
      hasRanchCenter: !!ranchCenter,
      hasFenceBoundary: !!fencePolygon,
    }
  })
})

/**
 * Update herd configuration
 */
app.post('/api/simulator/herd/config', (req, res) => {
  const {
    totalCattleCount,
    strayPercentage,
    clusterRadius,
    strayRadius,
    movementSpeed,
    movementLimit,
    strayDistanceThreshold,
    boundaryAvoidanceStrength,
    herdCohesion,
  } = req.body

  // Validate and update configuration
  if (totalCattleCount !== undefined) {
    if (totalCattleCount < 1 || totalCattleCount > 500) {
      return res.status(400).json({ error: 'totalCattleCount must be between 1 and 500' })
    }
    herdConfig.totalCattleCount = totalCattleCount
  }

  if (strayPercentage !== undefined) {
    if (strayPercentage < 0 || strayPercentage > 100) {
      return res.status(400).json({ error: 'strayPercentage must be between 0 and 100' })
    }
    herdConfig.strayPercentage = strayPercentage
  }

  if (clusterRadius !== undefined) herdConfig.clusterRadius = Math.max(0, clusterRadius)
  if (strayRadius !== undefined) herdConfig.strayRadius = Math.max(0, strayRadius)
  if (movementSpeed !== undefined) herdConfig.movementSpeed = Math.max(0, movementSpeed)
  if (movementLimit !== undefined) herdConfig.movementLimit = Math.max(0, movementLimit)
  if (strayDistanceThreshold !== undefined) herdConfig.strayDistanceThreshold = Math.max(0, strayDistanceThreshold)
  if (boundaryAvoidanceStrength !== undefined) {
    herdConfig.boundaryAvoidanceStrength = clamp(boundaryAvoidanceStrength, 0, 1)
  }
  if (herdCohesion !== undefined) {
    herdConfig.herdCohesion = clamp(herdCohesion, 0, 1)
  }

  res.json({
    status: 'ok',
    config: herdConfig,
    message: 'Configuration updated. Use /reset endpoint to reinitialize herd with new settings.'
  })
})

/**
 * Reset herd positions and regenerate cattle
 */
app.post('/api/simulator/herd/reset', (_req, res) => {
  // Regenerate base cattle if count changed
  baseCattle = generateBaseCattle()

  // Reinitialize herd positions
  initializeHerd()

  res.json({
    status: 'ok',
    message: 'Herd reset successfully',
    cattleCount: baseCattle.length,
    strayCount: Math.floor(herdConfig.totalCattleCount * (herdConfig.strayPercentage / 100))
  })
})

/**
 * Get current herd statistics
 */
app.get('/api/simulator/herd/stats', (_req, res) => {
  const strayCount = Math.floor(herdConfig.totalCattleCount * (herdConfig.strayPercentage / 100))
  const nonStrayPositions = herdPositions.slice(0, herdConfig.totalCattleCount - strayCount)

  const herdCenter = nonStrayPositions.length > 0 ? {
    lat: nonStrayPositions.reduce((sum, pos) => sum + pos.lat, 0) / nonStrayPositions.length,
    lon: nonStrayPositions.reduce((sum, pos) => sum + pos.lon, 0) / nonStrayPositions.length,
  } : ranchCenter

  // Calculate herd spread
  const distances = nonStrayPositions.map(pos =>
    calculateDistanceInMeters(pos.lat, pos.lon, herdCenter.lat, herdCenter.lon)
  )

  const avgSpread = distances.length > 0
    ? distances.reduce((sum, d) => sum + d, 0) / distances.length
    : 0

  const maxSpread = distances.length > 0 ? Math.max(...distances) : 0

  res.json({
    totalCattle: baseCattle.length,
    mainHerdCount: herdConfig.totalCattleCount - strayCount,
    designatedStrayCount: strayCount,
    activeStrayAlerts: Object.keys(strayTracking).length,
    herdCenter,
    averageSpread: Math.round(avgSpread * 3.28084), // feet
    maxSpread: Math.round(maxSpread * 3.28084), // feet
    fenceBreachActive: Date.now() < fenceBreachActiveUntil,
  })
})

// ============================================================================
// SENSOR SIMULATOR ENDPOINTS
// ============================================================================

/**
 * Receive sensor data from external simulator
 */
app.post('/api/simulator/sensor-data', (req, res) => {
  const { sensorId, value, timestamp, type, name } = req.body

  if (!sensorId || value === undefined) {
    return res.status(400).json({ error: 'sensorId and value required' })
  }

  const sensorsData = ensureDefaultSensors()
  let sensor = sensorsData.sensors.find(s => s.id === sensorId)

  if (!sensor) {
    if (!type || !name) {
      return res.status(400).json({ error: 'Unknown sensor. Provide name and type to register automatically.' })
    }
    sensor = {
      id: sensorId,
      name: name.trim(),
      type,
      createdAt: new Date().toISOString(),
      lastValue: null,
      status: 'active'
    }
    sensorsData.sensors.push(sensor)
  }

  sensor.lastValue = value
  sensor.lastUpdate = timestamp || new Date().toISOString()
  sensor.status = 'active'

  writeSensors(sensorsData)

  res.json({ status: 'ok', sensor })
})

/**
 * Get all sensors for the simulator to push data to
 */
app.get('/api/simulator/sensors', (_req, res) => {
  const sensorsData = ensureDefaultSensors()
  res.json({ sensors: sensorsData.sensors })
})

// Error logging endpoints
app.post('/api/error-log', (req, res) => {
  const { message, stack, component, url, userAgent, timestamp, level } = req.body

  logError({
    level: level || 'error',
    message,
    stack,
    component,
    url,
    userAgent,
    clientTimestamp: timestamp
  })

  res.json({ status: 'ok' })
})

app.get('/api/admin/error-log', (_req, res) => {
  const logFile = path.join(__dirname, 'error-log.json')

  try {
    if (fs.existsSync(logFile)) {
      const data = fs.readFileSync(logFile, 'utf-8')
      const logs = JSON.parse(data)
      res.json({ errors: logs })
    } else {
      res.json({ errors: [] })
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read error log' })
  }
})

app.delete('/api/admin/error-log', (_req, res) => {
  const logFile = path.join(__dirname, 'error-log.json')

  try {
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile)
    }
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear error log' })
  }
})

// Pasture management endpoints
app.get('/api/pastures', (_req, res) => {
  const pasturesData = readPastures()
  res.json({ pastures: pasturesData.pastures })
})

app.post('/api/admin/pastures', (req, res) => {
  const { name, boundary } = req.body

  if (!name || !boundary || !Array.isArray(boundary)) {
    return res.status(400).json({ error: 'Name and boundary required' })
  }

  const pasturesData = readPastures()

  if (pasturesData.pastures.length >= 20) {
    return res.status(400).json({ error: 'Maximum of 20 pastures allowed' })
  }

  const newPasture = {
    id: `pasture-${Date.now()}`,
    name: name.trim(),
    boundary: boundary,
    createdAt: new Date().toISOString()
  }

  pasturesData.pastures.push(newPasture)
  writePastures(pasturesData)

  res.json({ status: 'ok', pasture: newPasture })
})

app.delete('/api/admin/pastures/:id', (req, res) => {
  const { id } = req.params
  const pasturesData = readPastures()

  const pastureIndex = pasturesData.pastures.findIndex(p => p.id === id)

  if (pastureIndex === -1) {
    return res.status(404).json({ error: 'Pasture not found' })
  }

  pasturesData.pastures.splice(pastureIndex, 1)
  writePastures(pasturesData)

  // Reload pasture data
  loadPastureData()

  res.json({ status: 'ok' })
})

// Bulk update all pastures (used by admin map editor)
app.put('/api/admin/pastures/bulk', (req, res) => {
  const { pastures } = req.body

  if (!pastures || !Array.isArray(pastures)) {
    return res.status(400).json({ error: 'Pastures array required' })
  }

  writePastures({ pastures })

  // Reload pasture data to update runtime state
  loadPastureData()

  res.json({ status: 'ok', count: pastures.length })
})

app.post('/api/admin/pastures/address', async (req, res) => {
  const { address, previewOnly } = req.body || {}

  if (!address || !address.trim()) {
    return res.status(400).json({ error: 'Address is required' })
  }

  try {
    const generation = await generatePastureLayoutFromAddress({
      address: address.trim()
    }, { persist: !previewOnly })

    res.json({
      status: previewOnly ? 'preview' : 'ok',
      property: generation.property,
      pastures: generation.plots,
      layout: generation.layout,
      source: generation.source
    })
  } catch (error) {
    console.error('Failed to lookup property boundary:', error)
    res.status(500).json({ error: error.message || 'Failed to lookup property boundary. Please use the map editor to draw manually.' })
  }
})

// Update the primary pasture (used by admin to set boundary from address)
app.put('/api/admin/pasture/primary', (req, res) => {
  const { name, boundary, center, gates: gatesData } = req.body
  try {
    const pasture = savePrimaryPasture({ name, boundary, center, gates: gatesData })
    res.json({ status: 'ok', pasture })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/sensors', (_req, res) => {
  // Get configured sensors from admin panel
  const sensorsData = ensureDefaultSensors()
  // Only show sensors that have been placed (have lat/lon coordinates)
  const configuredSensors = (sensorsData.sensors || []).filter(s => s.lat != null && s.lon != null)

  // If no sensors configured, return empty
  // Build sensor readings from configured sensors
  const sensors = {}

  // Always include SYSTEM sensor
  const allGreen = configuredSensors.every(s => {
    if (!s.lastValue) return true
    if (s.type === 'water') return s.lastValue > 70
    if (s.type === 'fence') return s.lastValue >= 7.5
    if (s.type === 'gate') return s.lastValue === 'closed'
    return true
  })

  const breachActive = Date.now() < fenceBreachActiveUntil

  sensors.SYSTEM = {
    status: breachActive ? 'red' : allGreen ? 'green' : 'yellow',
    value: breachActive ? 'breach' : allGreen ? 'nominal' : 'review',
    detail: breachActive
      ? 'Perimeter breach alarms engaged; live response teams dispatched to pasture.'
      : allGreen
          ? 'Automation, analytics, and failsafes nominal across the ranch stack.'
          : 'System automation engaged with advisories from sub-systems.',
  }

  // Add each configured sensor
  configuredSensors.forEach(sensor => {
    const key = sensor.name.toUpperCase().replace(/\s+/g, '_')
    const value = sensor.lastValue

    if (!value && value !== 0) {
      // No data yet from simulator
      sensors[key] = {
        status: 'yellow',
        value: 'waiting',
        detail: `${sensor.name} configured but no data received yet.`,
      }
      return
    }

    // Format based on sensor type
    switch (sensor.type) {
      case 'water':
        sensors[key] = {
          status: value > 70 ? 'green' : value > 40 ? 'yellow' : 'red',
          value: `${value.toFixed(1)}% full`,
          detail: value > 70
            ? `${sensor.name} level is ${value.toFixed(1)}% - adequate supply.`
            : `${sensor.name} at ${value.toFixed(1)}% - refill recommended.`,
        }
        break

      case 'fence':
        sensors[key] = {
          status: value >= 7.5 ? 'green' : value >= 6.0 ? 'yellow' : 'red',
          value: `${value.toFixed(2)} kV`,
          detail: value >= 7.5
            ? `${sensor.name} voltage steady at ${value.toFixed(2)} kV.`
            : `${sensor.name} voltage low: ${value.toFixed(2)} kV - check connections.`,
        }
        break

      case 'gate':
        sensors[key] = {
          status: value === 'open' ? 'yellow' : 'green',
          value: value,
          detail: value === 'open'
            ? `${sensor.name} is currently open.`
            : `${sensor.name} is secured.`,
        }
        break

      case 'temperature':
        sensors[key] = {
          status: value < 80 ? 'green' : value < 90 ? 'yellow' : 'red',
          value: `${value.toFixed(1)}°F`,
          detail: `${sensor.name} reading ${value.toFixed(1)}°F.`,
        }
        break

      case 'network':
        sensors[key] = {
          status: value >= 4 ? 'green' : value >= 2 ? 'yellow' : 'red',
          value: `${Math.floor(value)} bars`,
          bars: Math.floor(value),
          detail: `${sensor.name} signal strength: ${Math.floor(value)}/5 bars.`,
        }
        break

      case 'soil':
        sensors[key] = {
          status: value > 30 ? 'green' : value > 15 ? 'yellow' : 'red',
          value: `${value.toFixed(1)}% moisture`,
          detail: value > 30
            ? `${sensor.name} moisture adequate at ${value.toFixed(1)}%.`
            : `${sensor.name} moisture low: ${value.toFixed(1)}% - irrigation needed.`,
        }
        break

      default:
        sensors[key] = {
          status: 'green',
          value: String(value),
          detail: `${sensor.name}: ${value}`,
        }
    }
  })

  // Add breach alert if active
  if (breachActive) {
    sensors.ALERTS = {
      status: 'red',
      value: 'PERIMETER',
      detail: 'Perimeter intrusion alarm active — drones and strobes deployed to herd perimeter.',
    }
  }

  // Include sensor list with locations for map display
  const sensorsWithLocations = configuredSensors.filter(s => s.lat && s.lon)

  if (configuredSensors.length === 0) {
    return res.json({
      sensors: {
        SYSTEM: {
          status: 'yellow',
          value: 'unconfigured',
          detail: 'No sensors configured. Add sensors in the Admin Panel to begin monitoring.'
        }
      },
      sensorsList: []
    })
  }

  return res.json({
    sensors,
    sensorsList: sensorsWithLocations
  })
})

/**
 * Enhanced cattle movement with herd cohesion and boundary avoidance
 * Now uses cattle from cattle.json instead of hardcoded simulation
 *
 * If external cattle simulator is running, use its data directly
 */
app.get('/api/herd', (_req, res) => {
  // Check if external simulator has provided cattle data
  if (global.simulatorHerdData && Array.isArray(global.simulatorHerdData) && global.simulatorHerdData.length > 0) {
    // Use data from external cattle simulator
    const herdCenter = {
      lat: global.simulatorHerdData.reduce((sum, c) => sum + c.lat, 0) / global.simulatorHerdData.length,
      lon: global.simulatorHerdData.reduce((sum, c) => sum + c.lon, 0) / global.simulatorHerdData.length,
    }
    return res.json({ herd: global.simulatorHerdData, herdCenter })
  }

  // Fallback to internal simulation if no external simulator
  // Read actual cattle from cattle.json
  const registeredCattle = readCattle()

  // If no cattle registered, return empty herd
  if (!registeredCattle || registeredCattle.length === 0) {
    return res.json({ herd: [], herdCenter: ranchCenter })
  }

  // Ensure we have positions for all registered cattle
  // Initialize positions for new cattle
  while (herdPositions.length < registeredCattle.length) {
    const newPos = randomPointWithinFence(0.01)
    herdPositions.push(newPos)
    herdAnchors.push({ ...newPos })
  }

  // Trim positions if cattle were removed
  if (herdPositions.length > registeredCattle.length) {
    herdPositions = herdPositions.slice(0, registeredCattle.length)
    herdAnchors = herdAnchors.slice(0, registeredCattle.length)
  }

  // Calculate current herd center
  const nonStrayPositions = herdPositions

  const herdCenter = nonStrayPositions.length > 0 ? {
    lat: nonStrayPositions.reduce((sum, pos) => sum + pos.lat, 0) / nonStrayPositions.length,
    lon: nonStrayPositions.reduce((sum, pos) => sum + pos.lon, 0) / nonStrayPositions.length,
  } : ranchCenter

  // Update each cow's position
  herdPositions = herdPositions.map((position, index) => {
    const anchor = herdAnchors[index]

    // Base random movement
    let deltaLat = randomBetween(-herdConfig.movementSpeed, herdConfig.movementSpeed)
    let deltaLon = randomBetween(-herdConfig.movementSpeed, herdConfig.movementSpeed)

    // Apply herd cohesion (all cattle stay together)
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
    if (constrained.breached) {
      fenceBreachActiveUntil = Date.now() + 120000 // 2 minute breach alarm
    }

    return { lat: constrained.lat, lon: constrained.lon }
  })

  // Build herd data with stray detection using registered cattle
  const herd = registeredCattle.map((cattle, index) => {
    const position = herdPositions[index]

    // Calculate distance from herd center
    const distance = calculateDistance(position.lat, position.lon, herdCenter.lat, herdCenter.lon)
    const isStray = distance > herdConfig.strayDistanceThreshold
    const now = Date.now()

    // Track when cow became a stray
    if (isStray && !strayTracking[cattle.id]) {
      strayTracking[cattle.id] = {
        detectedAt: now - randomBetween(0, 120) * 60000, // Random 0-120 minutes ago for demo
        initialLat: position.lat,
        initialLon: position.lon,
      }
    } else if (!isStray && strayTracking[cattle.id]) {
      delete strayTracking[cattle.id]
    }

    // Calculate duration if currently stray
    const strayData = strayTracking[cattle.id]
    const strayDurationMs = strayData ? now - strayData.detectedAt : 0
    const strayDurationMinutes = Math.floor(strayDurationMs / 60000)

    // Add simulated altitude (varies by location with some randomness)
    const baseAltitude = 850 // feet
    const altitudeVariation = ranchCenter ? (position.lat - ranchCenter.lat) * 2000 + randomBetween(-20, 20) : 0
    const altitude = Math.round(baseAltitude + altitudeVariation)

    // Update cattle position in cattle.json
    cattle.lat = position.lat
    cattle.lon = position.lon
    cattle.altitude = altitude

    return {
      id: cattle.id,
      name: cattle.name || cattle.earTag,
      earTag: cattle.earTag,
      breed: cattle.breed,
      weight: cattle.weight,
      temperature: cattle.temperature || 101.5,
      vaccines: cattle.vaccines || [],
      lat: position.lat,
      lon: position.lon,
      altitude,
      isStray,
      strayDuration: strayDurationMinutes,
      distanceFromHerd: Number(distance.toFixed(4)),
      pasture: cattle.pasture,
      healthStatus: cattle.healthStatus || 'healthy'
    }
  })

  return res.json({ herd, herdCenter })
})

/**
 * POST /api/herd - Accept herd positions from external simulator
 * This allows the cattle simulator to push position updates to RanchOS
 */
app.post('/api/herd', (req, res) => {
  try {
    const { positions, cattle, config, timestamp } = req.body

    // Validate input
    if (!positions || !Array.isArray(positions)) {
      return res.status(400).json({ error: 'positions array required' })
    }

    // Update herd positions if provided
    if (positions.length > 0) {
      // Update positions
      herdPositions = positions.map(pos => ({
        lat: pos.lat,
        lon: pos.lon
      }))

      // Update anchors to match new positions
      herdAnchors = positions.map(pos => ({
        lat: pos.lat,
        lon: pos.lon
      }))

      console.log(`✓ Herd positions updated from simulator: ${positions.length} cattle ${timestamp ? `(${timestamp})` : ''}`)
    }

    // If full cattle data is provided, store it for GET /api/herd to use
    // This allows the simulator to manage all cattle data and positions
    if (cattle && Array.isArray(cattle) && cattle.length > 0) {
      // Store simulator cattle data in a global variable
      // GET /api/herd will use this instead of generating its own
      global.simulatorHerdData = cattle
      console.log(`✓ Cattle data updated from simulator: ${cattle.length} records`)
    }

    // Update herd configuration if provided
    if (config) {
      if (typeof config.totalCattleCount === 'number') {
        herdConfig.totalCattleCount = config.totalCattleCount
      }
      if (typeof config.strayPercentage === 'number') {
        herdConfig.strayPercentage = config.strayPercentage
      }
      if (typeof config.clusterRadius === 'number') {
        herdConfig.clusterRadius = config.clusterRadius
      }
      if (typeof config.strayRadius === 'number') {
        herdConfig.strayRadius = config.strayRadius
      }
      if (typeof config.movementSpeed === 'number') {
        herdConfig.movementSpeed = config.movementSpeed
      }
      if (typeof config.herdCohesion === 'number') {
        herdConfig.herdCohesion = config.herdCohesion
      }
      if (typeof config.boundaryAvoidanceStrength === 'number') {
        herdConfig.boundaryAvoidanceStrength = config.boundaryAvoidanceStrength
      }
      if (typeof config.strayDistanceThreshold === 'number') {
        herdConfig.strayDistanceThreshold = config.strayDistanceThreshold
      }
      if (typeof config.movementLimit === 'number') {
        herdConfig.movementLimit = config.movementLimit
      }
    }

    res.json({
      success: true,
      message: 'Herd data updated successfully',
      cattleCount: herdPositions.length,
      config: herdConfig
    })
  } catch (error) {
    console.error('Error updating herd data:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/herd/reset - Reset herd positions to anchors
 */
app.put('/api/herd/reset', (_req, res) => {
  try {
    // Reset positions to match anchors
    herdPositions = herdAnchors.map(anchor => ({ ...anchor }))

    // Clear stray tracking
    Object.keys(strayTracking).forEach(key => delete strayTracking[key])

    console.log('Herd positions reset to anchors')

    res.json({
      success: true,
      message: 'Herd positions reset to anchors',
      cattleCount: herdPositions.length
    })
  } catch (error) {
    console.error('Error resetting herd:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/stray-alerts', (_req, res) => {
  // Get all non-stray cattle for distance calculations
  const nonStrayCattle = baseCattle
    .map((cow, index) => ({ ...cow, position: herdPositions[index], index }))
    .filter((cow) => !strayTracking[cow.id])

  const alerts = Object.entries(strayTracking).map(([cowId, data]) => {
    const cow = baseCattle.find((c) => c.id === cowId)
    const cowIndex = baseCattle.findIndex((c) => c.id === cowId)
    const position = herdPositions[cowIndex]
    const durationMs = Date.now() - data.detectedAt
    const durationMinutes = Math.floor(durationMs / 60000)
    const durationHours = Math.floor(durationMinutes / 60)
    const remainingMinutes = durationMinutes % 60

    // Calculate altitude
    const baseAltitude = 850
    const altitudeVariation = ranchCenter ? (position.lat - ranchCenter.lat) * 2000 : 0
    const altitude = Math.round(baseAltitude + altitudeVariation)

    // Find closest non-stray cow
    let closestCow = null
    let minDistance = Infinity

    nonStrayCattle.forEach((nonStray) => {
      const distance = calculateDistanceInMeters(
        position.lat, position.lon,
        nonStray.position.lat, nonStray.position.lon
      )
      if (distance < minDistance) {
        minDistance = distance
        closestCow = {
          id: nonStray.id,
          name: nonStray.name,
          lat: nonStray.position.lat,
          lon: nonStray.position.lon,
        }
      }
    })

    return {
      cowId,
      name: cow?.name || 'Unknown',
      lat: position.lat,
      lon: position.lon,
      altitude,
      detectedAt: data.detectedAt,
      duration: durationHours > 0
        ? `${durationHours}h ${remainingMinutes}m`
        : `${durationMinutes}m`,
      durationMinutes,
      closestCow,
      distanceToClosest: closestCow ? Math.round(minDistance * 3.28084) : null, // Convert to feet
    }
  })

  return res.json({ alerts })
})

app.get('/api/gates', (_req, res) => {
  if (gates.length > 0 && Math.random() > 0.6) {
    const gateIndex = Math.floor(Math.random() * gates.length)
    gates[gateIndex].status = gates[gateIndex].status === 'open' ? 'closed' : 'open'
  }

  return res.json({ gates })
})

app.get('/api/chute', (_req, res) => {
  const cow = baseCattle[Math.floor(Math.random() * baseCattle.length)]
  const reading = {
    id: cow.id,
    weight: cow.weight + Math.floor(randomBetween(-15, 16)),
    temperature: Number((cow.temperature + randomBetween(-0.4, 0.4)).toFixed(1)),
    last_weighed: new Date().toISOString(),
    operator: USER_LIST[Math.floor(Math.random() * USER_LIST.length)],
    note: ['Routine weight check', 'Post-vaccine observation', 'Health audit', 'Hoof inspection'][
      Math.floor(Math.random() * 4)
    ],
  }

  return res.json({ chute: reading })
})

app.get('/api/cameras', (_req, res) => {
  const camerasData = readCameras()

  // If no cameras configured, return empty array
  if (!camerasData.cameras || camerasData.cameras.length === 0) {
    return res.json({ cameras: [] })
  }

  // Map camera sensors with AI detection simulation
  const cameras = camerasData.cameras.map((camera) => {
    // Use profile-based AI detection if camera has a detection profile
    // Otherwise fall back to basic detection
    const aiDetection = camera.detectionProfile
      ? simulateAIDetectionWithProfile(camera, camera.detectionProfile)
      : simulateAIDetection(camera)

    // Update camera with latest AI detection (in memory only, not persisted)
    const hasPredatorDetection = aiDetection.detections.some(
      d => d.category === 'PREDATOR' || d.category === 'THREAT'
    )

    // Use enhanced camera status simulation
    const status = simulateCameraStatus(camera)

    return {
      camera: camera.id,
      name: camera.name,
      status: status,
      predator_detected: hasPredatorDetection,
      location: camera.name,
      embedUrl: camera.embedUrl,
      youtubeUrl: camera.youtubeUrl,
      lat: camera.lat,
      lon: camera.lon,
      // Additional metadata for imported cameras
      type: camera.type,
      capabilities: camera.capabilities,
      resolution: camera.resolution,
      detectionProfile: camera.detectionProfile,
      // AI/ML Detection Results
      aiDetection: {
        enabled: aiDetection.enabled,
        lastScan: aiDetection.lastScan,
        alertLevel: aiDetection.alertLevel,
        confidence: aiDetection.confidence,
        detections: aiDetection.detections.map(d => ({
          timestamp: d.timestamp,
          category: d.category,
          object: d.object,
          confidence: d.confidence,
          alertLevel: d.alertLevel,
          // Include bounding box for UI visualization
          boundingBox: d.boundingBox
        }))
      }
    }
  })

  return res.json({ cameras })
})

app.get('/api/config', (_req, res) => {
  res.json({
    mapboxToken: resolveMapboxToken(),
    ranchCenter: ranchCenter,
    fence: fencePolygon ? { coordinates: fencePolygon } : null,
    gates: gates
  })
})

/**
 * Get setup status - check if system is configured
 */
app.get('/api/setup-status', (_req, res) => {
  const cattle = readCattle()
  const sensors = readSensors()
  const cameras = readCameras()
  const pastures = readPastures()

  const hasBoundary = fencePolygon && fencePolygon.length > 0
  const cattleCount = cattle.length
  const sensorCount = sensors.sensors ? sensors.sensors.length : 0
  const cameraCount = cameras.cameras ? cameras.cameras.length : 0
  const pastureCount = pastures.pastures ? pastures.pastures.length : 0

  const isConfigured = hasBoundary || cattleCount > 0 || sensorCount > 0 || cameraCount > 0

  res.json({
    isConfigured,
    hasBoundary,
    cattleCount,
    sensorCount,
    cameraCount,
    pastureCount,
    needsSetup: !isConfigured
  })
})

app.get('/api/version', (_req, res) => {
  const packageJson = require('../package.json')
  let versionData = {
    version: packageJson.version,
    buildNumber: 'dev',
    buildDate: new Date().toISOString(),
  }

  try {
    const versionPath = path.join(distDir, 'version.json')
    if (fs.existsSync(versionPath)) {
      versionData = JSON.parse(fs.readFileSync(versionPath, 'utf-8'))
    }
  } catch (error) {
    // Use defaults if version.json doesn't exist
  }

  res.json(versionData)
})

app.get('*', (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    const indexFile = path.join(distDir, 'index.html')
    if (fs.existsSync(indexFile)) {
      return res.sendFile(indexFile)
    }
  }
  return next()
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`3 Strands Cattle Co. dashboard listening on http://0.0.0.0:${PORT}`)
  console.log(`Access from network: http://<your-ip>:${PORT}`)
  if (!fs.existsSync(distDir)) {
    console.warn('Warning: frontend build not found. Run "npm run build" before starting the server.')
  }
})
