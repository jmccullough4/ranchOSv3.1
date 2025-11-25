#!/usr/bin/env node

/**
 * RanchOS Camera Stream Simulator
 *
 * This server simulates 4 security camera feeds on localhost ports 9090-9093.
 * Each camera generates a realistic live video feed with overlays showing:
 * - Camera ID and location
 * - Timestamp
 * - Simulated motion detection boxes
 * - Dynamic scene elements (moving objects, lighting changes)
 *
 * The feeds are served as HTML5 video streams that work with iframe embedding.
 */

const express = require('express')
const fs = require('fs')
const path = require('path')

// Graceful canvas import with helpful error messages
let createCanvas
try {
  const Canvas = require('canvas')
  createCanvas = Canvas.createCanvas
} catch (err) {
  console.error('\n❌ ERROR: canvas package not installed or missing native dependencies!\n')
  console.error('The camera streaming system requires the canvas package to be properly installed.\n')
  console.error('STEP 1: Install native dependencies for your platform:')
  console.error('  macOS:         brew install pkg-config cairo pango libpng jpeg giflib librsvg')
  console.error('  Ubuntu/Debian: sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev')
  console.error('  Alpine Linux:  apk add --no-cache build-base cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev\n')
  console.error('STEP 2: Install Node.js dependencies:')
  console.error('  npm install\n')
  console.error('For more details, see CAMERA_QUICKSTART.md\n')
  console.error('Original error:', err.message)
  process.exit(1)
}

// Configuration for each camera
const CAMERAS = [
  {
    id: 'cam1',
    port: 9090,
    name: 'North Gate Entrance',
    description: 'Main entrance monitoring - vehicle and personnel detection',
    scene: 'gate',
    nightVision: true
  },
  {
    id: 'cam2',
    port: 9091,
    name: 'South Pasture Perimeter',
    description: 'Wide-angle pasture monitoring - predator detection focus',
    scene: 'pasture',
    nightVision: true
  },
  {
    id: 'cam3',
    port: 9092,
    name: 'East Water Trough Monitor',
    description: 'Water station monitoring - livestock behavior analysis',
    scene: 'water',
    nightVision: true
  },
  {
    id: 'cam4',
    port: 9093,
    name: 'West Chute Station',
    description: 'Chute area monitoring - operational safety and logging',
    scene: 'chute',
    nightVision: false
  }
]

// Frame rate for video generation
const FPS = 30
const FRAME_INTERVAL = 1000 / FPS

/**
 * Generates a realistic camera frame with overlays and simulated content
 */
class CameraFrameGenerator {
  constructor(camera) {
    this.camera = camera
    this.frameCount = 0
    this.canvas = createCanvas(1280, 720)
    this.ctx = this.canvas.getContext('2d')

    // Animation state
    this.movingObjects = []
    this.initializeScene()
  }

  initializeScene() {
    // Initialize moving objects based on scene type
    switch (this.camera.scene) {
      case 'gate':
        // Occasional vehicles passing through
        this.movingObjects.push({
          type: 'vehicle',
          x: -100,
          y: 400,
          speed: Math.random() * 2 + 1,
          active: false,
          activationChance: 0.002
        })
        break

      case 'pasture':
        // Cattle wandering in distance
        for (let i = 0; i < 3; i++) {
          this.movingObjects.push({
            type: 'cattle',
            x: Math.random() * 1280,
            y: Math.random() * 400 + 200,
            speed: Math.random() * 0.5 + 0.2,
            direction: Math.random() * Math.PI * 2,
            active: true
          })
        }
        break

      case 'water':
        // Cattle approaching water trough
        this.movingObjects.push({
          type: 'cattle',
          x: 200,
          y: 300,
          speed: 0,
          active: true,
          drinking: true
        })
        break

      case 'chute':
        // Occasional activity
        this.movingObjects.push({
          type: 'worker',
          x: 640,
          y: 500,
          speed: 0,
          active: false,
          activationChance: 0.003
        })
        break
    }
  }

  generateFrame() {
    const ctx = this.ctx

    // Background - varies by scene
    this.drawBackground()

    // Draw scene-specific elements
    this.drawSceneElements()

    // Update and draw moving objects
    this.updateMovingObjects()
    this.drawMovingObjects()

    // Add camera noise/grain for realism
    this.addNoise()

    // Draw HUD overlay
    this.drawOverlay()

    this.frameCount++

    return this.canvas.toBuffer('image/jpeg', { quality: 0.8 })
  }

  drawBackground() {
    const ctx = this.ctx

    // Base color depends on scene and time of day
    const hour = new Date().getHours()
    const isNight = hour < 6 || hour > 20

    if (isNight && this.camera.nightVision) {
      // Night vision green
      ctx.fillStyle = '#0a2f1a'
    } else {
      // Daytime
      switch (this.camera.scene) {
        case 'gate':
          ctx.fillStyle = '#4a5568'
          break
        case 'pasture':
          ctx.fillStyle = '#2d5016'
          break
        case 'water':
          ctx.fillStyle = '#3d4f2f'
          break
        case 'chute':
          ctx.fillStyle = '#3a3226'
          break
      }
    }

    ctx.fillRect(0, 0, 1280, 720)

    // Add gradient for depth
    const gradient = ctx.createLinearGradient(0, 0, 0, 720)
    gradient.addColorStop(0, 'rgba(0,0,0,0.3)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1280, 720)
  }

  drawSceneElements() {
    const ctx = this.ctx

    switch (this.camera.scene) {
      case 'gate':
        // Draw gate structure
        ctx.strokeStyle = '#888888'
        ctx.lineWidth = 8
        ctx.beginPath()
        ctx.moveTo(500, 300)
        ctx.lineTo(500, 720)
        ctx.moveTo(780, 300)
        ctx.lineTo(780, 720)
        ctx.stroke()

        // Gate horizontal bar
        ctx.strokeStyle = '#666666'
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.moveTo(500, 350)
        ctx.lineTo(780, 350)
        ctx.stroke()
        break

      case 'pasture':
        // Draw fence line
        ctx.strokeStyle = '#555555'
        ctx.lineWidth = 2
        for (let x = 0; x < 1280; x += 100) {
          ctx.beginPath()
          ctx.moveTo(x, 600)
          ctx.lineTo(x, 650)
          ctx.stroke()
        }
        break

      case 'water':
        // Draw water trough
        ctx.fillStyle = '#2a3f5f'
        ctx.fillRect(450, 450, 380, 120)
        ctx.fillStyle = '#1a2f4f'
        ctx.fillRect(460, 460, 360, 100)
        break

      case 'chute':
        // Draw chute structure
        ctx.strokeStyle = '#666666'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(400, 300)
        ctx.lineTo(400, 720)
        ctx.moveTo(880, 300)
        ctx.lineTo(880, 720)
        ctx.stroke()
        break
    }
  }

  updateMovingObjects() {
    this.movingObjects.forEach(obj => {
      // Activation logic for inactive objects
      if (!obj.active && obj.activationChance) {
        if (Math.random() < obj.activationChance) {
          obj.active = true
          obj.x = -100
        }
        return
      }

      if (!obj.active) return

      // Update position based on object type
      switch (obj.type) {
        case 'vehicle':
          obj.x += obj.speed
          if (obj.x > 1380) {
            obj.active = false
            obj.x = -100
          }
          break

        case 'cattle':
          if (obj.drinking) {
            // Subtle movement while drinking
            obj.x += Math.sin(this.frameCount * 0.02) * 0.3
          } else {
            // Wandering movement
            obj.x += Math.cos(obj.direction) * obj.speed
            obj.y += Math.sin(obj.direction) * obj.speed

            // Change direction occasionally
            if (Math.random() < 0.01) {
              obj.direction += (Math.random() - 0.5) * 0.5
            }

            // Keep in bounds
            if (obj.x < 0 || obj.x > 1280) obj.direction = Math.PI - obj.direction
            if (obj.y < 200 || obj.y > 600) obj.direction = -obj.direction
          }
          break

        case 'worker':
          // Worker moves to check equipment
          obj.x += Math.sin(this.frameCount * 0.01) * 0.5
          if (Math.random() < 0.005) {
            obj.active = false
          }
          break
      }
    })
  }

  drawMovingObjects() {
    const ctx = this.ctx

    this.movingObjects.forEach(obj => {
      if (!obj.active) return

      // Draw detection box around object
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)'
      ctx.lineWidth = 2

      switch (obj.type) {
        case 'vehicle':
          // Draw simple vehicle shape
          ctx.fillStyle = '#444444'
          ctx.fillRect(obj.x, obj.y - 50, 150, 80)

          // Detection box
          ctx.strokeRect(obj.x - 10, obj.y - 60, 170, 100)

          // Label
          ctx.fillStyle = 'rgba(0, 255, 0, 0.8)'
          ctx.font = '14px monospace'
          ctx.fillText('VEHICLE DETECTED', obj.x, obj.y - 70)
          break

        case 'cattle':
          // Draw simple cattle shape
          ctx.fillStyle = '#5d4e37'
          ctx.beginPath()
          ctx.ellipse(obj.x, obj.y, 40, 25, 0, 0, Math.PI * 2)
          ctx.fill()

          // Detection box
          ctx.strokeRect(obj.x - 50, obj.y - 35, 100, 70)
          break

        case 'worker':
          // Draw person
          ctx.fillStyle = '#ff8800'
          ctx.fillRect(obj.x - 15, obj.y - 60, 30, 60)

          // Detection box
          ctx.strokeRect(obj.x - 25, obj.y - 70, 50, 80)

          // Label
          ctx.fillStyle = 'rgba(255, 165, 0, 0.8)'
          ctx.font = '14px monospace'
          ctx.fillText('PERSON DETECTED', obj.x - 60, obj.y - 80)
          break
      }
    })
  }

  addNoise() {
    // Add subtle camera noise for realism
    const imageData = this.ctx.getImageData(0, 0, 1280, 720)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < 0.02) {
        const noise = (Math.random() - 0.5) * 30
        data[i] += noise     // R
        data[i + 1] += noise // G
        data[i + 2] += noise // B
      }
    }

    this.ctx.putImageData(imageData, 0, 0)
  }

  drawOverlay() {
    const ctx = this.ctx

    // Semi-transparent black overlay for HUD
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, 1280, 60)
    ctx.fillRect(0, 660, 1280, 60)

    // Camera ID and name
    ctx.fillStyle = '#00ff00'
    ctx.font = 'bold 24px monospace'
    ctx.fillText(this.camera.id.toUpperCase(), 20, 40)

    ctx.fillStyle = '#ffffff'
    ctx.font = '18px sans-serif'
    ctx.fillText(this.camera.name, 120, 40)

    // Timestamp
    const now = new Date()
    const timestamp = now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    ctx.fillStyle = '#00ff00'
    ctx.font = '20px monospace'
    ctx.fillText(timestamp, 20, 700)

    // Recording indicator
    const isRecording = Math.floor(this.frameCount / 30) % 2 === 0
    if (isRecording) {
      ctx.fillStyle = '#ff0000'
      ctx.beginPath()
      ctx.arc(1240, 30, 12, 0, Math.PI * 2)
      ctx.fill()
    }

    // Status indicators
    ctx.fillStyle = '#00ff00'
    ctx.font = '14px monospace'
    ctx.fillText('REC', 1180, 35)

    // Frame counter
    ctx.fillStyle = '#888888'
    ctx.font = '16px monospace'
    ctx.fillText(`FRAME ${String(this.frameCount).padStart(8, '0')}`, 1000, 700)

    // Night vision indicator
    if (this.camera.nightVision) {
      const hour = new Date().getHours()
      const isNight = hour < 6 || hour > 20
      if (isNight) {
        ctx.fillStyle = '#00ff00'
        ctx.font = '16px monospace'
        ctx.fillText('NIGHT VISION', 850, 40)
      }
    }

    // Motion detection indicator
    const hasMotion = this.movingObjects.some(obj => obj.active)
    if (hasMotion) {
      ctx.fillStyle = '#ffaa00'
      ctx.font = '16px monospace'
      ctx.fillText('MOTION', 750, 40)
    }
  }
}

/**
 * Creates an Express server for a single camera feed
 */
function createCameraServer(camera) {
  const app = express()
  const generator = new CameraFrameGenerator(camera)

  // Serve HTML page with video player
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${camera.name} - ${camera.id.toUpperCase()}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: monospace;
          }
          .container {
            text-align: center;
          }
          img {
            max-width: 100%;
            height: auto;
            border: 2px solid #333;
          }
          .info {
            color: #00ff00;
            margin-top: 10px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img id="feed" src="/stream" alt="Camera Feed">
          <div class="info">
            ${camera.id.toUpperCase()} - ${camera.name}<br>
            ${camera.description}
          </div>
        </div>
        <script>
          // Reload image continuously for live feed effect
          const img = document.getElementById('feed');
          setInterval(() => {
            img.src = '/stream?' + new Date().getTime();
          }, ${FRAME_INTERVAL});
        </script>
      </body>
      </html>
    `)
  })

  // Serve MJPEG stream endpoint
  app.get('/stream', (req, res) => {
    const frame = generator.generateFrame()
    res.type('image/jpeg')
    res.send(frame)
  })

  // Embed-friendly endpoint (for iframes)
  app.get('/embed', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #000;
            overflow: hidden;
          }
          img {
            width: 100%;
            height: 100vh;
            object-fit: cover;
          }
        </style>
      </head>
      <body>
        <img id="feed" src="/stream" alt="Camera Feed">
        <script>
          const img = document.getElementById('feed');
          setInterval(() => {
            img.src = '/stream?' + new Date().getTime();
          }, ${FRAME_INTERVAL});
        </script>
      </body>
      </html>
    `)
  })

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'online',
      camera: camera.id,
      name: camera.name,
      frameCount: generator.frameCount,
      uptime: process.uptime()
    })
  })

  return app
}

/**
 * Start all camera servers
 */
function startAllCameras() {
  console.log('\n🎥 RanchOS Camera Stream Simulator Starting...\n')

  CAMERAS.forEach(camera => {
    const app = createCameraServer(camera)

    app.listen(camera.port, () => {
      console.log(`✓ ${camera.id.toUpperCase()}: ${camera.name}`)
      console.log(`  URL: http://localhost:${camera.port}`)
      console.log(`  Embed: http://localhost:${camera.port}/embed`)
      console.log(`  Stream: http://localhost:${camera.port}/stream`)
      console.log(`  Scene: ${camera.scene}`)
      console.log()
    })
  })

  console.log('All camera feeds are now live!')
  console.log('Press Ctrl+C to stop the simulator\n')
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down camera simulators...')
  process.exit(0)
})

// Start the servers
if (require.main === module) {
  startAllCameras()
}

module.exports = { CAMERAS, CameraFrameGenerator, createCameraServer }
