# RanchOS Simulation Console

The unified simulation console lets you control the herd dynamics **and** stream IoT sensor data from a single web page. It speaks directly to the RanchOS Express API, so every change is instantly reflected in the main dashboard.

## Features

- **Combined UI** – herd controls, stray tuning, and sensor streaming live side-by-side.
- **Multiple Sensor Types** – water, fence voltage, gates, temperature, network, and soil probes.
- **Real-time Herd Controls** – tweak herd cohesion, boundary avoidance, stray percentages, and instantly reset anchors.
- **Activity Logs** – separate log streams for sensor pushes and herd actions.
- **Auto Registration** – the console auto-registers sensors if they don’t exist, so no manual admin work is needed.

## Getting Started

### 1. Start RanchOS Server

First, make sure the RanchOS server is running:

```bash
cd /Users/jay.mccullough/Desktop/Coding/ranchOSv2
npm run dev
```

The server should be running on `http://localhost:8082`

### 2. Open the Console

Open the combined console in your browser:

```bash
open /Users/jay.mccullough/Desktop/Coding/ranchOSv2/simulator/index.html
```

Or use a local development server:

```bash
cd simulator
python3 -m http.server 8000
# Then open http://localhost:8000
```

### 3. Configure the Simulation

1. Set the **RanchOS Server URL** (defaults to `http://localhost:8082`).
2. Adjust sensor counts and the update interval inside the **Sensor Simulator** column.
3. Tune the herd sliders (total cattle, stray percentage, cohesion, boundary avoidance, etc.).
4. Use the buttons to sync, start streaming sensors, apply herd changes, and reset anchors.

### 4. Watch the Dashboard

- Sensor cards show the last generated value and “time ago” stamps.
- The Herd stats panel mirrors the `/api/simulator/herd/stats` endpoint and refreshes automatically.
- Logs at the bottom of each section keep short summaries of every action.

## Sensor Behavior

### Water Level Sensors (💧)
- Range: 0-100%
- Behavior: Slowly decreases with slight random fluctuations
- Simulates: Tank/trough water consumption

### Fence Voltage Sensors (⚡)
- Range: 6.0-10.0 kV
- Behavior: Small random fluctuations around nominal voltage
- Simulates: Electric fence integrity monitoring

### Gate Status Sensors (🚪)
- Values: open/closed
- Behavior: Randomly changes state (10% chance per update)
- Simulates: Physical gate position

### Temperature Sensors (🌡️)
- Range: 50-90°F
- Behavior: Gradual changes with random walk
- Simulates: Ambient or equipment temperature

### Network Signal Monitors (📡)
- Range: 3-5 bars
- Behavior: Occasional signal strength changes
- Simulates: Cellular/WiFi connectivity

### Soil Moisture Sensors (🌱)
- Range: 0-60%
- Behavior: Slowly decreases with random fluctuations
- Simulates: Soil water content

## API Integration
The console talks to the same endpoints RanchOS exposes:

- `GET /api/simulator/herd/config` & `POST /api/simulator/herd/config`
- `POST /api/simulator/herd/reset`
- `GET /api/simulator/herd/stats`
- `GET /api/simulator/sensors`
- `POST /api/simulator/sensor-data` (now auto-registers sensors if a new ID arrives with `name` + `type`)

## Future Enhancements

- [ ] Preset profiles for specific ranch demos
- [ ] Bulk stray alert simulation
- [ ] Historical chart overlays
- [ ] Advanced anomaly scripts (voltage dips, soil drought, etc.)

## Notes

- Sensor values are randomized but stay inside realistic ranges for each type.
- Herd stats update every ~8 seconds and immediately after a reset.
- The console only hits routes that already exist in `server/index.js`, so it works with Docker builds too.
