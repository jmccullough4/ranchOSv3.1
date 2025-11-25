# Camera Sensor System Documentation

## Overview

The Camera Sensor System is a comprehensive IoT simulation that provides realistic security camera monitoring with AI/ML-powered predator and threat detection. This system integrates seamlessly with the RanchOS architecture, treating cameras as first-class sensors alongside water, fence, and gate sensors.

## Architecture

### Core Components

1. **Camera Configuration** (`server/cameras.json`)
   - Persistent storage for camera sensor definitions
   - Includes metadata, locations, YouTube URLs, and AI detection settings

2. **Simulation Engine** (`server/index.js`)
   - Real-time AI/ML detection simulation
   - Time-based detection probability (higher at dawn/dusk)
   - Realistic confidence scores and alert levels

3. **REST API Endpoints**
   - Full CRUD operations for camera management
   - Real-time camera data with AI detections
   - Manual detection triggering for testing

## Camera Properties

Each camera sensor has the following properties:

```json
{
  "id": "cam1",
  "name": "North Pasture Perimeter",
  "lat": 36.7803,
  "lon": -119.4179,
  "status": "online",
  "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
  "embedUrl": "https://www.youtube.com/embed/VIDEO_ID?autoplay=1&mute=1...",
  "type": "camera",
  "createdAt": "2024-01-15T08:30:00.000Z",
  "aiDetection": {
    "enabled": true,
    "lastScan": "2024-01-15T14:23:45.000Z",
    "detections": [...]
  }
}
```

## AI/ML Predator Detection

### Detection Categories

The system simulates detection of the following categories:

- **PREDATOR**: coyote, wolf, bear, mountain_lion, bobcat, fox
- **THREAT**: unauthorized_vehicle, unauthorized_person, unknown_animal
- **LIVESTOCK**: cattle, horse, deer, elk
- **NORMAL**: bird, rabbit, vegetation_movement, weather_event

### Alert Levels

Alert levels are assigned based on threat severity:

- **NONE**: No detection or normal activity
- **LOW**: Minor detections (small predators, distant movement)
- **MEDIUM**: Notable detections (foxes, bobcats)
- **HIGH**: Serious threats (coyotes, wolves, unauthorized vehicles)
- **CRITICAL**: Extreme danger (bears, mountain lions)

### Time-Based Detection

Detection probability varies by time of day to simulate realistic predator behavior:

- **Dawn (5-7am)**: 18% detection probability
- **Dusk (6-9pm)**: 18% detection probability
- **Other times**: 8% detection probability

### Detection Results

Each detection includes:

```json
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
```

## API Endpoints

### Public Endpoints

#### GET `/api/cameras`

Returns all camera sensors with real-time AI detection results.

**Response:**
```json
{
  "cameras": [
    {
      "camera": "cam1",
      "name": "North Pasture Perimeter",
      "status": "online",
      "predator_detected": true,
      "location": "North Pasture Perimeter",
      "embedUrl": "https://www.youtube.com/embed/...",
      "youtubeUrl": "https://www.youtube.com/watch?v=...",
      "lat": 36.7803,
      "lon": -119.4179,
      "aiDetection": {
        "enabled": true,
        "lastScan": "2024-01-15T18:45:23.000Z",
        "alertLevel": "high",
        "confidence": 0.873,
        "detections": [...]
      }
    }
  ]
}
```

### Admin Endpoints

#### GET `/api/admin/cameras`

Get all camera sensors (admin only).

**Response:**
```json
{
  "cameras": [...]
}
```

#### POST `/api/admin/cameras`

Add a new camera sensor.

**Request Body:**
```json
{
  "name": "New Camera Name",
  "lat": 36.7803,
  "lon": -119.4179,
  "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "status": "ok",
  "camera": {...}
}
```

#### PUT `/api/admin/cameras/:id`

Update camera sensor properties.

**Request Body:**
```json
{
  "name": "Updated Camera Name",
  "lat": 36.7803,
  "lon": -119.4179,
  "youtubeUrl": "https://www.youtube.com/watch?v=NEW_VIDEO_ID",
  "status": "online",
  "aiDetectionEnabled": true
}
```

#### DELETE `/api/admin/cameras/:id`

Delete a camera sensor.

**Response:**
```json
{
  "status": "ok"
}
```

#### PUT `/api/admin/cameras/:id/location`

Update camera location on the map.

**Request Body:**
```json
{
  "lat": 36.7803,
  "lon": -119.4179
}
```

#### POST `/api/admin/cameras/:id/detect`

Manually trigger AI detection for a camera (useful for testing).

**Response:**
```json
{
  "status": "ok",
  "camera": {...},
  "detection": {
    "enabled": true,
    "lastScan": "2024-01-15T18:45:23.000Z",
    "alertLevel": "high",
    "confidence": 0.873,
    "detections": [...]
  }
}
```

## YouTube Video Integration

### Supported URL Formats

The system automatically converts any YouTube URL format to embed URLs:

- Standard: `https://www.youtube.com/watch?v=VIDEO_ID`
- Short: `https://youtu.be/VIDEO_ID`
- Embed: `https://www.youtube.com/embed/VIDEO_ID`

### Embed Options

Embed URLs are automatically generated with these parameters:

- `autoplay=1` - Start playing immediately
- `mute=1` - Muted by default
- `controls=1` - Show video controls
- `loop=1` - Loop video continuously
- `playlist=VIDEO_ID` - Required for looping

### Changing Video Feeds

To change a camera's video feed, update the `youtubeUrl` property:

```bash
curl -X PUT http://localhost:8082/api/admin/cameras/cam1 \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeUrl": "https://www.youtube.com/watch?v=NEW_VIDEO_ID"
  }'
```

The system will automatically generate the proper embed URL.

## Configuration File

### Location

`server/cameras.json`

### Default Configuration

The system ships with 4 default cameras positioned around the ranch perimeter:

1. **North Pasture Perimeter** (cam1)
2. **South Gate Entrance** (cam2)
3. **East Water Trough** (cam3)
4. **West Fence Line** (cam4)

### Adding Cameras Manually

Edit `server/cameras.json` directly:

```json
{
  "cameras": [
    {
      "id": "cam5",
      "name": "Custom Camera",
      "lat": 36.7800,
      "lon": -119.4200,
      "status": "online",
      "youtubeUrl": "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
      "embedUrl": "https://www.youtube.com/embed/YOUR_VIDEO_ID?autoplay=1&mute=1&controls=0&loop=1&playlist=YOUR_VIDEO_ID",
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

## Integration with RanchOS UI

### Camera Panel

The existing `CamerasPanel.jsx` component automatically consumes camera data from `/api/cameras`:

- Displays camera grid with live video feeds
- Shows online/offline status
- Displays predator detection alerts
- Allows fullscreen camera viewing

### Map Integration

Cameras with `lat` and `lon` properties can be displayed on the map:

```javascript
// Example: Display cameras on Mapbox map
const cameras = await fetch('/api/cameras').then(r => r.json())

cameras.cameras.forEach(camera => {
  if (camera.lat && camera.lon) {
    // Add camera marker to map
    new mapboxgl.Marker({ color: 'blue' })
      .setLngLat([camera.lon, camera.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <h3>${camera.name}</h3>
        <p>Status: ${camera.status}</p>
        <p>Alert Level: ${camera.aiDetection.alertLevel}</p>
      `))
      .addTo(map)
  }
})
```

## Simulation Behavior

### Detection Frequency

- AI detection runs on each `/api/cameras` request (typically polled every 5-10 seconds by the UI)
- Detection results are **not persisted** to cameras.json - they're generated fresh each time
- This provides continuous, realistic monitoring simulation

### Status Simulation

- Cameras have a 5% chance of appearing offline on each request
- This simulates network issues, camera failures, or power outages
- Status can be manually set via the admin API

### Confidence Scores

Confidence scores vary by detection category:

- **Predators**: 0.72 - 0.95 (ML models are highly confident on known predators)
- **Threats**: 0.65 - 0.88 (Medium confidence for unusual objects)
- **Livestock**: 0.85 - 0.98 (Very high confidence - trained on cattle)
- **Normal**: 0.60 - 0.85 (Variable confidence for common objects)

## Testing the System

### 1. View All Cameras

```bash
curl http://localhost:8082/api/cameras | jq
```

### 2. Add a New Camera

```bash
curl -X POST http://localhost:8082/api/admin/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Camera",
    "lat": 36.7800,
    "lon": -119.4200,
    "youtubeUrl": "https://www.youtube.com/watch?v=eJ7ZkQ5TC08"
  }' | jq
```

### 3. Trigger AI Detection

```bash
curl -X POST http://localhost:8082/api/admin/cameras/cam1/detect | jq
```

### 4. Update Camera YouTube URL

```bash
curl -X PUT http://localhost:8082/api/admin/cameras/cam1 \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeUrl": "https://www.youtube.com/watch?v=NEW_VIDEO_ID"
  }' | jq
```

### 5. View Detection Patterns Over Time

Poll the API multiple times to see detection patterns:

```bash
for i in {1..10}; do
  echo "Request $i:"
  curl -s http://localhost:8082/api/cameras | jq '.cameras[0].aiDetection'
  sleep 5
done
```

## Advanced Features

### Custom Detection Categories

To add custom detection categories, edit `DETECTION_CATEGORIES` in `server/index.js`:

```javascript
const DETECTION_CATEGORIES = {
  PREDATOR: ['coyote', 'wolf', 'bear', 'mountain_lion', 'bobcat', 'fox'],
  THREAT: ['unauthorized_vehicle', 'unauthorized_person', 'unknown_animal'],
  LIVESTOCK: ['cattle', 'horse', 'deer', 'elk'],
  NORMAL: ['bird', 'rabbit', 'vegetation_movement', 'weather_event'],
  // Add custom category:
  CUSTOM: ['your_custom_object_1', 'your_custom_object_2']
}
```

### Adjusting Detection Probabilities

Modify the `simulateAIDetection` function to adjust detection frequencies:

```javascript
// Increase predator detection rate
if (detectionRoll < 0.30) {  // Changed from 0.15 to 0.30
  category = 'PREDATOR'
  // ...
}
```

### Persistent Detections

To persist detection results to cameras.json, modify the `/api/cameras` endpoint:

```javascript
// Update camera with latest AI detection (persist to disk)
camera.aiDetection = aiDetection
writeCameras(camerasData)
```

## Troubleshooting

### Cameras Not Appearing

1. Check that `server/cameras.json` exists and is valid JSON
2. Verify the Express server is reading the file correctly
3. Check server logs for errors

### YouTube Videos Not Playing

1. Verify the YouTube URL is public and embeddable
2. Check that the video allows embedding (some videos restrict this)
3. Try using a different video URL for testing

### No AI Detections

1. Detection is probabilistic - keep polling to see detections
2. Check that `aiDetection.enabled` is `true` for the camera
3. Try the manual detection endpoint to force a detection

### Embed URLs Not Working

1. Verify the `convertToYouTubeEmbed` function is extracting the video ID correctly
2. Check the embed URL format matches YouTube's requirements
3. Test the embed URL directly in a browser

## Future Enhancements

Potential improvements to the camera sensor system:

1. **Detection History**: Store last N detections per camera
2. **Heat Maps**: Track detection hotspots across time
3. **Custom ML Models**: Allow users to upload their own detection models
4. **Multi-Object Detection**: Detect multiple objects in a single frame
5. **Video Recording**: Trigger recording when predators are detected
6. **Alert Notifications**: Send push notifications for critical detections
7. **Camera Zones**: Define detection zones within camera view
8. **Pan/Tilt/Zoom**: Simulate PTZ camera controls
9. **Night Vision**: Adjust detection patterns for night mode
10. **Weather Integration**: Reduce detection confidence during rain/fog

## Example API Response

Here's a complete example of the `/api/cameras` response:

```json
{
  "cameras": [
    {
      "camera": "cam1",
      "name": "North Pasture Perimeter",
      "status": "online",
      "predator_detected": true,
      "location": "North Pasture Perimeter",
      "embedUrl": "https://www.youtube.com/embed/eJ7ZkQ5TC08?autoplay=1&mute=1&controls=0&loop=1&playlist=eJ7ZkQ5TC08",
      "youtubeUrl": "https://www.youtube.com/watch?v=eJ7ZkQ5TC08",
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
  ]
}
```

## Summary

The Camera Sensor System provides a complete simulation of IoT security cameras with AI-powered threat detection. It integrates seamlessly with the existing RanchOS architecture, allowing users to:

- Configure multiple cameras with YouTube video feeds
- Monitor real-time AI/ML predator and threat detection
- Manage cameras through a comprehensive REST API
- Display cameras and detections on the ranch map
- Test detection scenarios manually

The system is designed to scale to dozens or hundreds of cameras while maintaining realistic behavior patterns and performance.
