import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getMapHotspots, seedDemoData } from '../api/client.js'
import { RefreshCw, Maximize2, Layers, Wifi } from 'lucide-react'

const PRIORITY_COLORS = {
  CRITICAL: '#DC2626',
  HIGH:     '#EA580C',
  MEDIUM:   '#D97706',
  LOW:      '#2563EB',
  RESOLVED: '#16A34A',
  OFFLINE:  '#64748B',
}

const TILE_LAYERS = {
  osm: {
    name: 'Street Map (OSM)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  light: {
    name: 'Clean GIS Light',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
  },
}

function makeIncidentIcon(priority, status, scoreOrLabel) {
  const isResolved = ['VERIFIED_RESOLVED', 'NOT_A_LEAK'].includes(status)
  const isOffline = status === 'SENSOR_OFFLINE' || status === 'OFFLINE'
  const color = isResolved
    ? PRIORITY_COLORS.RESOLVED
    : isOffline
    ? PRIORITY_COLORS.OFFLINE
    : PRIORITY_COLORS[priority] || '#0F766E'

  const badgeText = scoreOrLabel ?? (priority === 'CRITICAL' ? '!' : '•')

  const html = `
    <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:0.25;transform:scale(1.25);"></div>
      <div style="position:relative;width:32px;height:32px;border-radius:9999px;background:${color};border:2.5px solid #FFFFFF;box-shadow:0 4px 12px rgba(7,59,58,0.32);color:#FFFFFF;font-family:Inter,sans-serif;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;">
        ${badgeText}
      </div>
    </div>
  `
  return L.divIcon({
    html,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18],
    className: '',
  })
}

function makeSensorIcon(status) {
  const isOffline = status === 'OFFLINE' || status === 'STALE'
  const bg = isOffline ? '#64748B' : '#0F766E'
  const html = `
    <div style="width:26px;height:26px;border-radius:8px;background:${bg};border:2px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,0.22);color:#FFFFFF;font-family:Inter,sans-serif;font-weight:800;font-size:10px;display:flex;align-items:center;justify-content:center;">
      IoT
    </div>
  `
  return L.divIcon({
    html,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12],
    className: '',
  })
}

function makeReportIcon() {
  const html = `
    <div style="width:24px;height:24px;border-radius:9999px;background:#0284C7;border:2px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.22);color:#FFFFFF;font-family:Inter,sans-serif;font-weight:800;font-size:10px;display:flex;align-items:center;justify-content:center;">
      R
    </div>
  `
  return L.divIcon({
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
    className: '',
  })
}

function makeDraggablePinIcon() {
  const html = `
    <div style="position:relative;width:36px;height:44px;display:flex;flex-direction:column;align-items:center;">
      <div style="width:32px;height:32px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:#DC2626;border:3px solid #FFFFFF;box-shadow:0 4px 12px rgba(220,38,38,0.45);display:flex;align-items:center;justify-content:center;">
        <div style="width:10px;height:10px;border-radius:9999px;background:#FFFFFF;"></div>
      </div>
    </div>
  `
  return L.divIcon({
    html,
    iconSize: [36, 44],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
    className: '',
  })
}

export default function IncidentMap({
  incidents: propIncidents,
  zones: propZones,
  sensors: propSensors,
  reports: propReports,
  onIncidentClick,
  height = '420px',
  showZones = true,
  showSensors = true,
  showReports = false,
  showControls = true,
  interactivePin = false,
  pinPosition = null,
  onPinChange = null,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const tileLayerRef = useRef(null)
  const layerGroupRef = useRef(null)

  const [apiData, setApiData] = useState({ incidents: [], zones: [], sensors: [], reports: [] })
  const [syncing, setSyncing] = useState(false)
  const [tileKey, setTileKey] = useState('osm')
  const [layers, setLayers] = useState({
    incidents: true,
    zones: showZones,
    sensors: showSensors,
    reports: showReports,
  })

  // Fetch directly from /api/map/hotspots so map is always attached to live backend API
  const fetchFromApi = useCallback(async () => {
    setSyncing(true)
    try {
      const { data } = await getMapHotspots()
      if ((data.incidents || []).length === 0 && (!propIncidents || propIncidents.length === 0)) {
        await seedDemoData()
        const r2 = await getMapHotspots()
        setApiData({
          incidents: r2.data.incidents || [],
          zones: r2.data.zones || [],
          sensors: r2.data.sensors || [],
          reports: r2.data.reports || [],
        })
      } else {
        setApiData({
          incidents: data.incidents || [],
          zones: data.zones || [],
          sensors: data.sensors || [],
          reports: data.reports || [],
        })
      }
    } catch (err) {
      console.error('Map API sync error:', err)
    } finally {
      setSyncing(false)
    }
  }, [propIncidents])

  useEffect(() => {
    fetchFromApi()
  }, [fetchFromApi])

  // Merge props with live API data
  const activeIncidents = propIncidents && propIncidents.length > 0 ? propIncidents : apiData.incidents
  const activeZones     = propZones && propZones.length > 0 ? propZones : apiData.zones
  const activeSensors   = propSensors && propSensors.length > 0 ? propSensors : apiData.sensors
  const activeReports   = propReports && propReports.length > 0 ? propReports : apiData.reports

  // Initialize Leaflet map with proper React 18 StrictMode cleanup + ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Clean up any leftover Leaflet instance on the DOM node
    if (el._leaflet_id) {
      el._leaflet_id = null
    }

    const initialCenter = pinPosition?.lat && pinPosition?.lng
      ? [Number(pinPosition.lat), Number(pinPosition.lng)]
      : [21.2514, 81.6412]

    const map = L.map(el, {
      center: initialCenter,
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    })

    const tileCfg = TILE_LAYERS[tileKey] || TILE_LAYERS.osm
    const tileLayer = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: 19,
    }).addTo(map)

    const layerGroup = L.layerGroup().addTo(map)

    mapRef.current = map
    tileLayerRef.current = tileLayer
    layerGroupRef.current = layerGroup

    // Click handler for interactive citizen report pin
    const onMapClick = (e) => {
      if (interactivePin && onPinChange) {
        onPinChange({
          lat: e.latlng.lat.toFixed(6),
          lng: e.latlng.lng.toFixed(6),
        })
      }
    }
    map.on('click', onMapClick)

    // Ensure tiles render properly inside flex/grid layouts
    const timer1 = setTimeout(() => map.invalidateSize(), 100)
    const timer2 = setTimeout(() => map.invalidateSize(), 400)

    let resizeObserver
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize()
      })
      resizeObserver.observe(el)
    }

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      if (resizeObserver) resizeObserver.disconnect()
      map.off('click', onMapClick)
      map.remove()
      mapRef.current = null
      tileLayerRef.current = null
      layerGroupRef.current = null
    }
  }, []) // Mount once cleanly

  // Switch tile layer when user changes map style
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (tileLayerRef.current) {
      tileLayerRef.current.remove()
    }
    const tileCfg = TILE_LAYERS[tileKey] || TILE_LAYERS.osm
    tileLayerRef.current = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: 19,
    }).addTo(map)
  }, [tileKey])

  // Render markers & overlays whenever data or layer toggles change
  useEffect(() => {
    const map = mapRef.current
    const group = layerGroupRef.current
    if (!map || !group) return

    group.clearLayers()

    // 1. Water Zones Layer
    if (layers.zones && activeZones.length > 0) {
      activeZones.forEach(z => {
        const lat = Number(z.latitude ?? z.center_lat)
        const lng = Number(z.longitude ?? z.center_lng)
        if (!lat || !lng) return

        const isOffline = z.sensor_status === 'OFFLINE'
        const hasCrit = z.active_incident_priority === 'CRITICAL'
        const hasHigh = z.active_incident_priority === 'HIGH'

        const strokeColor = isOffline
          ? '#64748B'
          : hasCrit
          ? '#DC2626'
          : hasHigh
          ? '#EA580C'
          : '#0F766E'

        const circle = L.circle([lat, lng], {
          radius: 480,
          color: strokeColor,
          weight: 2,
          dashArray: isOffline ? '6 4' : null,
          fillColor: strokeColor,
          fillOpacity: hasCrit || hasHigh ? 0.13 : 0.07,
        })

        circle.bindTooltip(
          `<div style="font-family:Inter,sans-serif;font-size:11px;color:#142522;padding:2px 4px">
            <strong style="color:#073B3A">${z.zone_name || z.zone_id}</strong><br/>
            Flow: <b>${z.latest_flow_lpm ?? z.expected_flow_lpm} L/m</b> (Baseline ${z.expected_flow_lpm} L/m)<br/>
            Pressure: <b>${z.latest_pressure_psi ?? z.expected_pressure_psi} PSI</b> (Baseline ${z.expected_pressure_psi} PSI)
          </div>`,
          { sticky: true }
        )
        circle.addTo(group)
      })
    }

    // 2. IoT Sensors Layer
    if (layers.sensors && activeSensors.length > 0) {
      activeSensors.forEach(s => {
        const lat = Number(s.latitude)
        const lng = Number(s.longitude)
        if (!lat || !lng) return
        const marker = L.marker([lat, lng], { icon: makeSensorIcon(s.status) })
        marker.bindPopup(`
          <div style="min-width:190px;font-family:Inter,sans-serif;font-size:12px;color:#142522">
            <div style="font-weight:800;color:#073B3A;margin-bottom:4px">Sensor: ${s.sensor_id}</div>
            <div style="font-size:11px;color:#60736F;margin-bottom:6px">${s.zone_name || s.zone_id}</div>
            <div><b>Status:</b> ${s.status} (${s.quality_flag})</div>
            <div><b>Observed Flow:</b> ${s.flow_lpm != null ? `${s.flow_lpm} L/min` : 'STALE'} (Base: ${s.expected_flow_lpm})</div>
            <div><b>Observed Pressure:</b> ${s.pressure_psi != null ? `${s.pressure_psi} PSI` : 'STALE'} (Base: ${s.expected_pressure_psi})</div>
            <div style="margin-top:6px;font-size:10px;color:#0F766E;font-weight:600">Simulated IoT Telemetry Feed</div>
          </div>
        `)
        marker.addTo(group)
      })
    }

    // 3. Citizen Reports Layer
    if (layers.reports && activeReports.length > 0) {
      activeReports.forEach(r => {
        const lat = Number(r.latitude)
        const lng = Number(r.longitude)
        if (!lat || !lng) return
        const marker = L.marker([lat + 0.0009, lng + 0.0009], { icon: makeReportIcon() })
        marker.bindPopup(`
          <div style="min-width:190px;font-family:Inter,sans-serif;font-size:12px;color:#142522">
            <div style="font-weight:800;color:#0284C7;margin-bottom:3px">Citizen Report: ${r.tracking_reference}</div>
            <div style="font-weight:700;font-size:11px;margin-bottom:4px">${(r.issue_type || '').replace(/_/g, ' ')}</div>
            <div style="font-size:11px;color:#60736F;margin-bottom:6px">${r.description || 'Geotagged citizen leak report'}</div>
            <div><b>Status:</b> ${r.status}</div>
            ${r.incident_id ? `<div style="margin-top:4px"><a href="/incidents/${r.incident_id}" style="color:#0F766E;font-weight:700">Linked to INC-2026-${r.incident_id + 1050} →</a></div>` : ''}
          </div>
        `)
        marker.addTo(group)
      })
    }

    // 4. Incidents Layer
    if (layers.incidents && activeIncidents.length > 0) {
      activeIncidents.forEach(inc => {
        const lat = Number(inc.latitude)
        const lng = Number(inc.longitude)
        if (!lat || !lng) return

        const score = inc.priority_score ? Math.round(inc.priority_score) : inc.id
        const icon = makeIncidentIcon(inc.priority_level, inc.status, score)
        const marker = L.marker([lat, lng], { icon })

        const color = PRIORITY_COLORS[inc.priority_level] || '#0F766E'
        const popupHtml = `
          <div style="min-width:225px;font-family:Inter,sans-serif;font-size:12px;color:#142522;padding:2px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
              <strong style="font-size:13px;color:#073B3A">INC-2026-${String(inc.id + 1050)}</strong>
              <span style="background:${color};color:white;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700">
                ${inc.priority_level || 'LOW'} · ${Math.round(inc.priority_score || 0)}/100
              </span>
            </div>
            <p style="margin:2px 0 6px;color:#60736F;font-weight:600">${inc.zone_name || inc.zone_id || 'Municipal Zone'}</p>
            <p style="margin:3px 0"><b>Status:</b> ${(inc.status || '').replace(/_/g, ' ')}</p>
            <p style="margin:3px 0"><b>Confidence:</b> ${(inc.confidence_level || '').replace(/_/g, ' ')}</p>
            ${inc.estimated_excess_flow_lpm ? `<p style="margin:3px 0;color:#0F766E"><b>Est. Excess Flow:</b> +${inc.estimated_excess_flow_lpm} L/min (Sim)</p>` : ''}
            <div style="margin-top:8px;padding-top:6px;border-top:1px solid #D8E8E4;display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:10px;color:#60736F">Field verification required</span>
              <a href="/incidents/${inc.id}" style="color:#0F766E;font-weight:700;text-decoration:none">Open Incident →</a>
            </div>
          </div>
        `
        marker.bindPopup(popupHtml)
        if (onIncidentClick) {
          marker.on('click', () => onIncidentClick(inc))
        }
        marker.addTo(group)
      })
    }

    // 5. Interactive Citizen Pin (if on Report a Leak page)
    if (interactivePin && pinPosition?.lat && pinPosition?.lng) {
      const lat = Number(pinPosition.lat)
      const lng = Number(pinPosition.lng)
      if (!isNaN(lat) && !isNaN(lng)) {
        const pinMarker = L.marker([lat, lng], {
          icon: makeDraggablePinIcon(),
          draggable: true,
        })
        pinMarker.bindPopup(`
          <div style="font-family:Inter,sans-serif;font-size:12px;color:#142522">
            <strong style="color:#DC2626">Selected Leak Location</strong><br/>
            Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}<br/>
            <span style="font-size:10px;color:#60736F">Click anywhere on map or drag pin to adjust</span>
          </div>
        `)
        pinMarker.on('dragend', (ev) => {
          const pos = ev.target.getLatLng()
          if (onPinChange) {
            onPinChange({ lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) })
          }
        })
        pinMarker.addTo(group)
        map.panTo([lat, lng])
      }
    }
  }, [activeIncidents, activeZones, activeSensors, activeReports, layers, interactivePin, pinPosition, onIncidentClick, onPinChange])

  const fitAllMarkers = () => {
    const map = mapRef.current
    if (!map) return
    const pts = []
    activeIncidents.forEach(i => {
      if (i.latitude && i.longitude) pts.push([Number(i.latitude), Number(i.longitude)])
    })
    activeZones.forEach(z => {
      const lat = z.latitude ?? z.center_lat
      const lng = z.longitude ?? z.center_lng
      if (lat && lng) pts.push([Number(lat), Number(lng)])
    })
    if (pts.length > 1) {
      map.fitBounds(pts, { padding: [36, 36], maxZoom: 14 })
    } else if (pts.length === 1) {
      map.setView(pts[0], 14)
    } else {
      map.setView([21.2514, 81.6412], 13)
    }
  }

  return (
    <div className="space-y-2">
      {/* Live API Map Controls Bar */}
      {showControls && (
        <div className="flex items-center justify-between flex-wrap gap-2 bg-[#F7FBFA] border border-[#D8E8E4] rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-bold text-[#073B3A] bg-white px-2.5 py-1 rounded-lg border border-[#D8E8E4]">
              <Wifi className="w-3.5 h-3.5 text-[#16A34A]" />
              API Connected ({activeIncidents.length} Incidents · {activeZones.length} Zones)
            </span>

            {/* Layer Toggles */}
            {[
              { key: 'incidents', label: 'Incidents' },
              { key: 'zones',     label: 'Zones' },
              { key: 'sensors',   label: 'IoT Sensors' },
              { key: 'reports',   label: 'Citizen Reports' },
            ].map(l => (
              <button
                key={l.key}
                type="button"
                onClick={() => setLayers(prev => ({ ...prev, [l.key]: !prev[l.key] }))}
                className={`px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
                  layers[l.key]
                    ? 'bg-[#0F766E] text-white border-[#0F766E]'
                    : 'bg-white text-[#60736F] border-[#D8E8E4] hover:text-[#142522]'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={tileKey}
              onChange={e => setTileKey(e.target.value)}
              className="bg-white border border-[#D8E8E4] rounded-lg px-2 py-1 text-xs font-semibold text-[#142522]"
            >
              {Object.entries(TILE_LAYERS).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={fitAllMarkers}
              title="Center & Fit All Markers"
              className="p-1.5 rounded-lg bg-white border border-[#D8E8E4] hover:border-[#0F766E] text-[#073B3A]"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={fetchFromApi}
              title="Sync Live Map API"
              className="p-1.5 rounded-lg bg-white border border-[#D8E8E4] hover:border-[#0F766E] text-[#0F766E]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Map Canvas Container */}
      <div
        ref={containerRef}
        style={{ height, width: '100%', minHeight: '220px', borderRadius: '12px' }}
        className="border border-[#D8E8E4] overflow-hidden bg-[#E6F2EF] relative z-10"
      />
    </div>
  )
}
