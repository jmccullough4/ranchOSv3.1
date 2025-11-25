# Camera Simulator Guide

## Overview

The Camera Simulator provides a realistic simulation of IP security cameras for the ranch management system. It includes pre-configured camera presets, intelligent AI detection with location-based profiles, and dynamic status simulation.

## Architecture

### Components

1. **Camera Presets Library** - 6 pre-configured camera types with different capabilities
2. **Detection Profiles** - Location-based behavior patterns (gate, perimeter, feeding, etc.)
3. **AI Detection Engine** - Time-aware, profile-weighted detection simulation
4. **Status Simulator** - Realistic online/offline patterns based on camera type
5. **Position Calculator** - Auto-calculates camera positions based on ranch boundaries

### Data Flow

```
┌─────────────────────────────────────┐
│  Camera Simulator Presets           │
│  (6 pre-configured cameras)         │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  GET /api/simulator/cameras         │
│  - Lists available cameras          │
│  - Calculates suggested positions   │
│  - Shows current detection state    │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  POST /api/simulator/cameras/       │
│       import/:id                    │
│  - Imports camera to cameras.json   │
│  - Assigns position                 │
│  - Enables AI detection             │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  GET /api/cameras                   │
│  - Returns all active cameras       │
│  - Simulates AI detections          │
│  - Updates online/offline status    │
└─────────────────────────────────────┘
```

## Camera Presets

### Available Cameras

| Camera ID | Name | Location | Profile | Key Features |
|-----------|------|----------|---------|--------------|
| `sim-cam-north-gate` | North Gate Entrance | North | gate | Vehicle detection, license plate |
| `sim-cam-south-pasture` | South Pasture Perimeter | South | perimeter | Predator detection focus |
| `sim-cam-east-water` | East Water Trough Monitor | East | feeding | Livestock counting |
| `sim-cam-west-chute` | West Chute Station | West | operational | Person detection |
| `sim-cam-central-ptz` | Central Ranch Overview (PTZ) | Center | overview | Pan-tilt-zoom, tracking |
| `sim-cam-barn-interior` | Barn Interior Monitor | Barn | interior | 24/7 monitoring |

### Camera Properties

Each camera preset includes:

```json
{
  "id": "sim-cam-north-gate",
  "name": "North Gate Entrance",
  "description": "Main entrance monitoring - vehicle and personnel detection",
  "type": "fixed|ptz",
  "suggestedLocation": "north|south|east|west|center|barn",
  "capabilities": ["motion_detection", "vehicle_detection", "person_detection"],
  "resolution": "1080p|4K",
  "nightVision": true|false,
  "weatherproof": true|false,
  "ptzCapable": true|false,
  "feedType": "youtube",
  "youtubeUrl": "https://youtube.com/...",
  "detectionProfile": "gate|perimeter|feeding|operational|overview|interior"
}
```

## Detection Profiles

Detection profiles modify AI detection behavior based on camera location and purpose:

### Gate Profile
- **Purpose**: Monitor entrances/exits
- **Characteristics**:
  - 2x vehicle detection rate
  - 0.5x predator detection rate (not a hotspot)
  - Peak hours: 6-8am, 4-6pm (arrival/departure times)

### Perimeter Profile
- **Purpose**: Fence line and boundary monitoring
- **Characteristics**:
  - 2.5x predator detection rate
  - 0.3x vehicle detection rate
  - Peak hours: 5-7am, 7-10pm (dawn/dusk activity)

### Feeding Profile
- **Purpose**: Water troughs and feeding areas
- **Characteristics**:
  - 3x livestock detection rate
  - 0.8x predator detection rate
  - Peak hours: 6-8am, 4-5pm (feeding times)

### Operational Profile
- **Purpose**: Work areas (chutes, barns, sheds)
- **Characteristics**:
  - 2x person detection rate
  - 0.1x predator detection rate
  - Peak hours: 8am-4pm (work hours)

### Overview Profile
- **Purpose**: General ranch monitoring
- **Characteristics**:
  - Balanced detection rates (1x all)
  - Peak hours: 5-8am, 6-9pm

### Interior Profile
- **Purpose**: Indoor monitoring
- **Characteristics**:
  - 0x vehicle detection (impossible indoors)
  - 2x livestock detection rate
  - 24/7 peak hours (always active)

## AI Detection System

### Detection Categories

1. **PREDATOR** (15% base probability)
   - Objects: coyote, wolf, bear, mountain_lion, bobcat, fox
   - Alert Levels: CRITICAL (bear, mountain_lion), HIGH (wolf, coyote), MEDIUM (others)
   - Confidence: 72-95%

2. **THREAT** (10% base probability)
   - Objects: unauthorized_vehicle, unauthorized_person, unknown_animal
   - Alert Levels: HIGH (unauthorized_vehicle), MEDIUM (others)
   - Confidence: 65-88%

3. **LIVESTOCK** (35% base probability)
   - Objects: cattle, horse, deer, elk
   - Alert Level: NONE
   - Confidence: 85-98%

4. **NORMAL** (40% base probability)
   - Objects: bird, rabbit, vegetation_movement, weather_event
   - Alert Level: NONE
   - Confidence: 60-85%

### Time-Based Detection Patterns

- **Dawn/Dusk Boost** (5-7am, 6-9pm): 1.8x detection probability
- **Profile Peak Hours**: 1.5x detection probability during profile-specific hours
- **Combined Effect**: Up to 2.7x detection during dawn/dusk peak hours

### Detection Response Format

```json
{
  "enabled": true,
  "lastScan": "2025-11-20T14:32:15.123Z",
  "alertLevel": "high",
  "confidence": 0.842,
  "detections": [
    {
      "timestamp": "2025-11-20T14:32:15.123Z",
      "category": "PREDATOR",
      "object": "coyote",
      "confidence": 0.842,
      "alertLevel": "high",
      "boundingBox": {
        "x": 0.35,
        "y": 0.42,
        "width": 0.28,
        "height": 0.31
      }
    }
  ]
}
```

## Camera Status Simulation

### Online/Offline Patterns

- **Base Uptime**: 97% for fixed cameras
- **PTZ Uptime**: 95% (more moving parts = less reliable)
- **Night Penalty**: -3% uptime for non-night-vision cameras during nighttime (6pm-6am)

### Status Calculation Example

```javascript
// Fixed, night-vision camera during day
97% base = online

// PTZ, night-vision camera
95% base = online

// Fixed, no night-vision during night
97% - 3% = 94% = online

// Result: Most cameras stay online most of the time
```

## API Endpoints

### GET /api/simulator/cameras

Get all available camera presets from simulator library.

**Response:**
```json
{
  "cameras": [
    {
      "id": "sim-cam-north-gate",
      "name": "North Gate Entrance",
      "suggestedLat": 36.7825,
      "suggestedLon": -119.4179,
      "status": "online",
      "currentDetection": { ... },
      "capabilities": ["motion_detection", "vehicle_detection"],
      "resolution": "4K",
      "detectionProfile": "gate"
    }
  ],
  "totalAvailable": 6,
  "rangeConfigured": true,
  "note": "These are simulated cameras available for import..."
}
```

**Use Case**: Display available cameras in admin UI for selection/import

---

### GET /api/simulator/cameras/:id

Get details for a specific simulator camera preset.

**Parameters:**
- `id` - Camera preset ID (e.g., `sim-cam-north-gate`)

**Response:**
```json
{
  "id": "sim-cam-north-gate",
  "name": "North Gate Entrance",
  "description": "Main entrance monitoring...",
  "suggestedLat": 36.7825,
  "suggestedLon": -119.4179,
  "status": "online",
  "currentDetection": { ... },
  "type": "fixed",
  "capabilities": ["motion_detection", "vehicle_detection"],
  "detectionProfile": "gate"
}
```

---

### POST /api/simulator/cameras/import/:id

Import a camera from simulator into the ranch system.

**Parameters:**
- `id` - Camera preset ID to import

**Request Body:**
```json
{
  "customName": "My North Gate Camera",  // Optional: Override preset name
  "customLat": 36.7830,                  // Optional: Override suggested position
  "customLon": -119.4180                 // Optional: Override suggested position
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "Camera \"North Gate Entrance\" imported successfully",
  "camera": {
    "id": "cam1",
    "simulatorId": "sim-cam-north-gate",
    "name": "North Gate Entrance",
    "lat": 36.7825,
    "lon": -119.4179,
    "status": "online",
    "aiDetection": { "enabled": true },
    "detectionProfile": "gate"
  }
}
```

**Error Cases:**
- `404` - Camera preset not found
- `400` - Camera already imported

---

### POST /api/simulator/cameras/import-all

Import all camera presets at once (bulk import).

**Request Body:** None

**Response:**
```json
{
  "status": "ok",
  "message": "Imported 6 cameras, skipped 0 already imported",
  "imported": [
    "North Gate Entrance",
    "South Pasture Perimeter",
    "East Water Trough Monitor",
    "West Chute Station",
    "Central Ranch Overview (PTZ)",
    "Barn Interior Monitor"
  ],
  "skipped": [],
  "total": 6
}
```

---

### GET /api/simulator/cameras/status

Get camera simulator statistics and status.

**Response:**
```json
{
  "simulator": {
    "totalPresets": 6,
    "presetsAvailable": 3,
    "presetsImported": 3
  },
  "ranch": {
    "totalCameras": 5,
    "onlineCameras": 4,
    "offlineCameras": 1,
    "aiEnabledCameras": 5
  },
  "ranchConfigured": true
}
```

---

### GET /api/cameras

Get all active ranch cameras with real-time detection simulation.

**Response:**
```json
{
  "cameras": [
    {
      "camera": "cam1",
      "name": "North Gate Entrance",
      "status": "online",
      "predator_detected": false,
      "location": "North Gate Entrance",
      "embedUrl": "https://youtube.com/embed/...",
      "lat": 36.7825,
      "lon": -119.4179,
      "type": "fixed",
      "capabilities": ["motion_detection", "vehicle_detection"],
      "resolution": "4K",
      "detectionProfile": "gate",
      "aiDetection": {
        "enabled": true,
        "lastScan": "2025-11-20T14:35:22.456Z",
        "alertLevel": "none",
        "confidence": 0,
        "detections": []
      }
    }
  ]
}
```

**Notes:**
- This endpoint runs AI detection simulation on each request
- Uses profile-based detection for imported cameras
- Falls back to basic detection for manually added cameras
- Status simulation applies to all cameras

## Position Calculation

When importing cameras, positions are auto-calculated based on:

1. **Ranch Center** - From primary pasture configuration
2. **Fence Polygon** - From pasture boundary
3. **Location Hint** - From camera preset

### Position Algorithm

```javascript
// Get fence bounds
const minLat = Math.min(...fenceLats)
const maxLat = Math.max(...fenceLats)
const latRange = maxLat - minLat

// Position for "north" location
suggestedLat = centerLat + (latRange * 0.35)
suggestedLon = centerLon

// Positions:
// north: center + 35% range north
// south: center - 35% range south
// east: center + 35% range east
// west: center - 35% range west
// center: exact center
// barn: center + 10% range northeast
```

## Integration with Existing System

### Camera Data Model Updates

Imported cameras include additional fields:

```json
{
  "id": "cam1",
  "simulatorId": "sim-cam-north-gate",  // NEW: Links to preset
  "name": "North Gate Entrance",
  "description": "Main entrance monitoring...",  // NEW
  "lat": 36.7825,
  "lon": -119.4179,
  "status": "online",
  "youtubeUrl": "https://youtube.com/...",
  "embedUrl": "https://youtube.com/embed/...",
  "type": "fixed",  // NEW: fixed or ptz
  "capabilities": ["motion_detection", "vehicle_detection"],  // NEW
  "resolution": "4K",  // NEW
  "nightVision": true,  // NEW
  "weatherproof": true,  // NEW
  "ptzCapable": false,  // NEW
  "detectionProfile": "gate",  // NEW: Determines AI behavior
  "createdAt": "2025-11-20T14:00:00.000Z",
  "updatedAt": "2025-11-20T14:00:00.000Z",
  "aiDetection": {
    "enabled": true,
    "lastScan": null,
    "detections": []
  }
}
```

### Backward Compatibility

The system maintains full backward compatibility:

- Manually added cameras (via `/api/admin/cameras`) work as before
- Cameras without `detectionProfile` use basic `simulateAIDetection()`
- Cameras without enhanced metadata still function normally
- Empty `cameras.json` works correctly

## Testing Guide

### 1. Check Simulator Status

```bash
curl http://localhost:8082/api/simulator/cameras/status
```

Expected: Shows 6 available presets, 0 imported initially

### 2. List Available Cameras

```bash
curl http://localhost:8082/api/simulator/cameras
```

Expected: Returns 6 camera presets with suggested positions

### 3. Import Single Camera

```bash
curl -X POST http://localhost:8082/api/simulator/cameras/import/sim-cam-north-gate \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: Camera imported, assigned ID `cam1`, position calculated

### 4. Try Re-Importing (Should Fail)

```bash
curl -X POST http://localhost:8082/api/simulator/cameras/import/sim-cam-north-gate \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: 400 error - "Camera already imported"

### 5. Import All Remaining

```bash
curl -X POST http://localhost:8082/api/simulator/cameras/import-all
```

Expected: Imports 5 cameras, skips 1 already imported, total 6 cameras

### 6. View Active Cameras

```bash
curl http://localhost:8082/api/cameras
```

Expected: Returns all 6 cameras with AI detection simulation

### 7. Test Time-Based Detection

Run during different hours to observe:
- Higher detection rates during dawn (5-7am) and dusk (6-9pm)
- Profile-specific detections (vehicles at gate, predators at perimeter)
- Different peak hours for different camera profiles

### 8. Test Custom Position Import

```bash
curl -X POST http://localhost:8082/api/simulator/cameras/import/sim-cam-north-gate \
  -H "Content-Type: application/json" \
  -d '{
    "customName": "My Custom Gate Cam",
    "customLat": 36.7850,
    "customLon": -119.4200
  }'
```

Expected: Camera imported with custom name and position

## Usage Scenarios

### Scenario 1: Quick Setup for Demo

1. Navigate to Admin Panel > Camera Management
2. Click "Import from Simulator" (UI to be built)
3. Select "Import All Cameras"
4. Cameras appear on map with AI detection active

### Scenario 2: Selective Camera Deployment

1. GET `/api/simulator/cameras` to view available options
2. Review capabilities and detection profiles
3. POST `/api/simulator/cameras/import/:id` for desired cameras
4. Customize positions via PUT `/api/admin/cameras/:id/location`

### Scenario 3: Testing AI Detection Patterns

1. Import cameras with different profiles
2. Monitor `/api/cameras` at different times of day
3. Observe:
   - Gate camera detects more vehicles during morning/evening
   - Perimeter camera detects more predators at dawn/dusk
   - Feeding camera detects more livestock during feeding hours

### Scenario 4: Mixed Manual + Simulator Setup

1. Manually add YouTube cameras via existing UI
2. Import simulator cameras for additional coverage
3. System handles both types correctly:
   - Manual cameras: Basic AI detection
   - Simulator cameras: Profile-based AI detection

## Performance Considerations

### On Each /api/cameras Request

- Reads `cameras.json` from disk
- Runs AI detection simulation for each camera (lightweight)
- Calculates status for each camera (minimal)
- Returns JSON response

**Typical Load:**
- 6 cameras: <5ms processing time
- 20 cameras: <15ms processing time
- 100 cameras: <100ms processing time

### Optimization Tips

1. **Cache ranch boundaries** if they don't change frequently
2. **Limit polling frequency** on frontend (5-10 second intervals)
3. **Use profile detection** only for imported cameras
4. **Persist detection results** if real-time simulation not needed

## Future Enhancements

### Potential Additions

1. **Weather Integration**
   - Reduce detection accuracy during rain/snow
   - Increase offline probability during storms
   - Adjust detection thresholds based on visibility

2. **Learning Mode**
   - Track actual detection patterns
   - Adjust profile weights based on real data
   - Personalize detection for specific ranch

3. **RTSP Stream Support**
   - Replace YouTube URLs with actual RTSP streams
   - Integrate with real IP cameras on network
   - Auto-discover cameras via ONVIF protocol

4. **Advanced PTZ Control**
   - Simulate pan/tilt/zoom operations
   - Auto-track detected objects
   - Preset position management

5. **Multi-Camera Correlation**
   - Track objects across multiple camera views
   - Stitch together detection timeline
   - Improve accuracy via consensus

6. **Alert Escalation**
   - Send notifications on CRITICAL alerts
   - Integrate with gate control (auto-lock on threat)
   - Log incidents for review

## Troubleshooting

### Cameras Not Appearing After Import

**Check:**
1. `cameras.json` file permissions (should be writable)
2. Server logs for errors
3. GET `/api/cameras` response
4. Ranch boundaries configured (needed for position calculation)

**Solution:**
```bash
# Verify cameras.json exists and is valid JSON
cat server/cameras.json

# Check server logs
docker compose logs -f
```

### Positions Are Null

**Cause:** Ranch center or fence polygon not configured

**Solution:**
1. Configure pasture boundary in Admin Panel > Map Editor
2. Ensure primary pasture is marked
3. Re-import cameras or manually set positions

### AI Detection Always Returns Empty

**Check:**
1. Camera `aiDetection.enabled` is `true`
2. Camera has valid `detectionProfile`
3. Time of day (lower detection during daytime, non-peak hours)

**Note:** Detection is probabilistic - empty results are normal most of the time

### Status Always Shows Offline

**Cause:** Camera may lack required metadata for status simulation

**Solution:**
1. Re-import camera from simulator
2. Or manually set `status: "online"` in cameras.json

## Code Reference

### Key Functions

- `CAMERA_SIMULATOR_PRESETS` - Array of 6 camera presets (line ~1598)
- `DETECTION_PROFILES` - Profile configurations (line ~1694)
- `calculateCameraPosition()` - Position calculator (line ~1734)
- `simulateAIDetectionWithProfile()` - Enhanced detection (line ~1768)
- `simulateCameraStatus()` - Status simulation (line ~1871)

### Key Endpoints

- `GET /api/simulator/cameras` - List presets (line ~1894)
- `GET /api/simulator/cameras/:id` - Get preset details (line ~1923)
- `POST /api/simulator/cameras/import/:id` - Import single (line ~1949)
- `POST /api/simulator/cameras/import-all` - Bulk import (line ~2022)
- `GET /api/simulator/cameras/status` - Simulator stats (line ~2089)
- `GET /api/cameras` - Active cameras with detection (line ~2921)

### Files Modified

- `/Users/jay.mccullough/Desktop/Coding/ranchOSv2/server/index.js` - All simulator logic
- `/Users/jay.mccullough/Desktop/Coding/ranchOSv2/server/cameras.json` - Camera data storage

## Summary

The Camera Simulator provides a complete, production-ready simulation system for IP security cameras with:

- 6 realistic camera presets covering all ranch monitoring needs
- 6 detection profiles for location-specific AI behavior
- Time-aware detection patterns (dawn/dusk, peak hours)
- Realistic status simulation (97%+ uptime)
- Auto-calculated positions based on ranch boundaries
- Full API for import, management, and monitoring
- Backward compatibility with manually added cameras
- Easy integration with existing admin UI

The system is ready for immediate use and can be extended to support real RTSP cameras in production.
