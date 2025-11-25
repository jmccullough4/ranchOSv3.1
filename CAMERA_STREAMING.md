# Camera Streaming Simulation System

## Overview

The RanchOS camera streaming system simulates 4 security camera feeds that serve live video streams on localhost ports 9090-9093. Each camera generates realistic ranch surveillance footage with dynamic elements, motion detection overlays, and authentic security camera HUD displays.

## Architecture

### Components

1. **Camera Stream Server** (`simulator/camera-stream-server.js`)
   - Express-based HTTP servers on ports 9090-9093
   - Canvas-based video frame generation at 30 FPS
   - Real-time rendering with dynamic scene elements

2. **Camera Configuration** (`server/cameras.json`)
   - Camera metadata (ID, name, description, capabilities)
   - Embed URLs pointing to localhost ports
   - AI detection profiles and settings

3. **Frontend Integration** (`frontend/src/components/CamerasPanel.jsx`)
   - Displays camera feeds in iframe embeds
   - Shows camera status and AI detection alerts
   - Expandable modal for full-screen viewing

## Camera Details

### CAM1 - North Gate Entrance (Port 9090)
- **Scene**: Gate entrance with vehicle detection
- **Features**: Night vision, motion detection, license plate recognition
- **Dynamic Elements**: Vehicles occasionally passing through gate
- **Resolution**: 1280x720 (720p HD)

### CAM2 - South Pasture Perimeter (Port 9091)
- **Scene**: Open pasture with wandering cattle
- **Features**: Night vision, predator detection, livestock counting
- **Dynamic Elements**: 3 cattle moving randomly across pasture
- **Resolution**: 1280x720 (720p HD)

### CAM3 - East Water Trough Monitor (Port 9092)
- **Scene**: Water station with cattle drinking
- **Features**: Night vision, behavior analysis
- **Dynamic Elements**: Cattle at water trough with subtle movements
- **Resolution**: 1280x720 (720p HD)

### CAM4 - West Chute Station (Port 9093)
- **Scene**: Chute area with occasional worker activity
- **Features**: Person detection, operational safety monitoring
- **Dynamic Elements**: Workers appearing periodically for equipment checks
- **Resolution**: 1280x720 (720p HD)

## Running the Camera Simulator

### Development Mode (Integrated)

Run all services together including camera feeds:

```bash
npm run dev
```

This starts:
- Frontend on `http://localhost:5173`
- Backend API on `http://localhost:8082`
- Camera feeds on ports 9090-9093

### Camera Simulator Only

Run just the camera streaming servers:

```bash
npm run cameras
```

Or directly:

```bash
node simulator/camera-stream-server.js
```

### Access Camera Feeds

Once running, access camera feeds at:

- CAM1: http://localhost:9090
- CAM2: http://localhost:9091
- CAM3: http://localhost:9092
- CAM4: http://localhost:9093

### Embed URLs (for iframes)

- CAM1: http://localhost:9090/embed
- CAM2: http://localhost:9091/embed
- CAM3: http://localhost:9092/embed
- CAM4: http://localhost:9093/embed

### Stream Endpoints (raw JPEG frames)

- CAM1: http://localhost:9090/stream
- CAM2: http://localhost:9091/stream
- CAM3: http://localhost:9092/stream
- CAM4: http://localhost:9093/stream

### Health Check

```bash
curl http://localhost:9090/health
```

Returns:
```json
{
  "status": "online",
  "camera": "cam1",
  "name": "North Gate Entrance",
  "frameCount": 1234,
  "uptime": 123.456
}
```

## Video Generation Details

### Frame Generation Pipeline

1. **Background Rendering**: Scene-specific background colors and gradients
2. **Static Elements**: Gates, fences, structures, water troughs
3. **Dynamic Objects**: Moving cattle, vehicles, workers with realistic physics
4. **Motion Detection Boxes**: Green bounding boxes around detected objects
5. **Camera Noise**: Subtle grain effect for realism
6. **HUD Overlay**: Camera ID, timestamp, recording indicator, status icons

### HUD Display Elements

- **Top Bar**:
  - Camera ID (green, bold monospace)
  - Camera name (white)
  - Recording indicator (red pulsing dot)
  - Night vision indicator (when active)
  - Motion detection status

- **Bottom Bar**:
  - Current timestamp (MM/DD/YYYY HH:MM:SS)
  - Frame counter (8-digit zero-padded)

### Dynamic Scene Behaviors

#### Gate Scene (CAM1)
- Vehicles enter from left edge randomly (0.2% chance per frame)
- Vehicle travels across screen at 1-3 pixels per frame
- Green detection box with "VEHICLE DETECTED" label
- Gate structure visible throughout

#### Pasture Scene (CAM2)
- 3 cattle wandering with random walk algorithm
- Each cattle has independent direction and speed
- Periodic direction changes for natural movement
- Boundary constraints keep cattle in frame

#### Water Scene (CAM3)
- Static cattle at water trough
- Subtle swaying motion while drinking
- Water trough structure always visible

#### Chute Scene (CAM4)
- Worker appears randomly (0.3% chance per frame)
- Orange detection box with "PERSON DETECTED" label
- Worker performs inspection movements
- Worker disappears after random interval

### Night Vision Mode

Automatically activates during night hours (before 6 AM or after 8 PM):
- Green-tinted background (#0a2f1a)
- "NIGHT VISION" indicator in HUD
- Only applies to cameras with `nightVision: true`

## Integration with Main Dashboard

### Frontend Camera Panel

The CamerasPanel component displays camera feeds in a grid:

```jsx
<CamerasPanel
  cameras={cameras}
  onOpenCamera={handleOpenCamera}
  collapsed={camerasCollapsed}
  onToggle={toggleCameras}
/>
```

### Modal Full-Screen View

Click any camera thumbnail to open full-screen modal with:
- Large iframe embed
- Camera name and description
- AI detection alerts
- Real-time status indicators

### Data Flow

1. Frontend polls `/api/cameras` every 10 seconds
2. Backend reads `server/cameras.json` configuration
3. Backend simulates AI detections based on detection profiles
4. Frontend receives camera metadata with embed URLs
5. Frontend renders iframes pointing to `http://localhost:909X/embed`
6. Camera servers generate and serve frames continuously

## Customization

### Adding New Scene Types

Edit `simulator/camera-stream-server.js` and add scene logic:

```javascript
case 'new_scene':
  // Initialize moving objects
  this.movingObjects.push({
    type: 'custom_object',
    x: 100,
    y: 200,
    speed: 1.5,
    active: true
  })
  break
```

### Adjusting Frame Rate

Modify the FPS constant:

```javascript
const FPS = 30  // Frames per second (default: 30)
```

Lower FPS reduces CPU usage but makes motion less smooth.

### Changing Camera Ports

Edit the CAMERAS array:

```javascript
{
  id: 'cam1',
  port: 9090,  // Change to desired port
  name: 'Camera Name',
  // ...
}
```

**Important**: Also update corresponding entries in `server/cameras.json`.

### Modifying HUD Appearance

Edit the `drawOverlay()` method in `CameraFrameGenerator`:

```javascript
drawOverlay() {
  const ctx = this.ctx

  // Change colors
  ctx.fillStyle = '#00ff00'  // Green text

  // Change fonts
  ctx.font = 'bold 24px monospace'

  // Add custom elements
  ctx.fillText('CUSTOM TEXT', x, y)
}
```

## Performance Considerations

### CPU Usage

Each camera generates 30 frames per second using Canvas rendering:
- 4 cameras × 30 FPS = 120 frames/second total
- Typical CPU usage: 15-25% on modern systems

### Memory Usage

- Each camera maintains ~10MB of state
- Total memory footprint: ~50-75MB for all cameras

### Optimization Tips

1. **Reduce Frame Rate**: Lower FPS to 15 for less CPU usage
2. **Simplify Scenes**: Remove complex drawing operations
3. **Limit Dynamic Objects**: Fewer moving elements = better performance
4. **Disable Noise Effect**: Comment out `addNoise()` calls

## Troubleshooting

### Cameras Not Loading

**Symptom**: Frontend shows "Feed unavailable"

**Solutions**:
1. Verify camera simulator is running: `npm run cameras`
2. Check ports are available (not in use by other services)
3. Confirm `server/cameras.json` has correct localhost URLs
4. Check browser console for CORS or iframe errors

### Canvas Module Not Found

**Symptom**: `Error: Cannot find module 'canvas'`

**Solution**: Install dependencies:
```bash
npm install
```

The `canvas` package requires system libraries:
- macOS: `brew install pkg-config cairo pango libpng jpeg giflib librsvg`
- Ubuntu: `sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`

### High CPU Usage

**Symptom**: System fans running loudly, high CPU in Activity Monitor

**Solutions**:
1. Reduce FPS: Change `const FPS = 30` to `const FPS = 15`
2. Run fewer cameras (comment out entries in CAMERAS array)
3. Simplify scene rendering (remove complex drawing operations)

### Port Already In Use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::9090`

**Solutions**:
1. Kill process using port: `lsof -ti:9090 | xargs kill`
2. Change camera port in `simulator/camera-stream-server.js`
3. Update corresponding entry in `server/cameras.json`

## API Reference

### GET /

Returns HTML page with auto-refreshing camera feed.

**Response**: HTML page

### GET /embed

Returns minimal HTML page suitable for iframe embedding.

**Response**: HTML page (no headers, just video feed)

### GET /stream

Returns single JPEG frame from camera feed.

**Response**: `image/jpeg`

**Usage**: Can be polled continuously for MJPEG-style streaming

### GET /health

Returns camera status and metrics.

**Response**:
```json
{
  "status": "online",
  "camera": "cam1",
  "name": "North Gate Entrance",
  "frameCount": 1234,
  "uptime": 123.456
}
```

## Future Enhancements

### Planned Features

- [ ] Configurable detection zones (user-defined areas of interest)
- [ ] PTZ camera simulation (pan, tilt, zoom controls)
- [ ] Multiple detection confidence levels
- [ ] Timestamp-based event triggering
- [ ] Recording/playback simulation
- [ ] Thermal imaging mode for specific cameras
- [ ] Weather effects (rain, fog, snow)
- [ ] Day/night transition animations

### Advanced Customization

- Export recorded frame sequences as video files
- WebRTC streaming for lower latency
- GPU-accelerated rendering with WebGL
- Multi-camera view synchronization
- Alert-triggered snapshot capture

## License

Part of RanchOS Demo Application - 3 Strands Cattle Co., LLC
