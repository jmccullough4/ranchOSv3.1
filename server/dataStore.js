/**
 * Multi-Tenant Data Storage Layer
 * Provides ranch-scoped data access with complete isolation between tenants
 */

const fs = require('fs')
const path = require('path')

/**
 * Get the base data directory for a ranch
 */
const getRanchDataDir = (ranchId) => {
  return path.join(__dirname, 'data', ranchId)
}

/**
 * Ensure ranch data directory exists
 */
const ensureRanchDataDir = (ranchId) => {
  const dir = getRanchDataDir(ranchId)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Generic read function for ranch-scoped JSON files
 */
const readRanchData = (ranchId, filename, defaultValue = {}) => {
  try {
    const filePath = path.join(getRanchDataDir(ranchId), filename)

    if (!fs.existsSync(filePath)) {
      return defaultValue
    }

    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`Error reading ${filename} for ranch ${ranchId}:`, error)
    return defaultValue
  }
}

/**
 * Generic write function for ranch-scoped JSON files
 */
const writeRanchData = (ranchId, filename, data) => {
  try {
    ensureRanchDataDir(ranchId)
    const filePath = path.join(getRanchDataDir(ranchId), filename)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error(`Error writing ${filename} for ranch ${ranchId}:`, error)
    throw error
  }
}

/**
 * Specific data accessors for different resource types
 */

// Users
const readUsers = (ranchId) => readRanchData(ranchId, 'users.json', { users: [] })
const writeUsers = (ranchId, data) => writeRanchData(ranchId, 'users.json', data)

// Sensors
const readSensors = (ranchId) => readRanchData(ranchId, 'sensors.json', { sensors: [] })
const writeSensors = (ranchId, data) => writeRanchData(ranchId, 'sensors.json', data)

// Cattle
const readCattle = (ranchId) => readRanchData(ranchId, 'cattle.json', { cattle: [] })
const writeCattle = (ranchId, data) => writeRanchData(ranchId, 'cattle.json', data)

// Cameras
const readCameras = (ranchId) => readRanchData(ranchId, 'cameras.json', { cameras: [] })
const writeCameras = (ranchId, data) => writeRanchData(ranchId, 'cameras.json', data)

// Pastures
const readPastures = (ranchId) => readRanchData(ranchId, 'pastures.json', { pastures: [] })
const writePastures = (ranchId, data) => writeRanchData(ranchId, 'pastures.json', data)

// Gates
const readGates = (ranchId) => readRanchData(ranchId, 'gates.json', { gates: [] })
const writeGates = (ranchId, data) => writeRanchData(ranchId, 'gates.json', data)

// Config
const readConfig = (ranchId) => readRanchData(ranchId, 'config.json', { countyGisApiUrl: null })
const writeConfig = (ranchId, data) => writeRanchData(ranchId, 'config.json', data)

/**
 * Check if ranch instance exists
 */
const ranchExists = (ranchId) => {
  const dir = getRanchDataDir(ranchId)
  return fs.existsSync(dir)
}

/**
 * List all ranch instances
 */
const listRanches = () => {
  try {
    const dataDir = path.join(__dirname, 'data')
    const ranchesFile = path.join(dataDir, 'ranches.json')

    if (!fs.existsSync(ranchesFile)) {
      return []
    }

    const data = JSON.parse(fs.readFileSync(ranchesFile, 'utf-8'))
    return data.ranches || []
  } catch (error) {
    console.error('Error listing ranches:', error)
    return []
  }
}

/**
 * Migration helper: Move existing data to demo ranch
 */
const migrateExistingDataToDemoRanch = () => {
  const oldDataDir = __dirname
  const demoRanchId = 'demo'
  const demoDataDir = getRanchDataDir(demoRanchId)

  // Check if migration is needed
  if (fs.existsSync(demoDataDir)) {
    console.log('Demo ranch data already exists, skipping migration')
    return
  }

  console.log('Migrating existing data to demo ranch...')

  // Create demo ranch directory
  ensureRanchDataDir(demoRanchId)

  // Files to migrate
  const filesToMigrate = [
    'users.json',
    'sensors.json',
    'cattle.json',
    'cameras.json',
    'pastures.json',
    'config.json'
  ]

  filesToMigrate.forEach((filename) => {
    const oldPath = path.join(oldDataDir, filename)
    const newPath = path.join(demoDataDir, filename)

    if (fs.existsSync(oldPath)) {
      try {
        fs.copyFileSync(oldPath, newPath)
        console.log(`Migrated ${filename} to demo ranch`)
      } catch (error) {
        console.error(`Error migrating ${filename}:`, error)
      }
    }
  })

  // Create ranches registry
  const ranchesFile = path.join(__dirname, 'data', 'ranches.json')
  const ranches = {
    ranches: [
      {
        ranchId: 'demo',
        companyName: '3 Strands Cattle Co., LLC',
        url: 'https://ranch-demo.ranchos.app',
        createdAt: new Date().toISOString(),
        status: 'active'
      }
    ]
  }

  fs.writeFileSync(ranchesFile, JSON.stringify(ranches, null, 2))
  console.log('Migration complete!')
}

module.exports = {
  getRanchDataDir,
  ensureRanchDataDir,
  readRanchData,
  writeRanchData,
  readUsers,
  writeUsers,
  readSensors,
  writeSensors,
  readCattle,
  writeCattle,
  readCameras,
  writeCameras,
  readPastures,
  writePastures,
  readGates,
  writeGates,
  readConfig,
  writeConfig,
  ranchExists,
  listRanches,
  migrateExistingDataToDemoRanch
}
