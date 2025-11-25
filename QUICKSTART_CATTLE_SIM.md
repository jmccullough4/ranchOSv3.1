# Quick Start: Cattle Herd Simulator

## Step 1: Start the RanchOS Server

```bash
# Using Docker (recommended)
docker compose up --build

# OR using npm (development)
npm run dev
```

The server will initialize with:
- 50 cattle total
- 5 designated strays (10%)
- Cattle positions within pasture boundaries

## Step 2: Configure Pasture Boundaries

### Option A: Use Admin Panel (Web UI)
1. Navigate to `http://localhost:8082`
2. Login with credentials (jay/3strands)
3. Open Admin Panel → **Pasture Boundaries**
4. Use **Generate Property & Plots from Address** to enter your ranch address, choose a coverage size/plot grid, and click **Generate**. The backend geocodes the address and saves both the fence and plots automatically—no GIS URL required.

### Option B: Manual Configuration
Edit `server/pastures.json`:

```json
{
  "pastures": [
    {
      "id": "primary",
      "name": "Main Pasture",
      "isProperty": true,
      "boundary": [
        [-104.9950, 39.1200],
        [-104.9900, 39.1200],
        [-104.9900, 39.1250],
        [-104.9950, 39.1250],
        [-104.9950, 39.1200]
      ],
      "center": {
        "lat": 39.1225,
        "lon": -104.9925
      }
    }
  ]
}
```

See `server/pastures.example.json` for a complete example.

## Step 3: View Cattle on the Map

1. Go to `http://localhost:8082`
2. Login (if not already logged in)
3. View the main dashboard with the Mapbox globe
4. Cattle will appear as colored dots:
   - **Blue** = Main herd
   - **Orange** = Strays
   - **Yellow** = Selected

## Step 4: Use the Simulation Console (Optional)

1. Open `simulator/index.html` (or use the **Simulation Console** link inside the Admin Panel).
2. The left column streams IoT sensors, while the right column controls herd dynamics.
3. Set the RanchOS URL (defaults to `http://localhost:8082`) and start driving data into the dashboard.

## Step 5: Customize Herd Behavior

### Using Web Simulator
1. Open cattle simulator UI
2. Adjust sliders:
   - **Total Cattle Count**: 1-200 (default: 50)
   - **Stray Percentage**: 0-50% (default: 10%)
   - **Herd Cohesion**: 0-1 (default: 0.1)
   - **Boundary Avoidance**: 0-1 (default: 0.3)
3. Click **Apply Configuration**
4. Click **Reset Herd Positions** to reinitialize

### Using API (curl)
```bash
# Update configuration
curl -X POST http://localhost:8082/api/simulator/herd/config \
  -H "Content-Type: application/json" \
  -d '{
    "totalCattleCount": 100,
    "strayPercentage": 15,
    "herdCohesion": 0.2,
    "boundaryAvoidanceStrength": 0.5
  }'

# Reset herd with new settings
curl -X POST http://localhost:8082/api/simulator/herd/reset
```

## Step 6: Monitor Stray Alerts

### In Main Dashboard
1. Strays appear as orange dots on the map
2. Click "Show Stray Lines" to see connections to nearest cow

### Using API
```bash
# Get active stray alerts
curl http://localhost:8082/api/stray-alerts | jq .
```

Example response:
```json
{
  "alerts": [
    {
      "cowId": "3S-048",
      "name": "Scout",
      "duration": "45m",
      "distanceToClosest": 520,
      "closestCow": {
        "id": "3S-023",
        "name": "Rosie"
      }
    }
  ]
}
```

## Step 7: Get Live Statistics

### Using Cattle Simulator
The simulator shows live stats that refresh every 3 seconds:
- Total cattle
- Main herd count
- Active stray alerts
- Average herd spread (feet)
- Fence breach status

### Using API
```bash
# Get current statistics
curl http://localhost:8082/api/simulator/herd/stats | jq .
```

## Common Scenarios

### Scenario 1: Increase Herd Size to 100 Cattle
```bash
# Update config
curl -X POST http://localhost:8082/api/simulator/herd/config \
  -H "Content-Type: application/json" \
  -d '{"totalCattleCount": 100}'

# Reset herd
curl -X POST http://localhost:8082/api/simulator/herd/reset
```

### Scenario 2: Make Herd Cluster Tightly
```bash
curl -X POST http://localhost:8082/api/simulator/herd/config \
  -H "Content-Type: application/json" \
  -d '{
    "clusterRadius": 0.005,
    "herdCohesion": 0.3,
    "strayPercentage": 5
  }'

curl -X POST http://localhost:8082/api/simulator/herd/reset
```

### Scenario 3: Prevent Fence Breaches
```bash
curl -X POST http://localhost:8082/api/simulator/herd/config \
  -H "Content-Type: application/json" \
  -d '{
    "boundaryAvoidanceStrength": 0.7,
    "movementSpeed": 0.00012
  }'

curl -X POST http://localhost:8082/api/simulator/herd/reset
```

### Scenario 4: Simulate More Wandering
```bash
curl -X POST http://localhost:8082/api/simulator/herd/config \
  -H "Content-Type: application/json" \
  -d '{
    "strayPercentage": 25,
    "strayRadius": 0.08,
    "herdCohesion": 0.05
  }'

curl -X POST http://localhost:8082/api/simulator/herd/reset
```

## Troubleshooting

### Problem: Cattle not appearing on map
**Solution**:
1. Configure pasture boundary in Admin Panel
2. Or manually create `server/pastures.json` (see Step 2)
3. Restart the server

### Problem: All cattle are strays
**Solution**:
```bash
# Reset stray percentage to default
curl -X POST http://localhost:8082/api/simulator/herd/config \
  -d '{"strayPercentage": 10}'

curl -X POST http://localhost:8082/api/simulator/herd/reset
```

### Problem: Cattle escaping boundaries
**Solution**:
```bash
# Increase boundary avoidance
curl -X POST http://localhost:8082/api/simulator/herd/config \
  -d '{"boundaryAvoidanceStrength": 0.8}'
```

### Problem: Cattle not moving
**Check**: Movement speed might be set too low
```bash
# Reset to default
curl -X POST http://localhost:8082/api/simulator/herd/config \
  -d '{"movementSpeed": 0.00018}'
```

## Advanced Usage

### Reset to Factory Defaults
```bash
curl -X POST http://localhost:8082/api/simulator/herd/config \
  -H "Content-Type: application/json" \
  -d '{
    "totalCattleCount": 50,
    "strayPercentage": 10,
    "clusterRadius": 0.01,
    "strayRadius": 0.05,
    "movementSpeed": 0.00018,
    "movementLimit": 0.0025,
    "strayDistanceThreshold": 0.01,
    "boundaryAvoidanceStrength": 0.3,
    "herdCohesion": 0.1
  }'

curl -X POST http://localhost:8082/api/simulator/herd/reset
```

### Watch Real-Time Updates
```bash
# Poll herd data every 2 seconds
watch -n 2 'curl -s http://localhost:8082/api/simulator/herd/stats | jq .'
```

### Export Current Configuration
```bash
curl -s http://localhost:8082/api/simulator/herd/config | jq . > my-herd-config.json
```

## Next Steps

- Read the full documentation: `CATTLE_SIMULATION.md`
- Explore the codebase: `server/index.js` (lines 86-400, 560-680, 871-1034)
- Check the main project README: `CLAUDE.md`
- Configure sensors using the sensor simulator: `simulator/index.html`

## Support

For issues or questions:
1. Check `CATTLE_SIMULATION.md` for detailed technical info
2. Review code comments in `server/index.js`
3. Inspect browser console for errors
4. Check server logs for backend errors
