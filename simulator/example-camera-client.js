#!/usr/bin/env node

/**
 * Example Camera Sensor Client
 *
 * This example demonstrates how external simulators can interact with
 * the RanchOS camera sensor system.
 *
 * Usage:
 *   node simulator/example-camera-client.js
 */

const API_BASE = 'http://localhost:8082'

/**
 * Fetch all cameras from RanchOS
 */
async function getAllCameras() {
  const response = await fetch(`${API_BASE}/api/cameras`)
  const data = await response.json()
  return data.cameras
}

/**
 * Get camera list from admin endpoint
 */
async function getAdminCameras() {
  const response = await fetch(`${API_BASE}/api/admin/cameras`)
  const data = await response.json()
  return data.cameras
}

/**
 * Add a new camera to RanchOS
 */
async function addCamera(cameraData) {
  const response = await fetch(`${API_BASE}/api/admin/cameras`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cameraData)
  })
  const data = await response.json()
  return data.camera
}

/**
 * Update camera properties
 */
async function updateCamera(cameraId, updates) {
  const response = await fetch(`${API_BASE}/api/admin/cameras/${cameraId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })
  const data = await response.json()
  return data.camera
}

/**
 * Update camera location on map
 */
async function updateCameraLocation(cameraId, lat, lon) {
  const response = await fetch(`${API_BASE}/api/admin/cameras/${cameraId}/location`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon })
  })
  const data = await response.json()
  return data.camera
}

/**
 * Manually trigger AI detection on a camera
 */
async function triggerDetection(cameraId) {
  const response = await fetch(`${API_BASE}/api/admin/cameras/${cameraId}/detect`, {
    method: 'POST'
  })
  const data = await response.json()
  return data.detection
}

/**
 * Delete a camera
 */
async function deleteCamera(cameraId) {
  const response = await fetch(`${API_BASE}/api/admin/cameras/${cameraId}`, {
    method: 'DELETE'
  })
  const data = await response.json()
  return data.status === 'ok'
}

/**
 * Monitor cameras for predator detections
 */
async function monitorCamerasForPredators(intervalSeconds = 10) {
  console.log(`\nMonitoring cameras for predators (polling every ${intervalSeconds}s)...\n`)

  setInterval(async () => {
    try {
      const cameras = await getAllCameras()

      cameras.forEach(camera => {
        if (camera.predator_detected) {
          const detection = camera.aiDetection.detections[0]
          console.log(`🚨 ALERT on ${camera.name}:`)
          console.log(`   Detected: ${detection.object}`)
          console.log(`   Category: ${detection.category}`)
          console.log(`   Alert Level: ${detection.alertLevel}`)
          console.log(`   Confidence: ${(detection.confidence * 100).toFixed(1)}%`)
          console.log(`   Timestamp: ${detection.timestamp}`)
          console.log(`   Location: ${camera.lat}, ${camera.lon}\n`)
        }
      })
    } catch (error) {
      console.error('Error monitoring cameras:', error.message)
    }
  }, intervalSeconds * 1000)
}

/**
 * Display camera status summary
 */
async function displayCameraSummary() {
  const cameras = await getAllCameras()

  console.log('\n=== Camera Status Summary ===\n')

  cameras.forEach(camera => {
    console.log(`${camera.camera.toUpperCase()}: ${camera.name}`)
    console.log(`  Status: ${camera.status}`)
    console.log(`  Location: ${camera.lat}, ${camera.lon}`)
    console.log(`  Alert Level: ${camera.aiDetection.alertLevel}`)
    console.log(`  Last Scan: ${camera.aiDetection.lastScan}`)

    if (camera.aiDetection.detections.length > 0) {
      const detection = camera.aiDetection.detections[0]
      console.log(`  Latest Detection: ${detection.object} (${(detection.confidence * 100).toFixed(1)}% confidence)`)
    }

    console.log('')
  })

  const onlineCount = cameras.filter(c => c.status === 'online').length
  const predatorCount = cameras.filter(c => c.predator_detected).length

  console.log(`Total Cameras: ${cameras.length}`)
  console.log(`Online: ${onlineCount}`)
  console.log(`With Predator Detections: ${predatorCount}`)
  console.log('')
}

/**
 * Example: Add custom cameras programmatically
 */
async function setupCustomCameras() {
  console.log('\n=== Setting Up Custom Cameras ===\n')

  const customCameras = [
    {
      name: 'Barn Entrance',
      lat: 36.7795,
      lon: -119.4175,
      youtubeUrl: 'https://www.youtube.com/watch?v=eJ7ZkQ5TC08'
    },
    {
      name: 'Calving Pen',
      lat: 36.7770,
      lon: -119.4185,
      youtubeUrl: 'https://www.youtube.com/watch?v=sV-ojmLwMt0'
    }
  ]

  for (const cameraData of customCameras) {
    try {
      const camera = await addCamera(cameraData)
      console.log(`✓ Added camera: ${camera.name} (${camera.id})`)
    } catch (error) {
      console.error(`✗ Failed to add camera ${cameraData.name}:`, error.message)
    }
  }

  console.log('')
}

/**
 * Example: Test detection on all cameras
 */
async function testAllCameraDetections() {
  console.log('\n=== Testing AI Detection on All Cameras ===\n')

  const cameras = await getAdminCameras()

  for (const camera of cameras) {
    console.log(`Testing ${camera.name} (${camera.id})...`)

    // Try multiple times to get a detection
    let foundDetection = false
    for (let i = 0; i < 20; i++) {
      const detection = await triggerDetection(camera.id)

      if (detection.detections.length > 0) {
        const det = detection.detections[0]
        console.log(`  ✓ Detected: ${det.object} (${det.category}, ${(det.confidence * 100).toFixed(1)}% confidence)`)
        foundDetection = true
        break
      }
    }

    if (!foundDetection) {
      console.log(`  - No detections in 20 attempts (this is normal - detection is probabilistic)`)
    }
  }

  console.log('')
}

/**
 * Example: Update camera YouTube feeds
 */
async function updateCameraFeeds() {
  console.log('\n=== Updating Camera YouTube Feeds ===\n')

  // Example: Update first camera with a new YouTube live stream
  const cameras = await getAdminCameras()

  if (cameras.length > 0) {
    const camera = cameras[0]
    const newUrl = 'https://www.youtube.com/watch?v=eJ7ZkQ5TC08'

    const updated = await updateCamera(camera.id, {
      youtubeUrl: newUrl
    })

    console.log(`✓ Updated ${updated.name} YouTube feed`)
    console.log(`  New URL: ${updated.youtubeUrl}`)
    console.log(`  Embed URL: ${updated.embedUrl}`)
    console.log('')
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'summary'

  try {
    switch (command) {
      case 'summary':
        await displayCameraSummary()
        break

      case 'monitor':
        await monitorCamerasForPredators(10)
        break

      case 'setup':
        await setupCustomCameras()
        await displayCameraSummary()
        break

      case 'test':
        await testAllCameraDetections()
        break

      case 'update':
        await updateCameraFeeds()
        break

      case 'add':
        const name = process.argv[3] || 'New Camera'
        const lat = parseFloat(process.argv[4]) || 36.7800
        const lon = parseFloat(process.argv[5]) || -119.4200
        const url = process.argv[6] || 'https://www.youtube.com/watch?v=eJ7ZkQ5TC08'

        const camera = await addCamera({ name, lat, lon, youtubeUrl: url })
        console.log('\n✓ Camera added successfully:')
        console.log(JSON.stringify(camera, null, 2))
        console.log('')
        break

      default:
        console.log('\nUsage: node example-camera-client.js [command]')
        console.log('\nCommands:')
        console.log('  summary  - Display camera status summary (default)')
        console.log('  monitor  - Monitor cameras for predator detections')
        console.log('  setup    - Add example custom cameras')
        console.log('  test     - Test AI detection on all cameras')
        console.log('  update   - Update camera YouTube feeds')
        console.log('  add <name> <lat> <lon> <youtubeUrl> - Add a camera')
        console.log('\nExamples:')
        console.log('  node example-camera-client.js summary')
        console.log('  node example-camera-client.js monitor')
        console.log('  node example-camera-client.js add "Barn Camera" 36.7800 -119.4200 "https://youtube.com/watch?v=..."')
        console.log('')
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error('Make sure the RanchOS server is running on http://localhost:8082\n')
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

// Export for use as a module
module.exports = {
  getAllCameras,
  getAdminCameras,
  addCamera,
  updateCamera,
  updateCameraLocation,
  triggerDetection,
  deleteCamera,
  monitorCamerasForPredators,
  displayCameraSummary,
  setupCustomCameras,
  testAllCameraDetections,
  updateCameraFeeds
}
