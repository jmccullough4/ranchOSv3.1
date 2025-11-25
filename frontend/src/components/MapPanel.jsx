import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

const STRAY_DISTANCE_THRESHOLD = 0.01

const toHerdGeoJson = (herd, center) => ({
  type: 'FeatureCollection',
  features: herd.map((cow) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [cow.lon, cow.lat],
    },
    properties: {
      id: cow.id,
      name: cow.name,
      weight: cow.weight,
      temperature: cow.temperature,
      vaccines: JSON.stringify(cow.vaccines || []),
      stray: center
        ? Math.sqrt((cow.lat - center.lat) ** 2 + (cow.lon - center.lon) ** 2) > STRAY_DISTANCE_THRESHOLD
        : false,
    },
  })),
})

const toGateGeoJson = (gates) => ({
  type: 'FeatureCollection',
  features: gates.map((gate) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [gate.lon, gate.lat],
    },
    properties: gate,
  })),
})

const toFenceGeoJson = (fence) => ({
  type: 'FeatureCollection',
  features: fence?.coordinates
    ? [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [fence.coordinates],
          },
        },
      ]
    : [],
})

const toPasturesGeoJson = (pastures) => ({
  type: 'FeatureCollection',
  features: pastures
    ? pastures
        .filter(p => p.boundary && !p.isProperty)
        .map(pasture => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [pasture.boundary],
          },
          properties: {
            id: pasture.id,
            name: pasture.name,
          },
        }))
    : [],
})

const toSensorsGeoJson = (sensors) => ({
  type: 'FeatureCollection',
  features: sensors
    ? sensors
        .filter(s => s.lat && s.lon)
        .map(sensor => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [sensor.lon, sensor.lat],
          },
          properties: {
            id: sensor.id,
            name: sensor.name,
            type: sensor.type,
            status: sensor.status || 'active',
          },
        }))
    : [],
})

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

function MapPanel({ token, center, herd, gates, fence, selectedCow, onSelectCow, strayAlerts = [], showStrayLines = [], pastures = [], sensors = [] }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const selectedCowRef = useRef(selectedCow)

  // Check if system has any data configured
  const hasData = (herd && herd.length > 0) ||
                   (gates && gates.length > 0) ||
                   (fence && fence.coordinates && fence.coordinates.length > 0) ||
                   (sensors && sensors.length > 0) ||
                   (pastures && pastures.length > 0)
  const shouldShowEmptyState = !hasData

  useEffect(() => {
    if (shouldShowEmptyState) return
    if (!token || mapRef.current || !mapContainerRef.current || !center) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: center ? [center.lon, center.lat] : [-98.5795, 39.8283],
      zoom: center ? 13 : 4,
      projection: 'globe',
      pitch: 55,
      bearing: -20,
      antialias: true,
    })

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-left')

    map.on('style.load', () => {
      map.setFog({
        color: '#0a0e14',
        range: [0.5, 12],
        'horizon-blend': 0.2,
        'high-color': '#2d5f4f',
        'space-color': '#0a0e14',
        'star-intensity': 0.2,
      })
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.7 })

      map.addSource('fence', {
        type: 'geojson',
        data: toFenceGeoJson(fence),
      })
      map.addLayer({
        id: 'fence-fill',
        type: 'fill',
        source: 'fence',
        paint: {
          'fill-color': '#c87533',
          'fill-opacity': 0.12,
        },
      })
      // Fence glow/shadow layer
      map.addLayer({
        id: 'fence-line-glow',
        type: 'line',
        source: 'fence',
        paint: {
          'line-color': '#ff9d5c',
          'line-width': 8,
          'line-blur': 4,
          'line-opacity': 0.6,
        },
      })
      // Main fence line
      map.addLayer({
        id: 'fence-line',
        type: 'line',
        source: 'fence',
        paint: {
          'line-color': '#ffb380',
          'line-width': 4,
          'line-dasharray': [4, 2],
          'line-opacity': 1,
        },
      })

      // Pasture boundaries
      map.addSource('pastures', {
        type: 'geojson',
        data: toPasturesGeoJson(pastures),
      })
      map.addLayer({
        id: 'pastures-fill',
        type: 'fill',
        source: 'pastures',
        paint: {
          'fill-color': '#00d9ff',
          'fill-opacity': 0.08,
        },
      })
      map.addLayer({
        id: 'pastures-line',
        type: 'line',
        source: 'pastures',
        paint: {
          'line-color': '#00d9ff',
          'line-width': 2,
          'line-opacity': 0.9,
        },
      })
      // Pasture labels
      map.addLayer({
        id: 'pastures-labels',
        type: 'symbol',
        source: 'pastures',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#00d9ff',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
        },
      })

      map.addSource('herd', {
        type: 'geojson',
        data: toHerdGeoJson(herd, center),
      })
      map.addLayer({
        id: 'herd-points',
        type: 'circle',
        source: 'herd',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 6],
          'circle-color': ['case', ['==', ['get', 'stray'], true], '#ff6b35', '#00d9ff'],
          'circle-opacity': 1,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5,
        },
      })

      map.addLayer({
        id: 'herd-selected',
        type: 'circle',
        source: 'herd',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 16, 9],
          'circle-color': '#ffed4e',
          'circle-opacity': 1,
          'circle-stroke-color': '#000000',
          'circle-stroke-width': 3,
        },
        filter: ['==', ['get', 'id'], ''],
      })

      map.addSource('gates', {
        type: 'geojson',
        data: toGateGeoJson(gates),
      })

      // Gate background/base
      map.addLayer({
        id: 'gate-base',
        type: 'symbol',
        source: 'gates',
        layout: {
          'text-field': '■',
          'text-size': 28,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#1a1f26',
          'text-halo-width': 3,
        },
      })

      // Gate status indicator
      map.addLayer({
        id: 'gate-status',
        type: 'symbol',
        source: 'gates',
        layout: {
          'text-field': '■',
          'text-size': 18,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': ['match', ['get', 'status'], 'open', '#ff3b3b', 'closed', '#00ff88', '#00ff88'],
        },
      })

      // Gate icon overlay
      map.addLayer({
        id: 'gate-labels',
        type: 'symbol',
        source: 'gates',
        layout: {
          'text-field': '⛩',
          'text-size': 16,
          'text-offset': [0, -1.8],
          'text-anchor': 'bottom',
        },
        paint: {
          'text-color': ['match', ['get', 'status'], 'open', '#ff3b3b', 'closed', '#00ff88', '#00ff88'],
          'text-halo-color': '#000000',
          'text-halo-width': 2,
        },
      })

      // Gate name labels
      map.addLayer({
        id: 'gate-name-labels',
        type: 'symbol',
        source: 'gates',
        layout: {
          'text-field': ['get', 'id'],
          'text-offset': [0, 2.2],
          'text-anchor': 'top',
          'text-size': 10,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
        },
      })

      // Sensors
      map.addSource('sensors', {
        type: 'geojson',
        data: toSensorsGeoJson(sensors),
      })

      // Sensor background circle
      map.addLayer({
        id: 'sensor-base',
        type: 'circle',
        source: 'sensors',
        paint: {
          'circle-radius': 14,
          'circle-color': '#1a1f26',
          'circle-opacity': 0.9,
          'circle-stroke-color': '#d97706',
          'circle-stroke-width': 2,
        },
      })

      // Sensor icon (using text layer with emoji)
      map.addLayer({
        id: 'sensor-icons',
        type: 'symbol',
        source: 'sensors',
        layout: {
          'text-field': ['get', 'type'],
          'text-size': 16,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })

      // Sensor name labels
      map.addLayer({
        id: 'sensor-labels',
        type: 'symbol',
        source: 'sensors',
        layout: {
          'text-field': ['get', 'name'],
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-size': 9,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
        },
        paint: {
          'text-color': '#d97706',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
        },
      })

      map.on('click', 'herd-points', (event) => {
        const feature = event.features && event.features[0]
        if (!feature) return
        const coordinates = feature.geometry.coordinates
        const props = feature.properties
        if (selectedCowRef.current?.id === props.id) {
          selectedCowRef.current = null
          onSelectCow(null)
          return
        }
        let vaccines = []
        try {
          vaccines = JSON.parse(props.vaccines)
        } catch (error) {
          vaccines = []
        }
        const selection = {
          id: props.id,
          name: props.name,
          weight: Number(props.weight),
          temperature: Number(props.temperature),
          vaccines,
          lat: coordinates[1],
          lon: coordinates[0],
        }
        selectedCowRef.current = selection
        onSelectCow(selection)
      })
      map.on('mouseenter', 'herd-points', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'herd-points', () => {
        map.getCanvas().style.cursor = ''
      })

      // Sensor click handler
      map.on('click', 'sensor-base', (event) => {
        const feature = event.features && event.features[0]
        if (!feature) return
        const coordinates = feature.geometry.coordinates.slice()
        const props = feature.properties

        // Ensure popup doesn't go off-screen
        while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360
        }

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`
            <div style="padding: 8px;">
              <strong style="color: #d97706; font-size: 0.9rem;">${getSensorIcon(props.type)} ${props.name}</strong><br/>
              <small style="color: #64748b;">Type: ${props.type}</small><br/>
              <small style="color: #64748b;">Status: <span style="color: ${props.status === 'active' ? '#22c55e' : '#ef4444'};">${props.status}</span></small>
            </div>
          `)
          .addTo(map)
      })

      map.on('mouseenter', 'sensor-base', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'sensor-base', () => {
        map.getCanvas().style.cursor = ''
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [token, onSelectCow, shouldShowEmptyState])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !center) return;

    // Only fly if the center has actually changed
    const currentCenter = map.getCenter();
    const distance = Math.sqrt(
      Math.pow(currentCenter.lat - center.lat, 2) +
      Math.pow(currentCenter.lng - center.lon, 2)
    );

    if (distance > 0.0001) { // Only fly if center moved significantly
        map.flyTo({
            center: [center.lon, center.lat],
            zoom: 14,
            speed: 0.8
        });
    }
  }, [center]);

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getSource('herd')) {
      map.getSource('herd').setData(toHerdGeoJson(herd, center))
    }
  }, [herd, center])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getSource('gates')) {
      map.getSource('gates').setData(toGateGeoJson(gates))
    }
  }, [gates])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getSource('fence')) {
      map.getSource('fence').setData(toFenceGeoJson(fence))
    }
  }, [fence])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getSource('pastures')) {
      map.getSource('pastures').setData(toPasturesGeoJson(pastures))
    }
  }, [pastures])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getSource('sensors')) {
      // Transform sensor types to icons before setting data
      const sensorsWithIcons = sensors.map(s => ({
        ...s,
        iconType: s.type // Store original type
      }))
      const geoJson = toSensorsGeoJson(sensorsWithIcons)
      // Replace type with emoji in properties
      geoJson.features = geoJson.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          type: getSensorIcon(f.properties.type)
        }
      }))
      map.getSource('sensors').setData(geoJson)
    }
  }, [sensors])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer('herd-selected')) {
      map.setFilter('herd-selected', ['==', ['get', 'id'], selectedCow?.id ?? ''])
    }
    if (selectedCow) {
      map.flyTo({ center: [selectedCow.lon, selectedCow.lat], zoom: 14.5, speed: 0.6 })
    }
    selectedCowRef.current = selectedCow
  }, [selectedCow])

  // Handle stray connection lines
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const sourceId = 'stray-lines'
    const layerId = 'stray-lines-layer'

    // Create GeoJSON for stray connection lines
    const linesGeoJSON = {
      type: 'FeatureCollection',
      features: showStrayLines && strayAlerts.length > 0
        ? strayAlerts
            .filter(alert => alert.closestCow)
            .map(alert => ({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [alert.lon, alert.lat],
                  [alert.closestCow.lon, alert.closestCow.lat]
                ]
              },
              properties: {
                strayId: alert.cowId,
                distance: alert.distanceToClosest
              }
            }))
        : []
    }

    // Add or update source
    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(linesGeoJSON)
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: linesGeoJSON
      })

      // Add line layer
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#ffb380',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.8
        }
      })

      // Add arrow/dot layer at the end of each line
      map.addLayer({
        id: `${layerId}-arrows`,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 5,
          'circle-color': '#ffb380',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      })
    }
  }, [strayAlerts, showStrayLines])

  // Empty state - show message when no ranch assets are configured
  if (shouldShowEmptyState) {
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-primary)',
        zIndex: 1000
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏜️</div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
            No Ranch Data Configured
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            This ranch hasn't been set up yet. Use the Admin Panel to configure your property boundary,
            add cattle, place sensors, and connect cameras.
          </p>
          <div style={{
            padding: '1rem',
            background: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'left',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)'
          }}>
            <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              To get started:
            </strong>
            <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li>Open the Admin Panel (gear icon)</li>
              <li>Go to "Pasture Boundaries" and set your property</li>
              <li>Add cattle in "Cattle Management"</li>
              <li>Configure sensors and cameras</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  // Show placeholder if no center is configured
  if (!center) {
    return (
      <div className="mapbox-canvas" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0e14 0%, #1a1f26 100%)',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📍</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Property Boundary Not Configured
          </div>
          <div style={{ maxWidth: '400px', lineHeight: 1.6 }}>
            Admin users can configure the ranch boundary by entering a property address in the Admin Panel.
          </div>
        </div>
      </div>
    )
  }

  return <div ref={mapContainerRef} className="mapbox-canvas" />
}

export default MapPanel
