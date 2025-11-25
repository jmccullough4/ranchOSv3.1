import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

function AdminMapPanel({ token, onSave, onClose, existingBoundary, existingPastures }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const drawRef = useRef(null)
  const [message, setMessage] = useState('Search for your property address to begin')
  const [isSaving, setIsSaving] = useState(false)
  const [hasPropertyBoundary, setHasPropertyBoundary] = useState(false)
  const [sensors, setSensors] = useState([])
  const [selectedSensor, setSelectedSensor] = useState(null)
  const [placedSensors, setPlacedSensors] = useState([])
  const sensorMarkersRef = useRef([])

  // Fetch available sensors
  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const response = await fetch('/api/admin/sensors')
        if (response.ok) {
          const data = await response.json()
          setSensors(data.sensors || [])

          // Load existing sensor locations
          const sensorsWithLocations = data.sensors.filter(s => s.lat && s.lon)
          setPlacedSensors(sensorsWithLocations)
        }
      } catch (err) {
        console.error('Failed to fetch sensors:', err)
      }
    }
    fetchSensors()
  }, [])

  // Store initial boundary data in a ref to prevent re-initialization on parent updates
  const initialBoundaryRef = useRef(null)
  const initialPasturesRef = useRef(null)
  const boundaryLoadedRef = useRef(false)

  // Only capture the initial boundary/pastures once
  if (!boundaryLoadedRef.current && (existingBoundary || existingPastures)) {
    initialBoundaryRef.current = existingBoundary
    initialPasturesRef.current = existingPastures
    boundaryLoadedRef.current = true
  }

  useEffect(() => {
    if (!token || mapRef.current || !mapContainerRef.current) {
      return
    }

    console.log('Initializing AdminMapPanel...')

    try {
      mapboxgl.accessToken = token

      // Initialize map - show globe view if no boundary exists
      const initialCenter = initialBoundaryRef.current?.center
        ? [initialBoundaryRef.current.center.lon, initialBoundaryRef.current.center.lat]
        : [0, 20] // Center on world view
      const initialZoom = initialBoundaryRef.current ? 16 : 1.5 // Zoom out to show full globe

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: initialCenter,
        zoom: initialZoom,
        projection: 'mercator',
      })

      map.on('error', (e) => {
        console.error('Map error:', e)
        setMessage(`Map error: ${e.error?.message || 'Unknown error'}`)
      })

      map.addControl(new mapboxgl.NavigationControl(), 'bottom-left')

      // Add geocoder for address search
      const geocoder = new MapboxGeocoder({
        accessToken: token,
        mapboxgl: mapboxgl,
        marker: false,
        placeholder: 'Search for property address...',
        countries: 'us',
      })

      map.addControl(geocoder, 'top-left')

      // Initialize drawing tools
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          point: true,
          trash: true,
        },
        styles: [
          // Property boundary style (orange/copper)
          {
            'id': 'gl-draw-polygon-fill-property',
            'type': 'fill',
            'filter': ['all', ['==', '$type', 'Polygon'], ['has', 'user_isProperty']],
            'paint': {
              'fill-color': '#c87533',
              'fill-opacity': 0.2
            }
          },
          {
            'id': 'gl-draw-polygon-stroke-property',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['has', 'user_isProperty']],
            'paint': {
              'line-color': '#ff9d5c',
              'line-width': 3,
              'line-dasharray': [2, 2]
            }
          },
          // Pasture boundary style (cyan/blue)
          {
            'id': 'gl-draw-polygon-fill-pasture',
            'type': 'fill',
            'filter': ['all', ['==', '$type', 'Polygon'], ['!has', 'user_isProperty']],
            'paint': {
              'fill-color': '#00d9ff',
              'fill-opacity': 0.15
            }
          },
          {
            'id': 'gl-draw-polygon-stroke-pasture',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['!has', 'user_isProperty']],
            'paint': {
              'line-color': '#00d9ff',
              'line-width': 2
            }
          },
          // Gate points (green)
          {
            'id': 'gl-draw-point-gate',
            'type': 'circle',
            'filter': ['all', ['==', '$type', 'Point'], ['has', 'user_isGate']],
            'paint': {
              'circle-radius': 8,
              'circle-color': '#00ff88',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2
            }
          },
          // Regular vertex points
          {
            'id': 'gl-draw-polygon-and-line-vertex-active',
            'type': 'circle',
            'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
            'paint': {
              'circle-radius': 5,
              'circle-color': '#fff'
            }
          },
          // Midpoints
          {
            'id': 'gl-draw-polygon-midpoint',
            'type': 'circle',
            'filter': ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
            'paint': {
              'circle-radius': 3,
              'circle-color': '#ffa500'
            }
          }
        ]
      })

      map.addControl(draw, 'top-right')

      // Store draw reference for external access
      drawRef.current = draw

      // Add tooltips to draw control buttons for better UX
      setTimeout(() => {
        const polygonBtn = document.querySelector('.mapbox-gl-draw_polygon')
        const pointBtn = document.querySelector('.mapbox-gl-draw_point')
        const trashBtn = document.querySelector('.mapbox-gl-draw_trash')

        if (polygonBtn) polygonBtn.setAttribute('title', 'Draw Boundary/Pasture (Polygon)')
        if (pointBtn) pointBtn.setAttribute('title', 'Place Gate (Point)')
        if (trashBtn) trashBtn.setAttribute('title', 'Delete Selected Feature')
      }, 100)

      // Load existing boundaries if they exist - ONLY ONCE on initial mount
      map.on('load', () => {
        if (initialBoundaryRef.current?.fence?.coordinates) {
          const feature = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [initialBoundaryRef.current.fence.coordinates]
            },
            properties: {
              isProperty: true
            }
          }
          draw.add(feature)
          setHasPropertyBoundary(true)
        }

        if (initialPasturesRef.current && initialPasturesRef.current.length > 0) {
          initialPasturesRef.current.forEach(pasture => {
            if (pasture.boundary) {
              draw.add({
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [pasture.boundary]
                },
                properties: {
                  isPasture: true,
                  name: pasture.name
                }
              })
            }
          })
        }

        if (initialBoundaryRef.current?.gates && initialBoundaryRef.current.gates.length > 0) {
          initialBoundaryRef.current.gates.forEach(gate => {
            draw.add({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [gate.lon, gate.lat]
              },
              properties: {
                isGate: true,
                gateName: gate.name || gate.id
              }
            })
          })
        }
      })

      mapRef.current = map
      drawRef.current = draw

      // Handle polygon drawing
      map.on('draw.create', (e) => {
        const feature = e.features[0]

        if (feature.geometry.type === 'Point') {
          // Gate placement
          const gateName = window.prompt('Enter gate name:', `Gate ${Date.now()}`)
          if (gateName) {
            draw.setFeatureProperty(feature.id, 'isGate', true)
            draw.setFeatureProperty(feature.id, 'gateName', gateName)
            setMessage(`Gate "${gateName}" placed`)
          } else {
            draw.delete(feature.id)
          }
        } else if (feature.geometry.type === 'Polygon') {
          if (!hasPropertyBoundary) {
            // First polygon is property boundary
            draw.setFeatureProperty(feature.id, 'isProperty', true)
            setHasPropertyBoundary(true)
            setMessage('Property boundary set. Now you can draw pasture subdivisions or place gates.')
          } else {
            // Subsequent polygons are pastures
            const pastureName = window.prompt('Enter pasture name:', `Pasture ${Date.now()}`)
            if (pastureName) {
              draw.setFeatureProperty(feature.id, 'isPasture', true)
              draw.setFeatureProperty(feature.id, 'name', pastureName)
              setMessage(`Pasture "${pastureName}" added`)
            } else {
              draw.delete(feature.id)
            }
          }
        }
      })

      map.on('draw.delete', () => {
        // Check if property boundary was deleted
        const allFeatures = draw.getAll()
        const propertyExists = allFeatures.features.some(f => f.properties.isProperty)
        setHasPropertyBoundary(propertyExists)
        setMessage('Feature deleted')
      })

      // Handle sensor placement clicks
      map.on('click', (e) => {
        if (selectedSensor) {
          // Prevent other handlers and map interactions
          e.preventDefault()
          if (e.originalEvent) {
            e.originalEvent.stopPropagation()
          }

          // Exit draw mode to allow sensor placement
          if (draw && draw.getMode() !== 'simple_select') {
            draw.changeMode('simple_select')
          }

          const { lng, lat } = e.lngLat

          // Add sensor marker
          const el = document.createElement('div')
          el.className = 'sensor-marker'
          el.innerHTML = getSensorIcon(selectedSensor.type)
          el.style.fontSize = '24px'
          el.style.cursor = 'pointer'

          const marker = new mapboxgl.Marker(el)
            .setLngLat([lng, lat])
            .setPopup(new mapboxgl.Popup().setHTML(`
              <strong>${selectedSensor.name}</strong><br/>
              <small>${selectedSensor.type}</small><br/>
              <button onclick="window.removeSensor('${selectedSensor.id}')" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Remove</button>
            `))
            .addTo(map)

          // Store sensor with location
          const sensorWithLocation = {
            ...selectedSensor,
            lat,
            lon: lng,
            markerId: Date.now()
          }

          setPlacedSensors(prev => [...prev, sensorWithLocation])
          sensorMarkersRef.current.push({ sensor: sensorWithLocation, marker })

          setMessage(`${selectedSensor.name} placed`)
          setSelectedSensor(null)
        }
      })

      // Global remove sensor function
      window.removeSensor = (sensorId) => {
        setPlacedSensors(prev => prev.filter(s => s.id !== sensorId))
        const markerIndex = sensorMarkersRef.current.findIndex(m => m.sensor.id === sensorId)
        if (markerIndex !== -1) {
          sensorMarkersRef.current[markerIndex].marker.remove()
          sensorMarkersRef.current.splice(markerIndex, 1)
        }
        setMessage('Sensor removed')
      }

      // Geocoder result - fetch property boundary automatically
      geocoder.on('result', async (e) => {
        const [lon, lat] = e.result.center
        map.flyTo({ center: [lon, lat], zoom: 18, duration: 1500 })

        setMessage('Searching for property boundaries...')

        try {
          // Try to fetch parcel boundary from OpenStreetMap
          // Expanded search radius and more landuse types for better ranch detection
          const overpassQuery = `
            [out:json][timeout:25];
            (
              way["landuse"="farmland"](around:500,${lat},${lon});
              way["landuse"="meadow"](around:500,${lat},${lon});
              way["landuse"="farmyard"](around:500,${lat},${lon});
              way["landuse"="grass"](around:500,${lat},${lon});
              way["landuse"="orchard"](around:500,${lat},${lon});
              way["landuse"="vineyard"](around:500,${lat},${lon});
              way["landuse"="animal_keeping"](around:500,${lat},${lon});
              way["boundary"="parcel"](around:500,${lat},${lon});
              way["boundary"="administrative"]["admin_level"~"9|10"](around:500,${lat},${lon});
              relation["landuse"="farmland"](around:500,${lat},${lon});
              relation["boundary"="parcel"](around:500,${lat},${lon});
            );
            out geom;
          `

          const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`
          const response = await fetch(overpassUrl)

          if (response.ok) {
            const data = await response.json()

            if (data.elements && data.elements.length > 0) {
              // Find closest polygon to search point
              let closestElement = null
              let minDistance = Infinity

              for (const element of data.elements) {
                if ((element.type === 'way' || element.type === 'relation') && element.geometry && element.geometry.length > 3) {
                  const firstPoint = element.geometry[0]
                  const distance = Math.sqrt(
                    Math.pow(firstPoint.lat - lat, 2) +
                    Math.pow(firstPoint.lon - lon, 2)
                  )
                  if (distance < minDistance) {
                    minDistance = distance
                    closestElement = element
                  }
                }
              }

              if (closestElement && closestElement.geometry) {
                // Clear existing drawings
                draw.deleteAll()

                const coords = closestElement.geometry.map(point => [point.lon, point.lat])
                // Close the polygon if not already closed
                if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
                  coords.push(coords[0])
                }

                const propertyFeature = {
                  type: 'Feature',
                  geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                  },
                  properties: {
                    isProperty: true
                  }
                }
                draw.add(propertyFeature)
                setHasPropertyBoundary(true)

                // Fit bounds to property
                const bounds = coords.reduce((acc, coord) => {
                  if (!acc) return new mapboxgl.LngLatBounds(coord, coord)
                  acc.extend(coord)
                  return acc
                }, null)

                if (bounds) {
                  map.fitBounds(bounds, { padding: 80 })
                }

                setMessage('Property boundary imported from OpenStreetMap! You can edit this boundary or draw pasture subdivisions.')
                return
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch parcel boundary:', error)
        }

        // Fallback: Warn user that automatic detection failed
        setMessage('Could not find property boundary automatically. Please draw manually using the polygon tool above.')
      })

      return () => {
        if (mapRef.current) {
          mapRef.current.remove()
          mapRef.current = null
        }
        drawRef.current = null
        sensorMarkersRef.current.forEach(({ marker }) => marker.remove())
        sensorMarkersRef.current = []
      }
    } catch (error) {
      console.error('Failed to initialize map:', error)
      setMessage(`Failed to initialize map: ${error.message}`)
    }
  }, [token])

  // Update sensor markers when placed sensors change
  useEffect(() => {
    if (!mapRef.current) return

    // Clear existing markers
    sensorMarkersRef.current.forEach(({ marker }) => marker.remove())
    sensorMarkersRef.current = []

    // Add markers for placed sensors
    placedSensors.forEach(sensor => {
      const el = document.createElement('div')
      el.className = 'sensor-marker'
      el.innerHTML = getSensorIcon(sensor.type)
      el.style.fontSize = '24px'
      el.style.cursor = 'pointer'

      const marker = new mapboxgl.Marker(el)
        .setLngLat([sensor.lon, sensor.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <strong>${sensor.name}</strong><br/>
          <small>${sensor.type}</small><br/>
          <button onclick="window.removeSensor('${sensor.id}')" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Remove</button>
        `))
        .addTo(mapRef.current)

      sensorMarkersRef.current.push({ sensor, marker })
    })
  }, [placedSensors])

  const getSensorIcon = (type) => {
    const icons = {
      temperature: '🌡️',
      water: '💧',
      fence: '⚡',
      gate: '🚪',
      network: '📡',
      weather: '🌤️',
      soil: '🌱',
      camera: '📹'
    }
    return icons[type] || '📊'
  }

  const handleSave = async () => {
    if (!drawRef.current) return

    setIsSaving(true)
    setMessage('Saving...')

    try {
      const allFeatures = drawRef.current.getAll()

      // Find property boundary
      const propertyFeature = allFeatures.features.find(f => f.properties.isProperty)

      if (!propertyFeature) {
        setMessage('Error: Please draw a property boundary first (or search for an address)')
        setIsSaving(false)
        return
      }

      const propertyCoords = propertyFeature.geometry.coordinates[0]

      // Calculate center
      const center = {
        lon: propertyCoords.reduce((sum, coord) => sum + coord[0], 0) / propertyCoords.length,
        lat: propertyCoords.reduce((sum, coord) => sum + coord[1], 0) / propertyCoords.length
      }

      // Get gates
      const gateFeatures = allFeatures.features.filter(f => f.properties.isGate)
      const gatesData = gateFeatures.map(f => ({
        id: f.properties.gateName || `Gate-${Date.now()}`,
        name: f.properties.gateName || 'Unnamed Gate',
        status: 'closed',
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0]
      }))

      // Save property boundary
      const propertyResponse = await fetch('/api/admin/pasture/primary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Primary Property',
          boundary: propertyCoords,
          center: center,
          gates: gatesData
        })
      })

      if (!propertyResponse.ok) {
        throw new Error('Failed to save property boundary')
      }

      // Get pastures
      const pastureFeatures = allFeatures.features.filter(f => f.properties.isPasture)

      const pasturesData = {
        pastures: [
          {
            id: 'primary',
            name: 'Primary Property',
            boundary: propertyCoords,
            center: center,
            isProperty: true,
            gates: gatesData
          },
          ...pastureFeatures.map((f, i) => ({
            id: `pasture-${Date.now()}-${i}`,
            name: f.properties.name || `Pasture ${i + 1}`,
            boundary: f.geometry.coordinates[0],
            createdAt: new Date().toISOString()
          }))
        ]
      }

      // Save all pastures
      const pasturesSaveResponse = await fetch('/api/admin/pastures/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pasturesData)
      })

      if (!pasturesSaveResponse.ok) {
        throw new Error('Failed to save pastures')
      }

      // Save sensor locations
      for (const sensor of placedSensors) {
        await fetch(`/api/admin/sensors/${sensor.id}/location`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: sensor.lat,
            lon: sensor.lon
          })
        })
      }

      setMessage(`✓ Saved! Property boundary, ${pastureFeatures.length} pasture(s), ${gatesData.length} gate(s), and ${placedSensors.length} sensor(s)`)

      setTimeout(() => {
        if (onClose) onClose()
        if (onSave) onSave()
      }, 1500)
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const unplacedSensors = sensors.filter(s => !placedSensors.some(ps => ps.id === s.id))

  return (
    <div className="admin-map-panel">
      <div className="admin-map-header">
        <div>
          <h3>Property & Pasture Boundary Manager</h3>
          <p className="admin-map-instructions">
            <strong>Step 1:</strong> Search for your property address above. The system will try to import the actual property boundary automatically.<br/>
            <strong>Step 2:</strong> Draw pasture subdivisions using the polygon tool (if needed).<br/>
            <strong>Step 3:</strong> Place gates using the point tool.<br/>
            <strong>Step 4:</strong> Click sensors below, then click on map to place them.<br/>
            <strong>Step 5:</strong> Click "Save All" to persist your changes.
          </p>
        </div>
        <button className="admin-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="admin-map-layout">
        <div className="admin-map-sidebar">
          <h4>Available Sensors</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
            Click a sensor, then click on the map to place it
          </p>
          {unplacedSensors.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              All sensors placed or no sensors configured
            </div>
          ) : (
            <div className="sensor-list">
              {unplacedSensors.map(sensor => (
                <div
                  key={sensor.id}
                  className={`sensor-item ${selectedSensor?.id === sensor.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedSensor(sensor)
                    setMessage(`Click on the map to place "${sensor.name}"`)
                    // Exit draw mode when sensor is selected
                    if (drawRef.current) {
                      drawRef.current.changeMode('simple_select')
                    }
                  }}
                >
                  <span className="sensor-icon">{getSensorIcon(sensor.type)}</span>
                  <div className="sensor-info">
                    <div className="sensor-name">{sensor.name}</div>
                    <div className="sensor-type">{sensor.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {placedSensors.length > 0 && (
            <>
              <h4 style={{ marginTop: '2rem' }}>Placed Sensors ({placedSensors.length})</h4>
              <div className="sensor-list">
                {placedSensors.map(sensor => (
                  <div key={sensor.markerId} className="sensor-item placed">
                    <span className="sensor-icon">{getSensorIcon(sensor.type)}</span>
                    <div className="sensor-info">
                      <div className="sensor-name">{sensor.name}</div>
                      <div className="sensor-type">{sensor.lat.toFixed(5)}, {sensor.lon.toFixed(5)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="admin-map-main">
          <div className="admin-map-controls">
            <div className="admin-map-message">
              {message}
            </div>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving}
              style={{ marginTop: '1rem' }}
            >
              {isSaving ? 'Saving...' : 'Save All'}
            </button>
          </div>

          <div ref={mapContainerRef} className="admin-map-container" />
        </div>
      </div>
    </div>
  )
}

export default AdminMapPanel
