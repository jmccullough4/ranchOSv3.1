/**
 * Authentication and Multi-Tenant Authorization Module
 * Handles JWT-based authentication, ranch identification, and user management
 */

const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const fs = require('fs')
const path = require('path')

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'ranchOS-jwt-secret-change-in-production'
const JWT_EXPIRATION = '7d' // Tokens valid for 7 days
const SALT_ROUNDS = 10

/**
 * Extract ranch ID from subdomain
 * Example: ranch-3strands.ranchos.app -> "3strands"
 */
const extractRanchId = (req) => {
  const hostname = req.hostname || req.headers.host?.split(':')[0] || 'localhost'

  // Handle localhost and IP addresses in development
  if (hostname === 'localhost' || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    // In development, allow ranch ID from query parameter or default to 'demo'
    return req.query.ranchId || 'demo'
  }

  // Extract from subdomain: ranch-{customername}.ranchos.app
  const parts = hostname.split('.')
  if (parts[0] && parts[0].startsWith('ranch-')) {
    return parts[0].replace('ranch-', '')
  }

  // Fallback to demo ranch
  return 'demo'
}

/**
 * Middleware to extract and validate ranch ID
 */
const ranchIdentifier = (req, res, next) => {
  const ranchId = extractRanchId(req)

  if (!ranchId || ranchId === '') {
    return res.status(400).json({ error: 'Ranch identification required' })
  }

  // Attach ranch ID to request object for downstream use
  req.ranchId = ranchId
  next()
}

/**
 * Middleware to verify JWT token and extract user info
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    // Attach user info to request
    req.user = {
      username: decoded.username,
      role: decoded.role,
      ranchId: decoded.ranchId
    }

    // Verify ranch ID matches the subdomain
    if (req.ranchId && req.user.ranchId !== req.ranchId) {
      return res.status(403).json({ error: 'Ranch access forbidden' })
    }

    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

/**
 * Middleware to require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

/**
 * Generate JWT token for user
 */
const generateToken = (user, ranchId) => {
  return jwt.sign(
    {
      username: user.username,
      role: user.role,
      ranchId: ranchId
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  )
}

/**
 * Hash password using bcrypt
 */
const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify password against hash
 */
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash)
}

/**
 * Read users for a specific ranch
 */
const readRanchUsers = (ranchId) => {
  try {
    const filePath = path.join(__dirname, 'data', ranchId, 'users.json')
    if (!fs.existsSync(filePath)) {
      return { users: [] }
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`Error reading users for ranch ${ranchId}:`, error)
    return { users: [] }
  }
}

/**
 * Write users for a specific ranch
 */
const writeRanchUsers = (ranchId, data) => {
  try {
    const dirPath = path.join(__dirname, 'data', ranchId)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    const filePath = path.join(dirPath, 'users.json')
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error(`Error writing users for ranch ${ranchId}:`, error)
    throw error
  }
}

/**
 * Create a new ranch instance with default admin user
 */
const createRanchInstance = async (ranchId, adminUsername, adminPassword, companyName) => {
  // Create data directory structure
  const ranchDataDir = path.join(__dirname, 'data', ranchId)

  if (fs.existsSync(ranchDataDir)) {
    throw new Error('Ranch instance already exists')
  }

  fs.mkdirSync(ranchDataDir, { recursive: true })

  // Hash admin password
  const passwordHash = await hashPassword(adminPassword)

  // Create default users file with admin
  const usersData = {
    users: [
      {
        username: adminUsername,
        password: passwordHash,
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    ]
  }

  writeRanchUsers(ranchId, usersData)

  // Create empty data files
  const emptyFiles = {
    'sensors.json': { sensors: [] },
    'cattle.json': { cattle: [] },
    'cameras.json': { cameras: [] },
    'pastures.json': { pastures: [] },
    'gates.json': { gates: [] },
    'config.json': {
      ranchName: companyName,
      countyGisApiUrl: null,
      createdAt: new Date().toISOString()
    }
  }

  for (const [filename, content] of Object.entries(emptyFiles)) {
    const filePath = path.join(ranchDataDir, filename)
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2))
  }

  // Create ranch metadata
  const metadataPath = path.join(__dirname, 'data', 'ranches.json')
  let ranches = { ranches: [] }

  if (fs.existsSync(metadataPath)) {
    ranches = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
  }

  ranches.ranches.push({
    ranchId,
    companyName,
    url: `https://ranch-${ranchId}.ranchos.app`,
    createdAt: new Date().toISOString(),
    status: 'active'
  })

  fs.writeFileSync(metadataPath, JSON.stringify(ranches, null, 2))

  return {
    ranchId,
    companyName,
    url: `https://ranch-${ranchId}.ranchos.app`,
    adminUsername
  }
}

module.exports = {
  extractRanchId,
  ranchIdentifier,
  requireAuth,
  requireAdmin,
  generateToken,
  hashPassword,
  verifyPassword,
  readRanchUsers,
  writeRanchUsers,
  createRanchInstance,
  JWT_SECRET
}
