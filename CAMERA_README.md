# Camera Sensor System

A complete IoT camera sensor simulation with AI/ML-powered predator detection for RanchOS.

## Quick Start

### 1. Start the Server
```bash
npm run dev
# or
node server/index.js
```

### 2. View Cameras
```bash
curl http://localhost:8082/api/cameras | jq
```

### 3. Test AI Detection
```bash
curl -X POST http://localhost:8082/api/admin/cameras/cam1/detect | jq '.detection'
```

### 4. Add a Camera
```bash
curl -X POST http://localhost:8082/api/admin/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Camera",
    "lat": 36.78,
    "lon": -119.42,
    "youtubeUrl": "https://youtube.com/watch?v=VIDEO_ID"
  }' | jq
```

## Features

- Configure unlimited cameras with YouTube video feeds
- AI/ML predator detection (coyotes, wolves, bears, mountain lions, etc.)
- Threat detection (unauthorized vehicles, people)
- Real-time alert levels (none, low, medium, high, critical)
- Location-based camera placement
- Time-based detection patterns (more active at dawn/dusk)
- Full REST API for camera management
- Confidence scores and bounding boxes

## Default Cameras

The system ships with 4 pre-configured cameras:

1. **North Pasture Perimeter** (cam1) - Positioned at 36.7803, -119.4179
2. **South Gate Entrance** (cam2) - Positioned at 36.7763, -119.4181
3. **East Water Trough** (cam3) - Positioned at 36.7785, -119.4149
4. **West Fence Line** (cam4) - Positioned at 36.7779, -119.4209

## API Endpoints

### Public
- `GET /api/cameras` - Get all cameras with AI detection data

### Admin
- `GET /api/admin/cameras` - List all cameras
- `POST /api/admin/cameras` - Add new camera
- `PUT /api/admin/cameras/:id` - Update camera
- `DELETE /api/admin/cameras/:id` - Delete camera
- `PUT /api/admin/cameras/:id/location` - Update GPS coordinates
- `POST /api/admin/cameras/:id/detect` - Trigger AI detection (testing)

## AI Detection Categories

- **PREDATOR**: coyote, wolf, bear, mountain_lion, bobcat, fox
- **THREAT**: unauthorized_vehicle, unauthorized_person, unknown_animal
- **LIVESTOCK**: cattle, horse, deer, elk
- **NORMAL**: bird, rabbit, vegetation_movement, weather_event

## Alert Levels

- **CRITICAL**: Bear, mountain lion detected
- **HIGH**: Wolf, coyote, unauthorized vehicle
- **MEDIUM**: Fox, bobcat, unauthorized person
- **LOW**: Minor detections
- **NONE**: Normal activity or no detection

## Configuration

Edit `/Users/jay.mccullough/Desktop/Coding/ranchOSv2/server/cameras.json`:

```json
{
  "cameras": [
    {
      "id": "cam1",
      "name": "North Pasture Perimeter",
      "lat": 36.7803,
      "lon": -119.4179,
      "status": "online",
      "youtubeUrl": "https://youtube.com/watch?v=VIDEO_ID",
      "embedUrl": "https://youtube.com/embed/VIDEO_ID?...",
      "type": "camera",
      "createdAt": "2024-01-15T08:30:00.000Z",
      "aiDetection": {
        "enabled": true,
        "lastScan": null,
        "detections": []
      }
    }
  ]
}
```

## Example Client

Use the provided example client to interact with cameras:

```bash
# Display camera summary
node simulator/example-camera-client.js summary

# Monitor for predator detections
node simulator/example-camera-client.js monitor

# Test AI detection on all cameras
node simulator/example-camera-client.js test

# Add a camera
node simulator/example-camera-client.js add \
  "Barn Camera" 36.78 -119.42 \
  "https://youtube.com/watch?v=VIDEO_ID"
```

## Detection Simulation

Detection is probabilistic and time-based:

- **Dawn (5-7am)**: 18% detection probability
- **Dusk (6-9pm)**: 18% detection probability
- **Other times**: 8% detection probability

Detection results include:
- Category (PREDATOR, THREAT, LIVESTOCK, NORMAL)
- Object type (coyote, wolf, bear, etc.)
- Confidence score (0.60-0.98)
- Alert level (none, low, medium, high, critical)
- Bounding box coordinates (for UI visualization)
- Timestamp

## Example Response

```json
{
  "camera": "cam1",
  "name": "North Pasture Perimeter",
  "status": "online",
  "predator_detected": true,
  "location": "North Pasture Perimeter",
  "embedUrl": "https://youtube.com/embed/...",
  "youtubeUrl": "https://youtube.com/watch?v=...",
  "lat": 36.7803,
  "lon": -119.4179,
  "aiDetection": {
    "enabled": true,
    "lastScan": "2024-01-15T18:45:23.000Z",
    "alertLevel": "high",
    "confidence": 0.873,
    "detections": [
      {
        "timestamp": "2024-01-15T18:45:23.000Z",
        "category": "PREDATOR",
        "object": "coyote",
        "confidence": 0.873,
        "alertLevel": "high",
        "boundingBox": {
          "x": 234,
          "y": 156,
          "width": 180,
          "height": 120
        }
      }
    ]
  }
}
```

## Documentation

- **CAMERA_QUICKSTART.md** - Quick start guide
- **CAMERA_SENSORS.md** - Complete technical documentation
- **CAMERA_ARCHITECTURE.md** - Architecture diagrams
- **CAMERA_IMPLEMENTATION_SUMMARY.md** - Implementation details

## Integration

The camera system integrates seamlessly with:

1. **CamerasPanel.jsx** - Existing UI component automatically works
2. **MapPanel.jsx** - Display cameras on map using lat/lon coordinates
3. **Simulator** - External simulators can add/update/delete cameras
4. **RanchOS Backend** - Follows existing sensor patterns

## Troubleshooting

**Cameras not showing?**
- Ensure `server/cameras.json` exists
- Verify server is running on port 8082
- Check for JSON syntax errors in configuration

**YouTube videos not playing?**
- Verify video is public and allows embedding
- Test embed URL in a browser
- Try a different video

**No AI detections?**
- Detection is probabilistic - keep polling
- Try manual trigger: `POST /api/admin/cameras/:id/detect`
- Check `aiDetection.enabled` is `true`

## Files

### Created
- `/Users/jay.mccullough/Desktop/Coding/ranchOSv2/server/cameras.json`
- `/Users/jay.mccullough/Desktop/Coding/ranchOSv2/simulator/example-camera-client.js`
- `/Users/jay.mccullough/Desktop/Coding/ranchOSv2/CAMERA_*.md`

### Modified
- `/Users/jay.mccullough/Desktop/Coding/ranchOSv2/server/index.js` - Added camera functionality

## License

Part of RanchOS - 3 Strands Cattle Co., LLC

## Support

See documentation files for detailed information or report issues on GitHub.
