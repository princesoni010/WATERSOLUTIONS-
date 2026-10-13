import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardSummary, seedDemoData } from '../api/client.js'
import IncidentMap from '../components/IncidentMap.jsx'
import { PriorityBadge, StatusBadge, ConfidenceBadge } from '../components/KPIcards.jsx'
import { Layers, MapPin, ArrowRight, RotateCcw, Eye } from 'lucide-react'

export default function LiveMap() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [zoneFilter, setZoneFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [mode, setMode] = useState('clusters')
  const [selectedIncident, setSelectedIncident] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getDashboardSummary()
      if ((data.map_incidents || []).length === 0) {
        await seedDemoData()
        const r2 = await getDashboardSummary()
        setSummary(r2.data)
        setSelectedIncident(r2.data.map_incidents?.[0] || null)
      } else {
        setSummary(data)
        setSelectedIncident(data.map_incidents?.[0] || null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const allIncidents = summary?.map_incidents || []
  const zones = summary?.zone_status || []

  const filtered = allIncidents.filter(inc => {
    if (zoneFilter !== 'ALL' && inc.zone_id !== zoneFilter) return false
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false
    if (priorityFilter !== 'ALL' && inc.priority_level !== priorityFilter) return false
    return true
  })

  const critCount = filtered.filter(i => i.priority_level === 'CRITICAL').length
  const highCount = filtered.filter(i => i.priority_level === 'HIGH').length
  const medCount  = filtered.filter(i => i.priority_level === 'MEDIUM').length
  const lowCount  = filtered.filter(i => i.priority_level === 'LOW').length

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#073B3A]">Live Map &amp; Hotspots</h1>
          <p className="text-xs text-[#60736F] font-medium">
            Real-time suspected incidents, citizen report clusters, and zone sensor anomalies
          </p>
        </div>

        {/* Filter bar matching top of Live Map mockup */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={zoneFilter}
            onChange={e => setZoneFilter(e.target.value)}
            className="ag-input py-1.5 text-xs font-semibold"
          >
            <option value="ALL">All Zones</option>
            {['ZONE-A', 'ZONE-B', 'ZONE-C', 'ZONE-D', 'ZONE-E'].map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="ag-input py-1.5 text-xs font-semibold"
          >
            <option value="ALL">All Status</option>
            <option value="SUSPECTED">Suspected</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="INSPECTION_ASSIGNED">Inspection Assigned</option>
            <option value="FIELD_CONFIRMED">Field Confirmed</option>
            <option value="VERIFIED_RESOLVED">Verified Resolved</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="ag-input py-1.5 text-xs font-semibold"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <div className="inline-flex rounded-[10px] border border-[#D8E8E4] bg-white p-0.5">
            <button
              onClick={() => setMode('heatmap')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'heatmap' ? 'bg-[#0F766E] text-white' : 'text-[#60736F] hover:text-[#142522]'
              }`}
            >
              Zone Overlays
            </button>
            <button
              onClick={() => setMode('clusters')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'clusters' ? 'bg-[#0F766E] text-white' : 'text-[#60736F] hover:text-[#142522]'
              }`}
            >
              Clusters &amp; Pins
            </button>
          </div>

          <button
            onClick={() => { setZoneFilter('ALL'); setStatusFilter('ALL'); setPriorityFilter('ALL') }}
            className="ag-btn-secondary py-1.5 px-3 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Main Map Canvas + Right Sidebar Overlay matching top-right mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-9 relative ag-card p-2">
          <IncidentMap
            incidents={filtered}
            zones={zones}
            showZones={true}
            height="600px"
            onIncidentClick={(inc) => setSelectedIncident(inc)}
          />

          {/* Bottom Floating Legend Pill */}
          <div className="mt-2 px-3 py-2 bg-white rounded-xl border border-[#D8E8E4] flex items-center justify-between flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> Critical
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" /> High
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Medium
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" /> Low
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" /> Verified Resolved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#64748B]" /> Sensor Offline
              </span>
            </div>
            <span className="text-[11px] text-[#60736F]">
              Numbers inside pins indicate AI Priority Score (0–100)
            </span>
          </div>
        </div>

        {/* Right Column: Incidents Summary Card + Map Key + Selected Incident Drawer */}
        <div className="lg:col-span-3 space-y-4">
          {/* Incidents Counter Card from Mockup */}
          <div className="ag-card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#142522]">Incidents</h2>
              <p className="text-3xl font-extrabold text-[#073B3A] mt-1">{filtered.length}</p>
              <p className="text-xs text-[#60736F]">Total on Map</p>
            </div>

            <div className="space-y-2 text-xs border-t border-[#D8E8E4] pt-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> Critical
                </span>
                <span className="font-bold text-[#142522]">{critCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" /> High
                </span>
                <span className="font-bold text-[#142522]">{highCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Medium
                </span>
                <span className="font-bold text-[#142522]">{medCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" /> Low
                </span>
                <span className="font-bold text-[#142522]">{lowCount}</span>
              </div>
            </div>

            <Link to="/incidents" className="ag-btn-primary w-full text-xs py-2.5">
              View Incidents List
            </Link>
          </div>

          {/* Selected Marker Quick Detail Card */}
          {selectedIncident && (
            <div className="ag-card p-5 space-y-3 border-2 border-[#14B8A6]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-extrabold text-[#073B3A]">
                  INC-2026-{String(selectedIncident.id + 1050)}
                </span>
                <PriorityBadge level={selectedIncident.priority_level} score={selectedIncident.priority_score} />
              </div>

              <p className="text-xs font-bold text-[#142522]">{selectedIncident.zone_name}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={selectedIncident.status} />
                <ConfidenceBadge level={selectedIncident.confidence_level} />
              </div>

              {selectedIncident.estimated_excess_flow_lpm > 0 && (
                <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-lg p-2.5 text-xs text-[#0F766E]">
                  <strong>+{selectedIncident.estimated_excess_flow_lpm} L/min</strong> excess · Est.{' '}
                  <strong>{Number(selectedIncident.estimated_loss_24h_liters).toLocaleString()} L/24h</strong>
                </div>
              )}

              <p className="text-[11px] text-[#60736F] line-clamp-3">
                {selectedIncident.ai_summary}
              </p>

              <Link
                to={`/incidents/${selectedIncident.id}`}
                className="ag-btn-secondary w-full text-xs py-2 border-[#0F766E] text-[#0F766E]"
              >
                <Eye className="w-3.5 h-3.5" />
                Open Incident Details →
              </Link>
            </div>
          )}

          {/* Map Key Card */}
          <div className="ag-card p-5 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#60736F]">Map Key</h3>
            <div className="space-y-2 text-xs text-[#142522]">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center">86</span>
                <span>Critical Suspected Leak</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#EA580C] text-white text-[10px] font-bold flex items-center justify-center">74</span>
                <span>High Priority Corroborated</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#D97706] text-white text-[10px] font-bold flex items-center justify-center">48</span>
                <span>Medium Priority / Review</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#16A34A] text-white text-[10px] font-bold flex items-center justify-center">✓</span>
                <span>Verified Resolved</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#64748B] text-white text-[10px] font-bold flex items-center justify-center">!</span>
                <span>Sensor Offline / Stale</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
