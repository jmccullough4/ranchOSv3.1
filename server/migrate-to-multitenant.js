/**
 * Migration Script: Single-Tenant to Multi-Tenant
 *
 * This script migrates existing data from the single-tenant structure
 * to the new multi-tenant structure with data isolation.
 *
 * Usage: node migrate-to-multitenant.js
 */

const fs = require('fs')
const path = require('path')
const bcrypt = require('bcrypt')

const SALT_ROUNDS = 10

async function migrate() {
  console.log('='.repeat(60))
  console.log('RanchOS Multi-Tenant Migration')
  console.log('='.repeat(60))

  // Create data directory structure
  const dataDir = path.join(__dirname, 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
    console.log('Created /server/data directory')
  }

  // Create demo ranch directory
  const demoRanchDir = path.join(dataDir, 'demo')
  if (!fs.existsSync(demoRanchDir)) {
    fs.mkdirSync(demoRanchDir, { recursive: true })
    console.log('Created demo ranch directory')
  }

  // Files to migrate
  const filesToMigrate = [
    'users.json',
    'sensors.json',
    'cattle.json',
    'cameras.json',
    'pastures.json',
    'config.json'
  ]

  // Migrate each file
  for (const filename of filesToMigrate) {
    const oldPath = path.join(__dirname, filename)
    const newPath = path.join(demoRanchDir, filename)

    if (fs.existsSync(oldPath)) {
      try {
        // Special handling for users.json to hash passwords
        if (filename === 'users.json') {
          const userData = JSON.parse(fs.readFileSync(oldPath, 'utf-8'))

          // Hash passwords if they're not already hashed
          for (const user of userData.users) {
            if (user.password && !user.password.startsWith('$2b$')) {
              console.log(`Hashing password for user: ${user.username}`)
              user.password = await bcrypt.hash(user.password, SALT_ROUNDS)
            }
          }

          fs.writeFileSync(newPath, JSON.stringify(userData, null, 2))
          console.log(`Migrated and secured ${filename}`)
        } else {
          fs.copyFileSync(oldPath, newPath)
          console.log(`Migrated ${filename}`)
        }
      } catch (error) {
        console.error(`Error migrating ${filename}:`, error.message)
      }
    } else {
      // Create empty file if it doesn't exist
      const emptyContent = getEmptyContent(filename)
      fs.writeFileSync(newPath, JSON.stringify(emptyContent, null, 2))
      console.log(`Created empty ${filename}`)
    }
  }

  // Create ranches registry
  const ranchesFile = path.join(dataDir, 'ranches.json')
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
  console.log('Created ranches registry')

  console.log('\n' + '='.repeat(60))
  console.log('Migration Complete!')
  console.log('='.repeat(60))
  console.log('\nDemo Ranch Details:')
  console.log('  Ranch ID: demo')
  console.log('  URL: http://localhost:8082?ranchId=demo')
  console.log('  (In production: https://ranch-demo.ranchos.app)')
  console.log('\nNext Steps:')
  console.log('  1. Test the demo ranch with existing credentials')
  console.log('  2. Create additional ranch instances via signup API')
  console.log('  3. Update frontend to use new authentication flow')
  console.log('='.repeat(60))
}

function getEmptyContent(filename) {
  const emptyStructures = {
    'users.json': { users: [] },
    'sensors.json': { sensors: [] },
    'cattle.json': { cattle: [] },
    'cameras.json': { cameras: [] },
    'pastures.json': { pastures: [] },
    'config.json': { countyGisApiUrl: null }
  }

  return emptyStructures[filename] || {}
}

// Run migration
migrate().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
