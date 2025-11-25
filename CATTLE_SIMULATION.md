# Cattle Herd Simulation System

## Overview

The RanchOS cattle herd simulation system provides a realistic, configurable simulation of cattle behavior within pasture boundaries. It features dynamic herd clustering, stray detection, boundary avoidance, and real-time AI-based alerts.

## Features

### 1. Realistic Herd Behavior
- **Herd Clustering**: 90-95% of cattle naturally cluster together in a main herd
- **Stray Behavior**: 5-10% of cattle wander independently as strays
- **Boundary Avoidance**: Cattle avoid pasture boundaries and turn back when approaching fences
- **Herd Cohesion**: Main herd members are attracted to the herd center
- **Gradual Movement**: Cattle drift slowly and realistically (no teleporting)

### 2. Pasture Boundary Integration
- Reads pasture boundaries from `server/pastures.json`
- Uses ray-casting point-in-polygon algorithm for boundary detection
- Calculates minimum distance to boundary for avoidance behavior
- Supports complex polygon shapes for irregular pastures

### 3. Configurable Parameters
All simulation parameters can be adjusted via API or web UI:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `totalCattleCount` | 50 | Total number of cattle in the herd (1-500) |
| `strayPercentage` | 10 | Percentage that will be designated strays (0-100%) |
| `clusterRadius` | 0.01 | How tightly main herd clusters (degrees) |
| `strayRadius` | 0.05 | How far strays can wander from center (degrees) |
| `movementSpeed` | 0.00018 | Per-update movement step size (degrees) |
| `movementLimit` | 0.0025 | Maximum drift from anchor point (degrees) |
| `strayDistanceThreshold` | 0.01 | Distance from herd center to trigger stray alert |
| `boundaryAvoidanceStrength` | 0.3 | How strongly cattle avoid boundaries (0-1) |
| `herdCohesion` | 0.1 | How much cattle are attracted to herd center (0-1) |

### 4. AI Stray Detection
- Automatically tracks when cattle exceed the stray distance threshold
- Calculates distance from each stray to the nearest non-stray cow
- Tracks stray duration (how long cattle have been separated)
- Provides alerts via `/api/stray-alerts` endpoint

### 5. Realistic Cattle Properties
Each cow has:
- **Unique ID**: Format `3S-001` through `3S-XXX`
- **Name**: Randomly assigned from a pool of 40+ realistic cattle names
- **Weight**: 800-1400 lbs (realistic range)
- **Temperature**: 99-103°F (normal cattle body temperature)
- **Vaccines**: Bovine Respiratory and Blackleg records
- **Position**: Latitude/longitude within pasture boundaries
- **Altitude**: Simulated elevation based on position

## API Endpoints

### Herd Data Endpoint
**GET** `/api/herd`

Returns current positions and properties of all cattle.

**Response:**
```json
{
  "herd": [
    {
      "id": "3S-001",
      "name": "Bessie",
      "weight": 1050,
      "temperature": 101.2,
      "lat": 39.12345,
      "lon": -104.98765,
      "altitude": 850,
      "isStray": false,
      "strayDuration": 0,
      "distanceFromHerd": 0.0023,
      "vaccines": [...]
    }
  ],
  "herdCenter": {
    "lat": 39.12340,
    "lon": -104.98760
  }
}
```

### Stray Alerts Endpoint
**GET** `/api/stray-alerts`

Returns all active stray alerts with closest cow information.

**Response:**
```json
{
  "alerts": [
    {
      "cowId": "3S-048",
      "name": "Scout",
      "lat": 39.13000,
      "lon": -104.99500,
      "altitude": 875,
      "detectedAt": 1700000000000,
      "duration": "45m",
      "durationMinutes": 45,
      "closestCow": {
        "id": "3S-023",
        "name": "Rosie",
        "lat": 39.12850,
        "lon": -104.99200
      },
      "distanceToClosest": 520
    }
  ]
}
```

### Configuration Endpoints

#### Get Current Configuration
**GET** `/api/simulator/herd/config`

```json
{
  "config": {
    "totalCattleCount": 50,
    "strayPercentage": 10,
    "clusterRadius": 0.01,
    "strayRadius": 0.05,
    "movementSpeed": 0.00018,
    "movementLimit": 0.0025,
    "strayDistanceThreshold": 0.01,
    "boundaryAvoidanceStrength": 0.3,
    "herdCohesion": 0.1
  },
  "currentState": {
    "totalCattle": 50,
    "strayCount": 5,
    "activeStrays": 3,
    "hasRanchCenter": true,
    "hasFenceBoundary": true
  }
}
```

#### Update Configuration
**POST** `/api/simulator/herd/config`

Send partial or full configuration:
```json
{
  "totalCattleCount": 100,
  "strayPercentage": 15,
  "boundaryAvoidanceStrength": 0.5
}
```

#### Reset Herd Positions
**POST** `/api/simulator/herd/reset`

Regenerates cattle and reinitializes positions based on current configuration.

#### Get Live Statistics
**GET** `/api/simulator/herd/stats`

```json
{
  "totalCattle": 50,
  "mainHerdCount": 45,
  "designatedStrayCount": 5,
  "activeStrayAlerts": 3,
  "herdCenter": { "lat": 39.1234, "lon": -104.9876 },
  "averageSpread": 125,
  "maxSpread": 450,
  "fenceBreachActive": false
}
```

## Simulation Console UI

The unified console (`simulator/index.html`) streams herd changes and IoT sensors from one view. Open it directly in your browser or via a simple static server:

```bash
cd simulator
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Features
- **Combined Dashboard**: Sensor streaming and herd controls live side-by-side.
- **Interactive Sliders**: Adjust total cattle, strays, cohesion, boundary avoidance, and more.
- **Apply & Reset**: Push new config to `/api/simulator/herd/config` and reinitialize anchors instantly.
- **Automatic Stats**: `/api/simulator/herd/stats` refreshes every ~8 seconds.
- **Logs**: Separate activity logs for herd events and sensor pushes.

### Usage Flow

1. Set the RanchOS URL (defaults to `http://localhost:8082`) and click **Ping** to verify connectivity.
2. Adjust herd sliders, click **Apply Config**, then **Reset Herd** to re-anchor positions.
3. Configure sensor counts, then click **Start Simulation** to begin streaming telemetry.
4. Watch the live statistics, breach banner, and sensor cards update automatically.

## Technical Implementation

### Movement Algorithm

Each cattle position is updated using this algorithm:

1. **Base Random Movement**: Small random drift in lat/lon
2. **Herd Cohesion**: Non-strays are pulled toward herd center
3. **Boundary Avoidance**: Cattle near fences are pushed toward ranch center
4. **Anchor Constraints**: Movement is clamped to anchor ± movement limit
5. **Fence Enforcement**: Final position is constrained within pasture polygon

```javascript
// Simplified movement logic
deltaLat = random(-speed, speed)
deltaLon = random(-speed, speed)

// Apply cohesion for main herd
if (!isStray) {
  deltaLat += (herdCenter.lat - position.lat) * cohesion
  deltaLon += (herdCenter.lon - position.lon) * cohesion
}

// Apply boundary avoidance
if (distToBoundary < threshold) {
  avoidance = (1 - distToBoundary / threshold) * avoidanceStrength
  deltaLat += (ranchCenter.lat - position.lat) * avoidance
  deltaLon += (ranchCenter.lon - position.lon) * avoidance
}

// Constrain to fence
newPosition = constrainToFence(position + delta)
```

### Pasture Boundary Detection

The system uses a ray-casting algorithm to determine if a point is inside a polygon:

```javascript
function isPointInPolygon(point, polygon) {
  const [x, y] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]

    const intersect = yi > y !== yj > y &&
                     x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

    if (intersect) inside = !inside
  }

  return inside
}
```

### Stray Detection

Cattle are marked as strays when their distance from the herd center exceeds the threshold:

```javascript
const distance = calculateDistance(
  position.lat, position.lon,
  herdCenter.lat, herdCenter.lon
)

const isStray = distance > strayDistanceThreshold
```

## Integration with Frontend

The frontend `MapPanel.jsx` displays cattle on a Mapbox map:

- **Blue dots**: Main herd cattle
- **Orange dots**: Stray cattle
- **Yellow dots**: Selected cattle
- **Orange dashed lines**: Stray-to-nearest-cow connections

The frontend polls `/api/herd` every 5-10 seconds to get updated positions.

## Configuration Best Practices

### For Tight Clustering
```json
{
  "clusterRadius": 0.005,
  "herdCohesion": 0.3,
  "boundaryAvoidanceStrength": 0.5
}
```

### For Realistic Grazing
```json
{
  "clusterRadius": 0.015,
  "strayPercentage": 10,
  "movementSpeed": 0.00015,
  "herdCohesion": 0.1
}
```

### For Maximum Chaos (Testing)
```json
{
  "strayPercentage": 50,
  "boundaryAvoidanceStrength": 0,
  "herdCohesion": 0,
  "movementSpeed": 0.0005
}
```

## Troubleshooting

### Cattle Not Visible on Map
1. Ensure pasture boundary is configured in Admin Panel
2. Check that `server/pastures.json` has valid GeoJSON coordinates
3. Verify cattle are within the fence polygon

### Cattle Escaping Boundaries
1. Increase `boundaryAvoidanceStrength` (try 0.5-0.8)
2. Decrease `movementSpeed` to slow movement
3. Use "Reset Herd" to reinitialize positions

### Too Many/Too Few Strays
1. Adjust `strayPercentage` parameter
2. Modify `strayDistanceThreshold` to change alert sensitivity
3. Increase `strayRadius` to let strays wander farther

### Herd Not Clustering
1. Increase `herdCohesion` (try 0.2-0.5)
2. Decrease `clusterRadius` to force tighter grouping
3. Lower `strayPercentage` to reduce wanderers

## Future Enhancements

Potential additions to the simulation system:

- **Diurnal Patterns**: Different movement during day/night
- **Water Source Attraction**: Cattle drift toward water troughs
- **Grazing Depletion**: Track pasture usage over time
- **Weather Effects**: Wind affects movement direction
- **Predator Response**: Herd clustering when threats detected
- **Multiple Herds**: Support for separate groups in different pastures
- **Historical Tracking**: Store position history for playback

## Files Modified/Created

### Backend (server/index.js)
- Added configurable `herdConfig` object
- Implemented `generateBaseCattle()` function
- Enhanced movement logic with cohesion and boundary avoidance
- Added helper functions for distance calculations
- Created 4 new API endpoints for herd configuration

### Simulator UI
- `simulator/index.html` - Unified herd + sensor console
- `simulator/main.js` - Simulator logic and API integration

### Documentation
- `CATTLE_SIMULATION.md` - This comprehensive guide

## Support

For questions or issues with the cattle simulation system, please refer to:
- Main project docs: `CLAUDE.md`
- API endpoint documentation above
- Code comments in `server/index.js` (lines 86-400, 560-680, 871-1034)
