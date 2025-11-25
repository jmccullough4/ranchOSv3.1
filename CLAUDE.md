# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a demo application for **3 Strands Cattle Co., LLC** that simulates a smart livestock ranch management system. The application features real-time monitoring of cattle, sensors, gates, security cameras, and ranch operations through an interactive dashboard with a 3D Mapbox globe interface.

## Development Commands

### Running the Application

**Production (Docker):**
```bash
docker compose up --build --remove-orphans
# Access at http://localhost:8082
```

**Development mode (hot reload):**
```bash
npm run dev
# Frontend: http://localhost:5173 (Vite)
# Backend: http://localhost:8082 (Express)
```

### Building

```bash
npm run build          # Build React frontend to frontend/dist
npm start             # Run production server (requires built frontend)
```

### Preview

```bash
npm run preview        # Preview production build locally on port 4173
```

## Architecture

### Dual Backend Structure

This project has **two backend implementations** that serve the same purpose:

1. **Express (Node.js)** - `server/index.js` - **Primary/Active**
   - Single-file Express server that serves the React build and provides REST API endpoints
   - Handles simulation logic for sensors, herd movement, gates, chute operations, and cameras
   - This is what runs in Docker and production

2. **FastAPI (Python)** - `backend/app.py` - **Alternative/Unused**
   - Python implementation with equivalent functionality
   - Not currently used in Docker or npm scripts
   - Kept as an alternative backend option

**When making changes:** Update the Express backend (`server/index.js`) unless specifically working on the Python alternative.

### Frontend Architecture

**Framework:** React 18 + Vite

**Key Components:**
- `App.jsx` - Main application container, manages authentication state and data polling
- `MapPanel.jsx` - Mapbox GL globe view with 3D terrain, cattle markers, fence perimeter, and gates
- `SensorBoard.jsx` - Real-time sensor status indicators (SYSTEM, WATER, FENCE, GATE, NETWORK, ALERTS)
- `CowDetails.jsx` - Individual cattle information panel (ID, weight, temperature, vaccines)
- `ChutePanel.jsx` - Live chute scale transactions and operator logs
- `CamerasPanel.jsx` - Quad security camera wall with predator alerts
- `LoginOverlay.jsx` - Authentication overlay for operators
- `NotificationsTray.jsx` / `NotificationsCenter.jsx` - Demo notification system (gated behind demo mode)

**Data Flow:**
- App.jsx polls Express REST endpoints at different intervals (5-10 seconds)
- All simulation state is server-side; client receives updated snapshots
- Herd positions drift gradually with constraints to stay within fence boundaries
- Fence breach detection automatically escalates perimeter alarms

### Backend Simulation Logic

**Herd Simulation (`server/index.js`):**
- 50 cattle total: 45 main herd + 5 strays
- Positions initialized within fence polygon using ray-casting point-in-polygon algorithm
- Gradual drift applied on each request (±0.00018 degrees, clamped to ±0.0025 total movement)
- Fence constraint system pulls breached cattle back toward ranch center iteratively
- Breach detection triggers 30-second FENCE alarm state

**Sensor Data:**
- Water levels, fence voltage, network strength randomized on each request
- Gate status tracked in server state, toggleable via POST endpoints
- Chute transactions simulate scale readings with operator names and notes

**Mapbox Integration:**
- Token resolved from `MAPBOX_TOKEN` env var, Docker secrets, or fallback default
- Requires globe view with terrain DEM tileset (`mapbox.mapbox-terrain-dem-v1`)

## Authentication

**Valid Users:** jay, kevin, april, ashley
**Password:** `3strands`

Login is handled via `POST /api/login` with username/password validation.

## Static Assets

The application requires these assets in `frontend/public/static/`:
- `logo.png` - Company logo (header, login, favicon)
- `media/cameras/cam1.mp4` through `cam4.mp4` - Security camera video feeds

These are **not** checked into git. Copy them manually before building.

## API Endpoints

**All endpoints are in `server/index.js`:**

- `POST /api/login` - Authenticate user
- `GET /api/sensors` - Sensor status (WATER, FENCE, GATE, NETWORK, SYSTEM, ALERTS)
- `GET /api/herd` - Cattle positions, properties, and vaccines
- `GET /api/gates` - Gate statuses and locations
- `POST /api/gates` - Toggle gate open/closed state
- `GET /api/chute` - Latest chute transaction
- `GET /api/cameras` - Camera feed statuses and alerts
- `GET /api/config` - Mapbox token and ranch center coordinates
- `GET /` - Serves React app from `frontend/dist`

## Key Implementation Details

**Fence Polygon Constraint:**
The fence perimeter is defined as a 5-point polygon in lon/lat coordinates. The `isPointInPolygon` ray-casting algorithm determines if cattle are inside bounds. The `constrainToFence` function iteratively pulls escaped cattle back toward the ranch center, marking them as breached.

**Persistent State:**
- Herd positions (`herdPositions`) persist across requests and drift gradually
- Fence breach timer (`fenceBreachActiveUntil`) maintains alarm state for 30 seconds
- Gate states are mutable via POST requests and affect sensor readings

**Demo Notifications:**
The notification system is gated behind a demo mode flag. Notifications cycle through predefined events (soil moisture, gate alerts, predator detection, generator status) at 7-second intervals when enabled.

## Docker Build

The Dockerfile uses a multi-stage build:
1. `deps` - Install all npm dependencies
2. `build` - Run `npm run build` to compile frontend
3. `runtime` - Production image with only runtime deps and built artifacts

The container runs `npm start` which executes `server/index.js` with `NODE_ENV=production`.

## Environment Variables

- `MAPBOX_TOKEN` - Mapbox access token (defaults to embedded token if not provided)
- `PORT` - Server port (defaults to 8082)
- `NODE_ENV` - Node environment (set to `production` in Docker)
