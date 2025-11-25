/**
 * Multi-Tenant RanchOS Server
 *
 * This is the new multi-tenant entry point that adds:
 * - Ranch identification from subdomains
 * - JWT-based authentication
 * - Tenant-scoped data isolation
 * - Self-service ranch signup
 */

const express = require('express')
const path = require('path')
const fs = require('fs')
const cors = require('cors')

// Import multi-tenant modules
const {
  ranchIdentifier,
  requireAuth,
  requireAdmin,
  generateToken,
  hashPassword,
  verifyPassword,
  readRanchUsers,
  writeRanchUsers,
  createRanchInstance
} = require('./auth')

const dataStore = require('./dataStore')

const app = express()
const PORT = process.env.PORT || 8082

// Middleware
app.use(express.json())
app.use(cors())

// Apply ranch identifier to all requests
app.use(ranchIdentifier)

// ============================================================================
// PUBLIC ENDPOINTS (No authentication required)
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'RanchOS Multi-Tenant' })
})

/**
 * Login endpoint - Issues JWT token
 */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const ranchId = req.ranchId

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }

    // Check if ranch exists
    if (!dataStore.ranchExists(ranchId)) {
      return res.status(404).json({ error: 'Ranch not found' })
    }

    // Get users for this ranch
    const usersData = dataStore.readUsers(ranchId)
    const user = usersData.users.find(u =>
      u.username.toLowerCase() === username.toLowerCase()
    )

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate JWT token
    const token = generateToken(user, ranchId)

    res.json({
      status: 'ok',
      user: user.username,
      role: user.role,
      ranchId: ranchId,
      token: token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

/**
 * Ranch signup endpoint - Creates new ranch instance
 */
app.post('/api/signup', async (req, res) => {
  try {
    const { ranchId, companyName, adminUsername, adminPassword } = req.body

    // Validate input
    if (!ranchId || !companyName || !adminUsername || !adminPassword) {
      return res.status(400).json({
        error: 'Ranch ID, company name, admin username, and password are required'
      })
    }

    // Validate ranch ID format (lowercase, alphanumeric, hyphens only)
    if (!/^[a-z0-9-]+$/.test(ranchId)) {
      return res.status(400).json({
        error: 'Ranch ID must be lowercase letters, numbers, and hyphens only'
      })
    }

    // Check if ranch already exists
    if (dataStore.ranchExists(ranchId)) {
      return res.status(409).json({ error: 'Ranch ID already exists' })
    }

    // Create ranch instance
    const ranch = await createRanchInstance(
      ranchId,
      adminUsername,
      adminPassword,
      companyName
    )

    res.status(201).json({
      status: 'created',
      ranch: {
        ranchId: ranch.ranchId,
        companyName: ranch.companyName,
        url: ranch.url,
        adminUsername: ranch.adminUsername
      },
      message: 'Ranch instance created successfully'
    })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ error: error.message || 'Signup failed' })
  }
})

/**
 * List all ranches (for marketplace/directory)
 */
app.get('/api/ranches', (req, res) => {
  try {
    const ranches = dataStore.listRanches()
    res.json({ ranches })
  } catch (error) {
    console.error('Error listing ranches:', error)
    res.status(500).json({ error: 'Failed to list ranches' })
  }
})

// ============================================================================
// AUTHENTICATED ENDPOINTS (Require valid JWT token)
// ============================================================================

/**
 * Get current user info
 */
app.get('/api/user', requireAuth, (req, res) => {
  res.json({
    username: req.user.username,
    role: req.user.role,
    ranchId: req.user.ranchId
  })
})

/**
 * Get ranch configuration (including Mapbox token)
 */
app.get('/api/config', requireAuth, (req, res) => {
  try {
    const config = dataStore.readConfig(req.ranchId)
    const pastures = dataStore.readPastures(req.ranchId)

    // Get primary pasture for ranch center
    const primaryPasture = pastures.pastures?.find(p => p.isPrimary)

    // Get Mapbox token from environment or use default
    const DEFAULT_MAPBOX_TOKEN =
      'pk.eyJ1Ijoiam1jY3VsbG91Z2g0IiwiYSI6ImNtMGJvOXh3cDBjNncya3B4cDg0MXFuYnUifQ.uDJKnqE9WgkvGXYGLge-NQ'

    const mapboxToken = process.env.MAPBOX_TOKEN || DEFAULT_MAPBOX_TOKEN

    res.json({
      mapboxToken,
      ranchCenter: primaryPasture ? [primaryPasture.longitude, primaryPasture.latitude] : null,
      fence: primaryPasture?.polygon || null,
      countyGisApiUrl: config.countyGisApiUrl,
      ranchName: config.ranchName
    })
  } catch (error) {
    console.error('Error getting config:', error)
    res.status(500).json({ error: 'Failed to get configuration' })
  }
})

/**
 * Get sensors for ranch
 */
app.get('/api/sensors', requireAuth, (req, res) => {
  try {
    const sensorsData = dataStore.readSensors(req.ranchId)
    res.json({ sensors: sensorsData.sensors || [], sensorsList: sensorsData.sensors || [] })
  } catch (error) {
    console.error('Error getting sensors:', error)
    res.status(500).json({ error: 'Failed to get sensors' })
  }
})

/**
 * Get cattle/herd for ranch
 */
app.get('/api/herd', requireAuth, (req, res) => {
  try {
    const cattleData = dataStore.readCattle(req.ranchId)
    res.json({ herd: cattleData.cattle || [] })
  } catch (error) {
    console.error('Error getting herd:', error)
    res.status(500).json({ error: 'Failed to get herd' })
  }
})

/**
 * Get cameras for ranch
 */
app.get('/api/cameras', requireAuth, (req, res) => {
  try {
    const camerasData = dataStore.readCameras(req.ranchId)
    res.json({ cameras: camerasData.cameras || [] })
  } catch (error) {
    console.error('Error getting cameras:', error)
    res.status(500).json({ error: 'Failed to get cameras' })
  }
})

/**
 * Get pastures for ranch
 */
app.get('/api/pastures', requireAuth, (req, res) => {
  try {
    const pasturesData = dataStore.readPastures(req.ranchId)
    res.json({ pastures: pasturesData.pastures || [] })
  } catch (error) {
    console.error('Error getting pastures:', error)
    res.status(500).json({ error: 'Failed to get pastures' })
  }
})

/**
 * Get gates for ranch
 */
app.get('/api/gates', requireAuth, (req, res) => {
  try {
    const gatesData = dataStore.readGates(req.ranchId)
    res.json({ gates: gatesData.gates || [] })
  } catch (error) {
    console.error('Error getting gates:', error)
    res.status(500).json({ error: 'Failed to get gates' })
  }
})

/**
 * Stub endpoints for features not yet migrated
 */
app.get('/api/chute', requireAuth, (req, res) => {
  res.json({
    chute: {
      id: 'N/A',
      weight: 0,
      temperature: 0,
      operator: 'System',
      last_weighed: new Date().toISOString()
    }
  })
})

app.get('/api/stray-alerts', requireAuth, (req, res) => {
  res.json({ alerts: [] })
})

app.get('/api/version', (req, res) => {
  res.json({
    version: '4.0.0',
    buildNumber: '1',
    buildDate: new Date().toISOString()
  })
})

// ============================================================================
// ADMIN ENDPOINTS (Require admin role)
// ============================================================================

/**
 * Get all users for ranch (admin only)
 */
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const usersData = dataStore.readUsers(req.ranchId)
    // Don't send password hashes to client
    const sanitizedUsers = usersData.users.map(u => ({
      username: u.username,
      role: u.role,
      createdAt: u.createdAt
    }))
    res.json({ users: sanitizedUsers })
  } catch (error) {
    console.error('Error getting users:', error)
    res.status(500).json({ error: 'Failed to get users' })
  }
})

/**
 * Create new user for ranch (admin only)
 */
app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }

    const usersData = dataStore.readUsers(req.ranchId)

    // Check if username already exists
    if (usersData.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: 'Username already exists' })
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Add new user
    const newUser = {
      username,
      password: passwordHash,
      role: role || 'user',
      createdAt: new Date().toISOString()
    }

    usersData.users.push(newUser)
    dataStore.writeUsers(req.ranchId, usersData)

    res.status(201).json({
      status: 'created',
      user: {
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    })
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

/**
 * Delete user (admin only)
 */
app.delete('/api/admin/users/:username', requireAuth, requireAdmin, (req, res) => {
  try {
    const { username } = req.params
    const usersData = dataStore.readUsers(req.ranchId)

    const userIndex = usersData.users.findIndex(
      u => u.username.toLowerCase() === username.toLowerCase()
    )

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent deleting the last admin
    const adminCount = usersData.users.filter(u => u.role === 'admin').length
    if (usersData.users[userIndex].role === 'admin' && adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin user' })
    }

    usersData.users.splice(userIndex, 1)
    dataStore.writeUsers(req.ranchId, usersData)

    res.json({ status: 'ok', message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

/**
 * Update ranch configuration (admin only)
 */
app.post('/api/admin/config', requireAuth, requireAdmin, (req, res) => {
  try {
    const config = dataStore.readConfig(req.ranchId)

    // Merge new config
    Object.assign(config, req.body)

    dataStore.writeConfig(req.ranchId, config)

    res.json({ status: 'ok', config })
  } catch (error) {
    console.error('Error updating config:', error)
    res.status(500).json({ error: 'Failed to update configuration' })
  }
})

// ============================================================================
// STATIC FILE SERVING
// ============================================================================

// Serve React frontend
const frontendBuildPath = path.join(__dirname, '../frontend/dist')

if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath))

  // Catch-all route to serve index.html for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'))
  })
} else {
  console.warn('Frontend build not found. Run `npm run build` first.')
  app.get('*', (req, res) => {
    res.status(503).send('Frontend not built. Run `npm run build`.')
  })
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log('='.repeat(60))
  console.log('RanchOS Multi-Tenant Server')
  console.log('='.repeat(60))
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log('\nAccess your ranch:')
  console.log(`  Local: http://localhost:${PORT}?ranchId=demo`)
  console.log(`  Production: https://ranch-{your-ranch-id}.ranchos.app`)
  console.log('='.repeat(60))
})
