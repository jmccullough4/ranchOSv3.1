# Camera Import API Specification

## For simulation-builder Agent

This document specifies the API endpoints needed for the camera import feature.

### 1. GET `/api/simulator/cameras`

**Purpose:** Fetch available simulated cameras that can be imported

**Response Format:**
```json
{
  "status": "ok",
  "cameras": [
    {
      "id": "sim-cam-1",
      "name": "North Pasture Gate",
      "lat": 36.7800,
      "lon": -119.4180,
      "status": "online",
      "streamUrl": "https://www.youtube.com/watch?v=eJ7ZkQ5TC08",
      "aiDetection": {
        "enabled": true,
        "supported": true
      },
      "source": "simulator",
      "metadata": {
        "description": "Monitors north pasture entrance",
        "coverage": "120° field of view",
        "resolution": "1080p"
      }
    },
    {
      "id": "sim-cam-2",
      "name": "South Boundary Monitor",
      "lat": 36.7770,
      "lon": -119.4200,
      "status": "online",
      "streamUrl": "https://www.youtube.com/watch?v=sV-ojmLwMt0",
      "aiDetection": {
        "enabled": true,
        "supported": true
      },
      "source": "simulator",
      "metadata": {
        "description": "Monitors south fence line",
        "coverage": "180° field of view",
        "resolution": "1080p"
      }
    },
    {
      "id": "sim-cam-3",
      "name": "Water Station Camera",
      "lat": 36.7820,
      "lon": -119.4150,
      "status": "offline",
      "streamUrl": "https://www.youtube.com/watch?v=LgJWOCCz-Qs",
      "aiDetection": {
        "enabled": false,
        "supported": true
      },
      "source": "simulator",
      "metadata": {
        "description": "Monitors water trough area",
        "coverage": "90° field of view",
        "resolution": "720p"
      }
    },
    {
      "id": "sim-cam-4",
      "name": "Predator Watch East",
      "lat": 36.7790,
      "lon": -119.4100,
      "status": "online",
      "streamUrl": "https://www.youtube.com/watch?v=ydYDqZQpim8",
      "aiDetection": {
        "enabled": true,
        "supported": true
      },
      "source": "simulator",
      "metadata": {
        "description": "Eastern perimeter predator detection",
        "coverage": "160° field of view",
        "resolution": "1080p"
      }
    }
  ]
}
```

**Error Response (simulator unreachable):**
```json
{
  "status": "error",
  "error": "Simulator service unavailable",
  "cameras": []
}
```

### 2. POST `/api/simulator/cameras/:id/import`

**Purpose:** Import a simulator camera into the ranch's active camera list

**Request Body:**
```json
{
  "customName": "North Gate Camera" // Optional: override default name
}
```

**Response Format:**
```json
{
  "status": "ok",
  "camera": {
    "id": "cam-123456", // New ID assigned by RanchOS
    "originalId": "sim-cam-1", // Reference to simulator ID
    "name": "North Pasture Gate",
    "lat": 36.7800,
    "lon": -119.4180,
    "status": "online",
    "youtubeUrl": "https://www.youtube.com/watch?v=eJ7ZkQ5TC08",
    "embedUrl": "https://www.youtube.com/embed/eJ7ZkQ5TC08?autoplay=1&mute=1&loop=1&playlist=eJ7ZkQ5TC08",
    "aiDetection": {
      "enabled": true
    },
    "source": "simulator",
    "importedAt": "2025-11-20T15:30:00.000Z"
  }
}
```

**Error Response (already imported):**
```json
{
  "status": "error",
  "error": "Camera already imported",
  "existingCameraId": "cam-123456"
}
```

### 3. Enhanced GET `/api/admin/cameras`

**Purpose:** Include source information for all cameras

**Response Format:**
```json
{
  "cameras": [
    {
      "id": "cam-1",
      "name": "North Pasture Gate",
      "lat": 36.7800,
      "lon": -119.4180,
      "status": "online",
      "youtubeUrl": "https://www.youtube.com/watch?v=eJ7ZkQ5TC08",
      "embedUrl": "...",
      "aiDetection": {
        "enabled": true
      },
      "source": "simulator", // NEW FIELD
      "simulatorId": "sim-cam-1", // NEW FIELD (if source=simulator)
      "importedAt": "2025-11-20T15:30:00.000Z"
    },
    {
      "id": "cam-2",
      "name": "Custom Barn Camera",
      "youtubeUrl": "https://www.youtube.com/watch?v=xyz",
      "embedUrl": "...",
      "status": "online",
      "aiDetection": {
        "enabled": true
      },
      "source": "manual", // NEW FIELD
      "createdAt": "2025-11-19T10:00:00.000Z"
    }
  ]
}
```

### Data Model

**Camera Object Schema:**
```typescript
interface Camera {
  id: string                    // Unique camera ID in RanchOS
  name: string                  // Display name
  lat?: number                  // GPS latitude
  lon?: number                  // GPS longitude
  status: 'online' | 'offline'  // Current status
  youtubeUrl?: string           // YouTube stream URL
  embedUrl?: string             // YouTube embed URL
  aiDetection: {
    enabled: boolean
    lastScan?: string           // ISO timestamp
    alertLevel?: string
    detections?: Detection[]
  }
  source: 'simulator' | 'manual' // NEW: Source of camera
  simulatorId?: string          // NEW: Original simulator ID (if source=simulator)
  importedAt?: string           // NEW: ISO timestamp when imported
  createdAt?: string            // ISO timestamp when manually created
  metadata?: {
    description?: string
    coverage?: string
    resolution?: string
  }
}
```

### Implementation Notes for simulation-builder:

1. **Simulator Camera Storage:**
   - Create `server/simulator-cameras.json` to store available simulator cameras
   - Initialize with 4-6 example cameras with realistic GPS coords near ranch center
   - Include mix of online/offline statuses

2. **Import Logic:**
   - Check if camera already imported (by `simulatorId` field)
   - Convert simulator camera format to RanchOS camera format
   - Add `source: "simulator"` and `simulatorId` fields
   - Save to `server/cameras.json` via existing `writeCameras()` function

3. **YouTube URLs:**
   - Use livestock/ranch-themed YouTube live streams
   - Example URLs:
     - `https://www.youtube.com/watch?v=eJ7ZkQ5TC08` (Cattle grazing)
     - `https://www.youtube.com/watch?v=sV-ojmLwMt0` (Farm animals)
     - `https://www.youtube.com/watch?v=LgJWOCCz-Qs` (Wildlife)
     - `https://www.youtube.com/watch?v=ydYDqZQpim8` (Nature camera)

4. **GPS Coordinates:**
   - Use coordinates near ranch center: `36.7800, -119.4180`
   - Spread cameras around perimeter within fence polygon
   - Example positions:
     - North: 36.7820, -119.4180
     - South: 36.7770, -119.4200
     - East: 36.7790, -119.4100
     - West: 36.7800, -119.4260

5. **Duplicate Prevention:**
   - Before import, check if `simulatorId` already exists in `cameras.json`
   - Return friendly error with existing camera details
