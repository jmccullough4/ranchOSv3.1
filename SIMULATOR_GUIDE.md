# RanchOS Simulator Guide

This guide explains how to use the RanchOS simulation system, which consists of two independent simulators that feed realistic data to the main RanchOS application.

## Overview

The RanchOS simulation architecture uses dedicated simulator processes that run independently and push data to the main backend server:

```
┌─────────────────────┐
│  Camera Simulator   │  Port 9090-9093
│  (Video Feeds)      │
└──────────┬──────────┘
           │
           │  HTTP Streams
           │
┌──────────▼──────────┐
│   RanchOS Backend   │  Port 8082
│   (Express Server)  │◄─────┐
└──────────┬──────────┘      │
           │                  │  POST /api/herd
           │  REST API        │  (Position Updates)
           │                  │
┌──────────▼──────────┐      │
│   React Frontend    │      │
│   (Vite Dev Server) │      │
└─────────────────────┘      │
                              │
                   ┌──────────┴──────────┐
                   │  Cattle Simulator   │  Port 9100
                   │  (Herd Movement)    │
                   └─────────────────────┘
```

## Components

### 1. Camera Stream Simulator (`simulator/camera-stream-server.js`)

Generates realistic video feeds for 4 security cameras with AI detection overlays.

**Features:**
- 4 independent camera feeds on ports 9090-9093
- Realistic scenes: gate, pasture, water trough, chute
- Animated moving objects (vehicles, cattle, workers)
- HUD overlays with timestamps, camera IDs, recording indicators
- Motion detection visualization
- Night vision mode
- Camera noise/grain effects

**Ports:**
- CAM1 (North Gate): http://localhost:9090
- CAM2 (South Pasture): http://localhost:9091
- CAM3 (East Water): http://localhost:9092
- CAM4 (West Chute): http://localhost:9093

**Endpoints per camera:**
- `/` - Full HTML page with video player
- `/embed` - Embed-friendly minimal HTML (for iframes)
- `/stream` - Raw JPEG frame stream
- `/health` - Health check and status

### 2. Cattle Herd Simulator (`simulator/cattle-simulator.js`)

Simulates realistic cattle herd movement with configurable behavior patterns.

**Features:**
- Realistic herd cohesion and clustering
- Stray cattle detection and tracking
- Boundary avoidance (stays within fence perimeter)
- Configurable movement patterns
- Health monitoring and vital signs
- Independent position management
- Periodic sync to main RanchOS backend

**Port:** http://localhost:9100

**Endpoints:**
- `GET /health` - Health check and status
- `GET /herd` - Current herd data with positions
- `GET /stats` - Simulation statistics
- `POST /config` - Update configuration
- `POST /reset` - Reset herd positions
- `POST /start` - Start simulation
- `POST /stop` - Stop simulation

**Configuration Parameters:**
- `totalCattleCount` - Number of cattle in herd (default: 50)
- `strayPercentage` - Percentage designated as strays (default: 10%)
- `clusterRadius` - Main herd clustering tightness (default: 0.01°)
- `strayRadius` - How far strays can wander (default: 0.05°)
- `movementSpeed` - Speed of position updates (default: 0.00018°)
- `movementLimit` - Max drift from anchor point (default: 0.0025°)
- `strayDistanceThreshold` - Distance to be considered stray (default: 0.01°)
- `boundaryAvoidanceStrength` - Fence avoidance strength (default: 0.3)
- `herdCohesion` - Attraction to herd center (default: 0.1)

## Running the Simulators

### Development Mode (All Services)

Start everything together with hot reload:

```bash
npm run dev
```

This runs:
- RanchOS backend server (port 8082)
- React frontend dev server (port 5173)
- Camera simulator (ports 9090-9093)
- Cattle simulator (port 9100)

### Individual Simulators

Run simulators independently:

```bash
# Camera simulator only
npm run cameras

# Cattle simulator only
npm run cattle

# Both simulators (without main app)
npm run simulators
```

### Production Mode

The simulators are designed for development use. For production, you would typically:
1. Replace camera feeds with real video streams
2. Replace cattle positions with actual GPS tracker data
3. Or continue using simulators as a fallback/demo mode

## Integration with Main Application

### Camera Integration

The main RanchOS server reads camera configurations from `server/cameras.json`:

```json
{
  "cameras": [
    {
      "id": "cam1",
      "name": "North Gate Entrance",
      "embedUrl": "http://localhost:9090/embed",
      "status": "online"
    }
  ]
}
```

The frontend `CamerasPanel` component uses these URLs to display live feeds in iframes.

### Cattle Integration

The cattle simulator pushes position updates to RanchOS via `POST /api/herd`:

```json
{
  "positions": [
    { "lat": 35.0844, "lon": -106.6504 }
  ],
  "cattle": [
    {
      "id": "3S-001",
      "earTag": "3S-001",
      "name": "Bessie",
      "lat": 35.0844,
      "lon": -106.6504,
      "isStray": false
    }
  ],
  "config": { ... },
  "timestamp": "2025-11-21T13:30:00.000Z"
}
```

The main server's `GET /api/herd` endpoint:
1. First checks if simulator data is available (`global.simulatorHerdData`)
2. If yes, returns simulator data directly
3. If no, falls back to internal simulation logic

This allows seamless switching between external simulator and internal fallback.

## Configuration

### Camera Simulator

Edit `simulator/camera-stream-server.js` to modify:
- Camera names and descriptions
- Scene types (gate, pasture, water, chute)
- Frame rate (FPS constant)
- Resolution (canvas dimensions)
- Animation speeds and behaviors

### Cattle Simulator

Configuration can be updated via:

1. **API endpoint:**
   ```bash
   curl -X POST http://localhost:9100/config \
     -H "Content-Type: application/json" \
     -d '{"totalCattleCount": 75, "strayPercentage": 15}'
   ```

2. **RanchOS backend endpoint:**
   ```bash
   curl -X POST http://localhost:8082/api/simulator/herd/config \
     -H "Content-Type: application/json" \
     -d '{"totalCattleCount": 75}'
   ```

3. **Edit defaults in code:**
   Modify the `herdConfig` object in `simulator/cattle-simulator.js`

## Monitoring

### Check Simulator Status

```bash
# Camera simulator
curl http://localhost:9090/health

# Cattle simulator
curl http://localhost:9100/health

# Main RanchOS server
curl http://localhost:8082/api/version
```

### View Cattle Statistics

```bash
# From simulator directly
curl http://localhost:9100/stats

# From RanchOS API
curl http://localhost:8082/api/simulator/herd/stats
```

### Watch Simulator Logs

The simulators output status messages to stdout:

```
✓ Pushed 50 cattle positions to RanchOS
✓ Herd positions updated from simulator: 50 cattle (2025-11-21T13:30:00.000Z)
```

## Troubleshooting

### Camera feeds not loading

1. Verify camera simulator is running:
   ```bash
   curl http://localhost:9090/health
   ```

2. Check `server/cameras.json` has correct localhost URLs

3. Verify frontend is requesting `embedUrl` field

4. Check browser console for CORS or network errors

### Cattle not moving on map

1. Verify cattle simulator is running:
   ```bash
   curl http://localhost:9100/health
   ```

2. Check RanchOS backend is receiving updates (watch server logs)

3. Verify pasture boundary is configured in RanchOS:
   ```bash
   curl http://localhost:8082/api/admin/pastures
   ```

4. Check frontend is polling `/api/herd` endpoint

### Simulators can't connect to RanchOS

1. Ensure RanchOS backend is running on port 8082

2. Set `RANCH_OS_URL` environment variable if using different port:
   ```bash
   RANCH_OS_URL=http://localhost:3000 npm run cattle
   ```

3. Check firewall settings aren't blocking localhost connections

### Canvas package errors (Camera simulator)

The camera simulator requires the `canvas` package with native dependencies:

**macOS:**
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
npm install
```

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
npm install
```

**Alpine Linux:**
```bash
apk add --no-cache build-base cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev
npm install
```

## Advanced Usage

### Custom Cattle Registry

The cattle simulator can load cattle data from `server/cattle.json`:

```json
[
  {
    "id": "3S-001",
    "earTag": "3S-001",
    "name": "Bessie",
    "breed": "Angus",
    "weight": 1200,
    "temperature": 101.5,
    "healthStatus": "healthy",
    "vaccines": [...]
  }
]
```

If this file exists, the simulator will use these cattle records and assign positions to them.

### Programmatic Control

You can control the cattle simulator via its API:

```javascript
// Reset herd to initial positions
await fetch('http://localhost:9100/reset', { method: 'POST' })

// Update configuration
await fetch('http://localhost:9100/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    movementSpeed: 0.0003,
    herdCohesion: 0.2
  })
})

// Get current herd data
const response = await fetch('http://localhost:9100/herd')
const data = await response.json()
console.log(`${data.herd.length} cattle tracked`)
```

### External GPS Integration

To replace the simulator with real GPS data:

1. Create a service that reads GPS tracker data
2. Transform data to match the simulator's format
3. POST to `http://localhost:8082/api/herd` with same structure
4. Stop the cattle simulator

The RanchOS backend will seamlessly accept real data using the same endpoint.

## Architecture Benefits

This simulator architecture provides:

1. **Separation of Concerns**: Simulation logic is isolated from application logic
2. **Independent Scaling**: Simulators can run on different machines if needed
3. **Hot Swapping**: Easy to switch between simulated and real data
4. **Development Flexibility**: Developers can work on frontend without real hardware
5. **Testing**: Realistic data for testing edge cases (strays, breaches, etc.)
6. **Fallback Mode**: Can use simulators as backup when real sensors fail

## See Also

- `CAMERA_QUICKSTART.md` - Detailed camera simulator setup
- `CATTLE_SIMULATION.md` - Cattle behavior algorithms
- `CLAUDE.md` - Main project documentation
- `README.md` - Getting started guide
