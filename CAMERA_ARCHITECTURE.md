# Camera Sensor System - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RanchOS Camera System                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐         ┌──────────────────┐                 │
│  │  CamerasPanel    │         │    MapPanel      │                 │
│  │                  │         │                  │                 │
│  │  - Camera Grid   │         │  - Camera Pins   │                 │
│  │  - Video Feeds   │         │  - Alert Markers │                 │
│  │  - Status Badges │         │  - Click to View │                 │
│  │  - Predator Alert│         │                  │                 │
│  └──────────────────┘         └──────────────────┘                 │
│           │                             │                            │
│           │   Polls every 5-10 seconds  │                            │
│           ▼                             ▼                            │
└───────────────────────────────────────────────────────────────────┬─┘
            │                                                         │
            │ HTTP GET /api/cameras                                  │
            │                                                         │
┌───────────▼─────────────────────────────────────────────────────────┐
│                    Express Backend (Node.js)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    API Endpoints                             │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  Public:                                                     │   │
│  │    GET  /api/cameras              → Get all cameras + AI    │   │
│  │                                                              │   │
│  │  Admin:                                                      │   │
│  │    GET    /api/admin/cameras      → List cameras            │   │
│  │    POST   /api/admin/cameras      → Add camera              │   │
│  │    PUT    /api/admin/cameras/:id  → Update camera           │   │
│  │    DELETE /api/admin/cameras/:id  → Delete camera           │   │
│  │    PUT    /api/admin/cameras/:id/location → Update GPS      │   │
│  │    POST   /api/admin/cameras/:id/detect   → Trigger AI      │   │
│  │                                                              │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                            │
│  ┌──────────────────────▼──────────────────────────────────────┐   │
│  │              AI/ML Detection Engine                          │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  simulateAIDetection(camera)                                │   │
│  │                                                              │   │
│  │  1. Check time of day (dawn/dusk = more detections)         │   │
│  │  2. Roll detection probability (8-18%)                      │   │
│  │  3. Select detection category:                              │   │
│  │     - PREDATOR (15%): coyote, wolf, bear, etc.             │   │
│  │     - THREAT   (10%): unauthorized vehicle/person           │   │
│  │     - LIVESTOCK(35%): cattle, horse, deer                   │   │
│  │     - NORMAL   (40%): bird, rabbit, vegetation              │   │
│  │  4. Calculate confidence score (0.60-0.98)                  │   │
│  │  5. Assign alert level (none/low/medium/high/critical)      │   │
│  │  6. Generate bounding box coordinates                       │   │
│  │  7. Return detection result                                 │   │
│  │                                                              │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                            │
│  ┌──────────────────────▼──────────────────────────────────────┐   │
│  │              YouTube URL Converter                           │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  convertToYouTubeEmbed(url)                                 │   │
│  │                                                              │   │
│  │  Accepts:                                                    │   │
│  │    youtube.com/watch?v=VIDEO_ID                             │   │
│  │    youtu.be/VIDEO_ID                                        │   │
│  │    youtube.com/embed/VIDEO_ID                               │   │
│  │                                                              │   │
│  │  Returns:                                                    │   │
│  │    youtube.com/embed/VIDEO_ID?autoplay=1&mute=1&...         │   │
│  │                                                              │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                            │
│  ┌──────────────────────▼──────────────────────────────────────┐   │
│  │              Camera Helper Functions                         │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  readCameras()  → Load cameras.json                         │   │
│  │  writeCameras() → Save cameras.json                         │   │
│  │                                                              │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                            │
└─────────────────────────┼────────────────────────────────────────────┘
                          │
                          │ File I/O
                          ▼
        ┌─────────────────────────────────────┐
        │   server/cameras.json (persistent)  │
        ├─────────────────────────────────────┤
        │                                     │
        │  {                                  │
        │    "cameras": [                     │
        │      {                              │
        │        "id": "cam1",                │
        │        "name": "North Perimeter",   │
        │        "lat": 36.7803,              │
        │        "lon": -119.4179,            │
        │        "status": "online",          │
        │        "youtubeUrl": "...",         │
        │        "embedUrl": "...",           │
        │        "aiDetection": {             │
        │          "enabled": true            │
        │        }                            │
        │      }                              │
        │    ]                                │
        │  }                                  │
        │                                     │
        └─────────────────────────────────────┘
```

## Data Flow

### 1. Camera Data Retrieval Flow

```
Frontend                  Backend                  Storage
   │                         │                        │
   │  GET /api/cameras       │                        │
   ├────────────────────────>│                        │
   │                         │                        │
   │                         │  readCameras()         │
   │                         ├───────────────────────>│
   │                         │                        │
   │                         │<───────────────────────┤
   │                         │  cameras.json data     │
   │                         │                        │
   │                         │  For each camera:      │
   │                         │  - simulateAIDetection()│
   │                         │  - Calculate status    │
   │                         │  - Format response     │
   │                         │                        │
   │<────────────────────────┤                        │
   │  Camera array with AI   │                        │
   │  detection results      │                        │
   │                         │                        │
```

### 2. Add Camera Flow

```
Frontend/Client           Backend                  Storage
   │                         │                        │
   │  POST /api/admin/cameras│                        │
   │  { name, lat, lon,      │                        │
   │    youtubeUrl }         │                        │
   ├────────────────────────>│                        │
   │                         │                        │
   │                         │  readCameras()         │
   │                         ├───────────────────────>│
   │                         │<───────────────────────┤
   │                         │                        │
   │                         │  convertToYouTubeEmbed()│
   │                         │  Generate camera ID    │
   │                         │  Create camera object  │
   │                         │                        │
   │                         │  writeCameras()        │
   │                         ├───────────────────────>│
   │                         │                        │
   │<────────────────────────┤                        │
   │  { status: "ok",        │                        │
   │    camera: {...} }      │                        │
   │                         │                        │
```

### 3. AI Detection Trigger Flow

```
Client                    Backend
   │                         │
   │  POST /api/admin/       │
   │  cameras/cam1/detect    │
   ├────────────────────────>│
   │                         │
   │                         │  readCameras()
   │                         │  Find camera
   │                         │
   │                         │  simulateAIDetection(camera)
   │                         │    ├─ Check time of day
   │                         │    ├─ Roll probability
   │                         │    ├─ Select category
   │                         │    ├─ Calculate confidence
   │                         │    ├─ Assign alert level
   │                         │    └─ Generate bounding box
   │                         │
   │                         │  writeCameras()
   │                         │  (update detection data)
   │                         │
   │<────────────────────────┤
   │  { detection: {         │
   │      alertLevel: "high",│
   │      detections: [...]  │
   │    }                    │
   │  }                      │
   │                         │
```

## Component Interactions

```
┌─────────────────────────────────────────────────────────┐
│                  External Simulators                     │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │   example-camera-client.js                     │    │
│  │                                                 │    │
│  │  - Monitor cameras                              │    │
│  │  - Add/update/delete cameras                    │    │
│  │  - Trigger detections                           │    │
│  │  - Update YouTube feeds                         │    │
│  └────────────────────────────────────────────────┘    │
│           │                                              │
└───────────┼──────────────────────────────────────────────┘
            │ HTTP API Calls
            ▼
┌─────────────────────────────────────────────────────────┐
│                    RanchOS Backend                       │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │  Camera Management Layer                     │      │
│  │  - CRUD operations                           │      │
│  │  - Validation                                │      │
│  │  - YouTube URL handling                      │      │
│  └──────────────────────────────────────────────┘      │
│           │                                              │
│           ▼                                              │
│  ┌──────────────────────────────────────────────┐      │
│  │  AI Detection Layer                          │      │
│  │  - Detection simulation                      │      │
│  │  - Probability calculation                   │      │
│  │  - Alert level assignment                    │      │
│  └──────────────────────────────────────────────┘      │
│           │                                              │
│           ▼                                              │
│  ┌──────────────────────────────────────────────┐      │
│  │  Storage Layer                               │      │
│  │  - cameras.json read/write                   │      │
│  │  - File system operations                    │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
└─────────────────────────────────────────────────────────┘
            │ REST API
            ▼
┌─────────────────────────────────────────────────────────┐
│                    RanchOS Frontend                      │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │  CamerasPanel Component                      │      │
│  │  - Display camera grid                       │      │
│  │  - Show video feeds                          │      │
│  │  - Display predator alerts                   │      │
│  │  - Click to expand fullscreen                │      │
│  └──────────────────────────────────────────────┘      │
│           │                                              │
│  ┌──────────────────────────────────────────────┐      │
│  │  MapPanel Component (future)                 │      │
│  │  - Show camera pins on map                   │      │
│  │  - Display alert markers                     │      │
│  │  - Click to view camera                      │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Detection Algorithm Flow

```
┌─────────────────────────────────────────────────────────┐
│          simulateAIDetection(camera)                     │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Get current time     │
            │  Extract hour         │
            └───────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Is dawn/dusk?        │
            │  (5-7am or 6-9pm)     │
            └───────────────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
             Yes                 No
              │                   │
              ▼                   ▼
        18% chance          8% chance
              │                   │
              └─────────┬─────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Roll random number   │
            │  0.0 - 1.0            │
            └───────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Detection?           │
            └───────────────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
             Yes                 No
              │                   │
              ▼                   ▼
    ┌──────────────────┐   ┌──────────────┐
    │ Select Category  │   │ Return empty │
    │                  │   │ detection    │
    │ 15% PREDATOR     │   └──────────────┘
    │ 10% THREAT       │
    │ 35% LIVESTOCK    │
    │ 40% NORMAL       │
    └──────────────────┘
              │
              ▼
    ┌──────────────────┐
    │ Choose object    │
    │ from category    │
    └──────────────────┘
              │
              ▼
    ┌──────────────────┐
    │ Calculate        │
    │ confidence       │
    │ (0.60-0.98)      │
    └──────────────────┘
              │
              ▼
    ┌──────────────────┐
    │ Assign alert     │
    │ level based on   │
    │ object type      │
    └──────────────────┘
              │
              ▼
    ┌──────────────────┐
    │ Generate         │
    │ bounding box     │
    └──────────────────┘
              │
              ▼
    ┌──────────────────┐
    │ Return detection │
    │ result           │
    └──────────────────┘
```

## Alert Level Mapping

```
┌───────────────────────────────────────────────────────┐
│                Alert Level Assignment                  │
├───────────────────────────────────────────────────────┤
│                                                        │
│  PREDATOR Detection:                                   │
│    bear, mountain_lion      → CRITICAL                │
│    wolf, coyote             → HIGH                    │
│    bobcat, fox              → MEDIUM                  │
│                                                        │
│  THREAT Detection:                                     │
│    unauthorized_vehicle     → HIGH                    │
│    unauthorized_person      → MEDIUM                  │
│    unknown_animal           → MEDIUM                  │
│                                                        │
│  LIVESTOCK Detection:                                  │
│    cattle, horse, deer, elk → NONE                    │
│                                                        │
│  NORMAL Detection:                                     │
│    bird, rabbit, vegetation → NONE                    │
│                                                        │
└───────────────────────────────────────────────────────┘
```

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│              Camera System Integration Points            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Frontend Components                                  │
│     └─ CamerasPanel.jsx (existing)                      │
│        - Already polls /api/cameras                     │
│        - Displays video feeds                           │
│        - Shows predator alerts                          │
│                                                          │
│  2. Backend Server                                       │
│     └─ server/index.js                                  │
│        - Camera helper functions added                  │
│        - AI detection engine added                      │
│        - API endpoints added                            │
│                                                          │
│  3. Configuration Storage                                │
│     └─ server/cameras.json                              │
│        - Persistent camera definitions                  │
│        - Follows existing pattern (sensors.json, etc.)  │
│                                                          │
│  4. External Simulators                                  │
│     └─ simulator/example-camera-client.js               │
│        - Can add/update/delete cameras                  │
│        - Can monitor detections                         │
│        - Can trigger manual detections                  │
│                                                          │
│  5. Map Display (future)                                 │
│     └─ MapPanel.jsx                                     │
│        - Display camera markers at lat/lon              │
│        - Show alert indicators                          │
│        - Click to view camera                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Summary

The camera sensor system is architected as a modular, scalable IoT sensor platform that:

1. **Follows existing patterns** - Mirrors sensors.json, uses Express endpoints
2. **Integrates seamlessly** - Works with existing UI components
3. **Simulates realistically** - Time-based detection, probabilistic patterns
4. **Scales efficiently** - Can handle 50+ cameras with minimal overhead
5. **Provides rich data** - Categories, confidence, alert levels, bounding boxes
6. **Supports flexibility** - Multiple YouTube URL formats, easy configuration
7. **Enables extensibility** - Clear API for external simulators
8. **Maintains consistency** - REST API follows RanchOS conventions

The architecture prioritizes:
- Simplicity (JSON files, no database)
- Performance (in-memory detection, <10ms response times)
- Maintainability (clear separation of concerns)
- Extensibility (easy to add new features)
