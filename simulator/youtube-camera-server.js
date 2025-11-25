#!/usr/bin/env node

/**
 * RanchOS YouTube Camera Server
 *
 * Dynamically serves YouTube videos on localhost ports based on server/cameras.json
 * Each camera gets its own Express server on its assigned port
 */

const express = require('express')
const fs = require('fs')
const path = require('path')

const CAMERAS_FILE = path.join(__dirname, '../server/cameras.json')
const activeServers = new Map()

/**
 * Convert YouTube URL to embed URL
 */
function convertToEmbedUrl(url) {
  if (!url) return null

  // Already an embed URL
  if (url.includes('/embed/')) {
    return url
  }

  // Extract video ID from various YouTube URL formats
  let videoId = null

  // Standard: https://www.youtube.com/watch?v=VIDEO_ID
  const standardMatch = url.match(/[?&]v=([^&]+)/)
  if (standardMatch) {
    videoId = standardMatch[1]
  }

  // Short: https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) {
    videoId = shortMatch[1]
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`
  }

  return null
}

/**
 * Create an Express server for a single camera
 */
function createCameraServer(camera) {
  const app = express()
  const embedUrl = convertToEmbedUrl(camera.youtubeUrl)

  if (!embedUrl) {
    console.error(`Invalid YouTube URL for camera ${camera.id}: ${camera.youtubeUrl}`)
    return null
  }

  // Main endpoint - full HTML page with YouTube embed
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${camera.name} - Camera Feed</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            background: #000;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          .camera-container {
            width: 100vw;
            height: 100vh;
            position: relative;
          }

          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }

          .camera-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            padding: 16px;
            background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
            color: white;
            z-index: 10;
            pointer-events: none;
          }

          .camera-id {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 1px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
          }

          .camera-name {
            font-size: 12px;
            opacity: 0.9;
            margin-top: 4px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
          }

          .rec-indicator {
            position: absolute;
            top: 16px;
            right: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 600;
            color: #ef4444;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
          }

          .rec-dot {
            width: 8px;
            height: 8px;
            background: #ef4444;
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        </style>
      </head>
      <body>
        <div class="camera-container">
          <div class="camera-overlay">
            <div class="camera-id">${camera.id.toUpperCase()}</div>
            <div class="camera-name">${camera.name}</div>
            <div class="rec-indicator">
              <div class="rec-dot"></div>
              <span>REC</span>
            </div>
          </div>
          <iframe
            src="${embedUrl}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
      </body>
      </html>
    `)
  })

  // Embed endpoint - just the iframe (for embedding in other pages)
  app.get('/embed', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; }
          body { background: #000; overflow: hidden; }
          iframe { width: 100%; height: 100vh; border: none; }
        </style>
      </head>
      <body>
        <iframe
          src="${embedUrl}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      </body>
      </html>
    `)
  })

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'online',
      camera: camera.id,
      name: camera.name,
      port: camera.port,
      youtubeUrl: camera.youtubeUrl
    })
  })

  return app
}

/**
 * Start servers for all cameras
 */
function startCameraServers() {
  // Read cameras from config
  let camerasData
  try {
    const data = fs.readFileSync(CAMERAS_FILE, 'utf-8')
    camerasData = JSON.parse(data)
  } catch (error) {
    console.error('Failed to read cameras.json:', error.message)
    camerasData = { cameras: [] }
  }

  const cameras = camerasData.cameras.filter(c => c.youtubeUrl && c.port)

  if (cameras.length === 0) {
    console.log('\n📹 No cameras configured yet.')
    console.log('Add cameras through the simulator UI at:')
    console.log('http://localhost:8082/simulator/index.html\n')
    return
  }

  console.log('\n🎥 RanchOS YouTube Camera Server Starting...\n')

  cameras.forEach(camera => {
    const app = createCameraServer(camera)
    if (!app) return

    try {
      const server = app.listen(camera.port, () => {
        console.log(`✓ ${camera.name}`)
        console.log(`  Port: ${camera.port}`)
        console.log(`  URL: http://localhost:${camera.port}`)
        console.log(`  Embed: http://localhost:${camera.port}/embed`)
        console.log(`  Video: ${camera.youtubeUrl}`)
        console.log()
      })

      activeServers.set(camera.port, server)
    } catch (error) {
      console.error(`❌ Failed to start camera ${camera.id} on port ${camera.port}:`, error.message)
    }
  })

  console.log('All cameras are now streaming!')
  console.log('Press Ctrl+C to stop\n')
}

/**
 * Stop all camera servers
 */
function stopAllServers() {
  console.log('\n\nShutting down camera servers...')
  activeServers.forEach((server, port) => {
    server.close()
    console.log(`Stopped server on port ${port}`)
  })
  process.exit(0)
}

// Watch for camera config changes and restart servers
fs.watch(CAMERAS_FILE, { persistent: false }, () => {
  console.log('\n📝 Camera configuration changed, restarting servers...\n')
  activeServers.forEach(server => server.close())
  activeServers.clear()
  setTimeout(startCameraServers, 500)
})

// Handle graceful shutdown
process.on('SIGINT', stopAllServers)
process.on('SIGTERM', stopAllServers)

// Start servers
if (require.main === module) {
  startCameraServers()
}

module.exports = { createCameraServer, convertToEmbedUrl }
