import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Dashboard & GIS Map ────────────────────────────────────────────────────
export const getDashboardSummary = () => client.get('/dashboard/summary')
export const getMapHotspots = () => client.get('/map/hotspots')

// ── Users ──────────────────────────────────────────────────────────────────
export const getUsers = () => client.get('/users')

// ── Incidents ──────────────────────────────────────────────────────────────
export const getIncidents = (params = {}) => client.get('/incidents', { params })
export const getIncident = (id) => client.get(`/incidents/${id}`)
export const updateIncident = (id, data) => client.patch(`/incidents/${id}`, data)
export const assignEngineer = (id, data) => client.post(`/incidents/${id}/assign`, data)
export const overridePriority = (id, data) => client.post(`/incidents/${id}/override-priority`, data)
export const mergeReport = (id, data) => client.post(`/incidents/${id}/merge-report`, data)
export const verifyIncident = (id, data) => client.post(`/incidents/${id}/verify`, data)

// ── Reports ────────────────────────────────────────────────────────────────
export const submitReport = (formData) =>
  client.post('/reports', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const getReportStatus = (trackingRef) => client.get(`/reports/${trackingRef}`)
export const getReports = (params = {}) => client.get('/reports', { params })

// ── Sensors & Zones ────────────────────────────────────────────────────────
export const getSensors = () => client.get('/sensors')
export const getSensorReadings = (sensorId, params = {}) => client.get(`/sensors/${sensorId}/readings`, { params })
export const getZones = () => client.get('/zones')
export const getZoneReadings = (zoneId, params = {}) => client.get(`/zones/${zoneId}/readings`, { params })
export const ingestReading = (data) => client.post('/sensors/readings', data)

// ── Tasks ──────────────────────────────────────────────────────────────────
export const getTasks = (params = {}) => client.get('/tasks', { params })
export const getTask = (id) => client.get(`/tasks/${id}`)
export const createTask = (data) => client.post('/tasks', data)
export const updateTask = (id, data) => client.patch(`/tasks/${id}`, data)
export const uploadProof = (taskId, formData) =>
  client.post(`/tasks/${taskId}/upload-proof`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })

// ── Simulation ─────────────────────────────────────────────────────────────
export const getScenarios = () => client.get('/simulation/scenarios')
export const triggerScenario = (data) => client.post('/simulation/scenario', data)
export const startSimulation = () => client.post('/simulation/start')
export const seedDemoData = () => client.post('/simulation/seed')
export const resetSimulation = (data = {}) => client.post('/simulation/reset', data)

export default client
