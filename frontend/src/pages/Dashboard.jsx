import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell
} from 'recharts'
import { getDashboardSummary, getZoneReadings, getZones, seedDemoData } from '../api/client.js'
import KPICards, { PriorityBadge, StatusBadge, ConfidenceBadge } from '../components/KPIcards.jsx'
import IncidentMap from '../components/IncidentMap.jsx'
import PriorityQueue from '../components/PriorityQueue.jsx'
import SensorChart from '../components/SensorChart.jsx'
import { RefreshCw, Calendar, Filter, ArrowRight, Eye, Sparkles, ShieldAlert } from 'lucide-react'

const TREND_7D = [
  { day: '16 Oct', suspected: 9,  avg: 8 },
  { day: '17 Oct', suspected: 14, avg: 10 },
  { day: '18 Oct', suspected: 12, avg: 11 },
  { day: '19 Oct', suspected: 18, avg: 13 },
  { day: '20 Oct', suspected: 15, avg: 14 },
  { day: '21 Oct', suspected: 21, avg: 16 },
  { day: 'Today',  suspected: 19, avg: 17 },
]

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedZoneId, setSelectedZoneId] = useState('ZONE-B')
  const [zoneReadings, setZoneReadings] = useState([])
  const [zones, setZones] = useState([])
  const [chartLoading, setChartLoading] = useState(false)

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await getDashboardSummary()
      // If database was just wiped by test_all.py reset, auto-seed rich demo dataset once
      if ((data.map_incidents || []).length === 0) {
        await seedDemoData()
        const refreshed = await getDashboardSummary()
        setSummary(refreshed.data)
      } else {
        setSummary(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchZoneReadings = useCallback(async (zoneId) => {
    setChartLoading(true)
    try {
      const { data } = await getZoneReadings(zoneId, { limit: 24 })
      setZoneReadings(data.readings || [])
    } catch {
      setZoneReadings([])
    } finally {
      setChartLoading(false)
    }
  }, [])

  const fetchZones = useCallback(async () => {
    try {
      const { data } = await getZones()
      setZones(data.zones || [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchSummary()
    fetchZones()
  }, [fetchSummary, fetchZones])

  useEffect(() => {
    fetchZoneReadings(selectedZoneId)
  }, [selectedZoneId, fetchZoneReadings])

  useEffect(() => {
    const t = setInterval(fetchSummary, 10000)
    return () => clearInterval(t)
  }, [fetchSummary])

  const kpis = summary?.kpis || {}
  const mapIncidents = summary?.map_incidents || []
  const zoneStatus = summary?.zone_status || []
  const selectedZone = zones.find(z => z.id === selectedZoneId) || zoneStatus.find(z => z.zone_id === selectedZoneId)

  // Priority distribution counts for Donut Chart
  const critCount = mapIncidents.filter(i => i.priority_level === 'CRITICAL').length || 1
  const highCount = mapIncidents.filter(i => i.priority_level === 'HIGH').length || 2
  const medCount  = mapIncidents.filter(i => i.priority_level === 'MEDIUM').length || 1
  const lowCount  = mapIncidents.filter(i => i.priority_level === 'LOW').length || 1
  const totalDist = critCount + highCount + medCount + lowCount

  const donutData = [
    { name: 'Critical', value: critCount, color: '#DC2626', pct: `${Math.round((critCount / totalDist) * 100)}%` },
    { name: 'High',     value: highCount, color: '#EA580C', pct: `${Math.round((highCount / totalDist) * 100)}%` },
    { name: 'Medium',   value: medCount,  color: '#EAB308', pct: `${Math.round((medCount / totalDist) * 100)}%` },
    { name: 'Low',      value: lowCount,  color: '#16A34A', pct: `${Math.round((lowCount / totalDist) * 100)}%` },
  ]

  const topIncident = mapIncidents[0]

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Title & Controls matching Overview mockup */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#073B3A] tracking-tight">Overview</h1>
          <p className="text-xs text-[#60736F] font-medium mt-0.5">
            Today&apos;s municipal water operations &amp; anomaly triage at a glance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-[10px] bg-white border border-[#D8E8E4] text-xs font-semibold text-[#142522]">
            <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>13 Oct 2026 · Live Stream</span>
          </div>
          <button
            onClick={fetchSummary}
            className="ag-btn-secondary text-xs py-2 px-3"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0F766E]" />
            Refresh
          </button>
          <Link to="/simulation" className="ag-btn-primary text-xs py-2 px-3.5">
            <Filter className="w-3.5 h-3.5" />
            Trigger Scenario
          </Link>
        </div>
      </div>

      {/* Row 1: 5 KPI Cards */}
      <KPICards kpis={kpis} loading={loading} />

      {/* Row 2: 3-Column Overview Row from Mockup (Leak Trend + Priority Distribution Donut + Top Hotspots) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 1: Leak Trend (7 Days) */}
        <div className="lg:col-span-5 ag-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-[#142522]">Suspected Leak Trend (7 Days)</h2>
              <p className="text-[11px] text-[#60736F]">Daily suspected anomalies vs. 7-day rolling baseline</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-[#0F766E]">
                <span className="w-2.5 h-0.5 bg-[#0F766E] inline-block" /> Suspected Leaks
              </span>
              <span className="flex items-center gap-1 text-[#60736F]">
                <span className="w-2.5 h-0.5 bg-[#60736F] inline-block border-b border-dashed" /> 7-Day Avg
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={195}>
            <LineChart data={TREND_7D} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2ECE9" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#60736F', fontSize: 11 }} axisLine={{ stroke: '#D8E8E4' }} />
              <YAxis tick={{ fill: '#60736F', fontSize: 11 }} axisLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="suspected"
                name="Suspected Leaks"
                stroke="#0F766E"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#0F766E' }}
              />
              <Line
                type="monotone"
                dataKey="avg"
                name="7-Day Avg"
                stroke="#94A3B8"
                strokeWidth={1.8}
                strokeDasharray="5 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Col 2: Priority Distribution Donut */}
        <div className="lg:col-span-4 ag-card p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#142522]">Priority Distribution</h2>
            <p className="text-[11px] text-[#60736F]">Breakdown by explainable triage score</p>
          </div>

          <div className="grid grid-cols-2 items-center gap-2 my-auto py-2">
            <div className="relative h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold text-[#073B3A] leading-none">{mapIncidents.length}</span>
                <span className="text-[11px] font-semibold text-[#60736F] mt-0.5">Total Cases</span>
              </div>
            </div>

            <div className="space-y-2.5 pr-2">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-[#142522]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-bold text-[#60736F]">{d.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: Top Hotspots */}
        <div className="lg:col-span-3 ag-card p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#142522] mb-3">Top Hotspots</h2>
            <div className="space-y-3">
              {[
                { name: 'Telibandha Hospital (Zone D)', count: 86, level: 'CRITICAL' },
                { name: 'Pandri Bus Stand (Zone B)',    count: 74, level: 'HIGH' },
                { name: 'Civil Lines Ward 4 (Zone A)',  count: 68, level: 'HIGH' },
                { name: 'Shankar Nagar Sec 2 (Zone C)', count: 48, level: 'MEDIUM' },
                { name: 'Tatibandh Feeder (Zone E)',    count: 20, level: 'LOW' },
              ].map((h) => (
                <div key={h.name} className="flex items-center justify-between gap-2 text-xs pb-2 border-b border-[#D8E8E4]/60 last:border-none last:pb-0">
                  <span className="text-[#142522] font-medium truncate">{h.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-[#073B3A]">{h.count}</span>
                    <PriorityBadge level={h.level} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/map"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0F766E] hover:underline"
          >
            View Live Map <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Row 3: Recent Incidents Table (matching center-bottom of Overview mockup!) */}
      <div className="ag-card overflow-hidden">
        <div className="p-5 border-b border-[#D8E8E4] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#142522]">Recent Incidents</h2>
            <p className="text-[11px] text-[#60736F]">
              Corroborated citizen reports and sensor anomalies requiring operator review or field verification
            </p>
          </div>
          <Link to="/incidents" className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1">
            View all incidents <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7FBFA] border-b border-[#D8E8E4] text-[11px] font-bold uppercase tracking-wider text-[#60736F]">
                <th className="py-3 px-5">ID</th>
                <th className="py-3 px-4">Location / Zone</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Est. Water Loss (24h)</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E8E4] text-xs">
              {mapIncidents.slice(0, 6).map((inc) => (
                <tr key={inc.id} className="hover:bg-[#F0FDFA]/60 transition-colors">
                  <td className="py-3.5 px-5 font-mono font-bold text-[#073B3A]">
                    <Link to={`/incidents/${inc.id}`} className="hover:underline">
                      INC-2026-{String(inc.id + 1050)}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#142522]">
                    {inc.zone_name || inc.zone_id}
                  </td>
                  <td className="py-3.5 px-4">
                    <PriorityBadge level={inc.priority_level} score={inc.priority_score} variant="dot" />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={inc.status} />
                  </td>
                  <td className="py-3.5 px-4 text-[#0F766E] font-semibold">
                    {inc.estimated_loss_24h_liters > 0
                      ? `${Number(inc.estimated_loss_24h_liters).toLocaleString()} L`
                      : '0 L (Resolved)'}
                  </td>
                  <td className="py-3.5 px-4">
                    <ConfidenceBadge level={inc.confidence_level} />
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <Link
                      to={`/incidents/${inc.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#D8E8E4] hover:border-[#0F766E] text-[#073B3A] font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#0F766E]" />
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3B: Live Citizen Reports Received from /report Portal */}
      <div className="ag-card overflow-hidden">
        <div className="p-5 border-b border-[#D8E8E4] flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#073B3A]">
              Recent Citizen Reports Received ({(summary?.recent_reports || []).length})
            </h2>
            <p className="text-[11px] text-[#60736F]">
              Newest reports submitted from the Citizen Report Portal (<code className="font-mono">/report</code>), automatically linked to operational incidents
            </p>
          </div>
          <Link to="/report" className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1">
            + Submit Test Report <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7FBFA] border-b border-[#D8E8E4] text-[11px] font-bold uppercase tracking-wider text-[#60736F]">
                <th className="py-3 px-5">Tracking ID</th>
                <th className="py-3 px-4">Issue Type</th>
                <th className="py-3 px-4">Citizen Description</th>
                <th className="py-3 px-4">Location (Lat, Lng)</th>
                <th className="py-3 px-4">Report Status</th>
                <th className="py-3 px-4">Linked Incident</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E8E4] text-xs">
              {(summary?.recent_reports || []).slice(0, 8).map((rep) => (
                <tr key={rep.id} className="hover:bg-[#F0FDFA]/60 transition-colors">
                  <td className="py-3.5 px-5 font-mono font-extrabold text-[#0F766E]">
                    <Link to={`/track-report?ref=${rep.tracking_reference}`} className="hover:underline">
                      {rep.tracking_reference}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#142522]">
                    {(rep.issue_type || 'PIPELINE_LEAK').replace(/_/g, ' ')}
                  </td>
                  <td className="py-3.5 px-4 text-[#60736F] max-w-xs truncate">
                    {rep.description || 'Visible water leak reported by citizen'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#60736F]">
                    {Number(rep.latitude).toFixed(4)}, {Number(rep.longitude).toFixed(4)}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={rep.status} />
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#073B3A]">
                    {rep.incident_id ? (
                      <Link to={`/incidents/${rep.incident_id}`} className="text-[#0F766E] hover:underline">
                        INC-2026-{String(rep.incident_id + 1050)}
                      </Link>
                    ) : (
                      <span className="text-[#60736F]">Pending</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {rep.incident_id ? (
                      <Link
                        to={`/incidents/${rep.incident_id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#D8E8E4] hover:border-[#0F766E] text-[#073B3A] font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#0F766E]" />
                        Open Case
                      </Link>
                    ) : (
                      <Link
                        to={`/track-report?ref=${rep.tracking_reference}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#D8E8E4] text-[#073B3A] font-semibold"
                      >
                        View Report
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: Interactive Map + Priority Repair Queue + Live Zone Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 ag-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#142522]">Interactive GIS Hotspot Map</h2>
              <p className="text-[11px] text-[#60736F]">Click any numbered priority marker to inspect evidence</p>
            </div>
            <Link to="/map" className="text-xs font-bold text-[#0F766E] hover:underline">
              Open Fullscreen Map →
            </Link>
          </div>
          <IncidentMap incidents={mapIncidents} zones={zoneStatus} height="340px" />
        </div>

        <div className="lg:col-span-5 ag-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#142522]">Priority Repair Queue</h2>
              <p className="text-[11px] text-[#60736F]">Ranked by explainable AI triage score</p>
            </div>
            <span className="text-[11px] font-bold text-[#0F766E] bg-[#F0FDFA] px-2.5 py-0.5 rounded-full border border-[#99F6E4]">
              Human Verification Required
            </span>
          </div>
          <PriorityQueue
            incidents={mapIncidents.filter(i => !['VERIFIED_RESOLVED', 'NOT_A_LEAK'].includes(i.status))}
            loading={loading}
          />
        </div>
      </div>

      {/* Row 5: Live Zone Sensor Chart + AI Advisory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#142522]">Live Zone Sensor Telemetry</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#60736F] font-medium">Select Zone:</span>
              <select
                value={selectedZoneId}
                onChange={e => setSelectedZoneId(e.target.value)}
                className="ag-input py-1 px-2.5 text-xs font-semibold"
              >
                {['ZONE-A', 'ZONE-B', 'ZONE-C', 'ZONE-D', 'ZONE-E'].map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>
          <SensorChart
            readings={zoneReadings}
            zone={selectedZone || { id: selectedZoneId, name: selectedZoneId }}
            loading={chartLoading}
            height={210}
          />
        </div>

        <div className="lg:col-span-4 ag-card p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] bg-[#F0FDFA] px-2.5 py-1 rounded-full border border-[#99F6E4]">
                <Sparkles className="w-3.5 h-3.5" />
                AI Recommendation Brief
              </span>
              {topIncident && (
                <PriorityBadge level={topIncident.priority_level} score={topIncident.priority_score} />
              )}
            </div>

            <h3 className="text-sm font-extrabold text-[#073B3A]">
              {topIncident ? topIncident.title : 'All Water Zones Nominal'}
            </h3>

            <p className="text-xs text-[#60736F] leading-relaxed">
              {topIncident
                ? topIncident.ai_summary
                : 'No sustained flow or pressure anomalies currently exceed the 3-reading persistence threshold.'}
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#D8E8E4] mt-4">
            <div className="flex items-start gap-2 text-[11px] text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] p-2.5 rounded-xl">
              <ShieldAlert className="w-4 h-4 shrink-0 text-[#2563EB] mt-0.5" />
              <span>
                <strong>Suspected leak — field verification required.</strong> AI recommendations do not automatically confirm leaks.
              </span>
            </div>

            {topIncident && (
              <Link to={`/incidents/${topIncident.id}`} className="ag-btn-primary w-full text-xs py-2">
                Review Evidence &amp; Assign Engineer →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
