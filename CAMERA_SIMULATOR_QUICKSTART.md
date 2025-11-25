# Camera Simulator - Quick Start Guide

## 1-Minute Overview

The camera simulator provides 6 pre-configured IP cameras with intelligent AI detection for demo purposes.

## Quick Test (3 commands)

```bash
# Start server
npm start

# Import all cameras
curl -X POST http://localhost:8082/api/simulator/cameras/import-all

# View cameras with AI detection
curl http://localhost:8082/api/cameras | python3 -m json.tool
```

## Available Cameras

| ID | Name | Location | AI Focus |
|----|------|----------|----------|
| sim-cam-north-gate | North Gate Entrance | North | Vehicles |
| sim-cam-south-pasture | South Pasture Perimeter | South | Predators |
| sim-cam-east-water | East Water Trough | East | Livestock |
| sim-cam-west-chute | West Chute Station | West | Personnel |
| sim-cam-central-ptz | Central Ranch Overview | Center | General |
| sim-cam-barn-interior | Barn Interior | Barn | Livestock |

## API Endpoints

```bash
# List available cameras
GET /api/simulator/cameras

# Import single camera
POST /api/simulator/cameras/import/sim-cam-north-gate

# Import all cameras
POST /api/simulator/cameras/import-all

# Get simulator status
GET /api/simulator/cameras/status

# View active cameras (with AI detection)
GET /api/cameras
```

## Detection Patterns

- **Dawn/Dusk** (5-7am, 6-9pm): More predator detections
- **Work Hours** (8am-4pm): More personnel at operational areas
- **Feeding Time** (6-8am, 4-5pm): More livestock at water/feed stations
- **Night**: Reduced detection for non-night-vision cameras

## Alert Levels

- **CRITICAL**: Bear, mountain lion detected
- **HIGH**: Wolf, coyote, unauthorized vehicle
- **MEDIUM**: Bobcat, unauthorized person
- **LOW/NONE**: Normal activity

## UI Integration

```jsx
// Import cameras in admin UI
const importAll = async () => {
  const response = await fetch('/api/simulator/cameras/import-all', {
    method: 'POST'
  })
  const result = await response.json()
  console.log(result.message)
}

// Poll for camera updates
useEffect(() => {
  const fetchCameras = async () => {
    const response = await fetch('/api/cameras')
    const data = await response.json()
    setCameras(data.cameras)
  }

  fetchCameras()
  const interval = setInterval(fetchCameras, 5000)
  return () => clearInterval(interval)
}, [])
```

## Files

- **Code**: server/index.js (lines 1593-2116)
- **Data**: server/cameras.json
- **Full Docs**: CAMERA_SIMULATOR_GUIDE.md
- **UI Reference**: CAMERA_SIMULATOR_UI_REFERENCE.md

## Detection Example

```json
{
  "camera": "cam2",
  "name": "South Pasture Perimeter",
  "status": "online",
  "predator_detected": true,
  "detectionProfile": "perimeter",
  "aiDetection": {
    "enabled": true,
    "lastScan": "2025-11-21T00:34:01.150Z",
    "alertLevel": "high",
    "confidence": 0.842,
    "detections": [
      {
        "category": "PREDATOR",
        "object": "coyote",
        "confidence": 0.842,
        "alertLevel": "high",
        "boundingBox": { "x": 0.35, "y": 0.42, "width": 0.28, "height": 0.31 }
      }
    ]
  }
}
```

## Common Tasks

### Reset All Cameras
```bash
echo '{"cameras": []}' > server/cameras.json
```

### Import Specific Camera
```bash
curl -X POST http://localhost:8082/api/simulator/cameras/import/sim-cam-north-gate \
  -H "Content-Type: application/json" \
  -d '{"customName": "My Gate Camera"}'
```

### Check Import Status
```bash
curl http://localhost:8082/api/simulator/cameras/status | python3 -m json.tool
```

## Troubleshooting

**No cameras showing?**
- Run import-all endpoint
- Check server/cameras.json exists and is valid JSON
- Verify server is running on port 8082

**Detection always empty?**
- Normal - detection is probabilistic (8-18% chance)
- Wait for dawn/dusk hours for more detections
- Perimeter camera has highest predator detection rate

**Positions are null?**
- Configure ranch boundary in Admin Panel > Map Editor
- Or manually set positions via PUT /api/admin/cameras/:id/location

## Next Steps

1. Import cameras: POST /api/simulator/cameras/import-all
2. Add import button to Admin UI
3. Show cameras on map
4. Display AI detections in real-time
5. Set up alerts for CRITICAL/HIGH detections

## Full Documentation

- **CAMERA_SIMULATOR_GUIDE.md** - Complete technical reference
- **CAMERA_SIMULATOR_UI_REFERENCE.md** - UI integration examples
- **CAMERA_SIMULATOR_SUMMARY.md** - Implementation overview
