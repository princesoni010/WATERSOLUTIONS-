import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardSummary, getZoneReadings } from '../api/client.js'
import SensorChart from '../components/SensorChart.jsx'
import { StatusBadge, PriorityBadge } from '../components/KPIcards.jsx'
import { Activity, Wifi, WifiOff, AlertTriangle, FlaskConical, RefreshCw } from 'lucide-react'

export default function SensorMonitoring() {
  const [summary, setSummary] = useState(null)
  const [selectedZoneId, setSelectedZoneId] = useState('ZONE-B')
  const [timeRange, setTimeRange] = useState('1h')
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, readRes] = await Promise.all([
        getDashboardSummary(),
        getZoneReadings(selectedZoneId, { limit: 30 }),
      ])
      setSummary(sumRes.data)
      setReadings(readRes.data.readings || [])
    } finally {
      setLoading(false)
    }
  }, [selectedZoneId])

  useEffect(() => { load() }, [load])

  const zones = summary?.zone_status || []
  const selectedZone = zones.find(z => z.zone_id === selectedZoneId) || { id: selectedZoneId, name: selectedZoneId }

  const onlineCount = zones.filter(z => z.sensor_status === 'ONLINE').length
  const offlineCount = zones.filter(z => z.sensor_status === 'OFFLINE').length
  const anomalousCount = zones.filter(z => z.active_incident_priority).length

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#073B3A]">Sensor Monitoring</h1>
          <p className="text-xs text-[#60736F] font-medium">
            Simulated IoT flow (L/min) and pressure (PSI) telemetry across all 5 municipal water zones
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex rounded-[10px] border border-[#D8E8E4] bg-white p-0.5">
            {['15m', '1h', '6h', '24h'].map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  timeRange === r ? 'bg-[#0F766E] text-white' : 'text-[#60736F] hover:text-[#142522]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button onClick={load} className="ag-btn-secondary py-2 px-3 text-xs">
            <RefreshCw className="w-3.5 h-3.5 text-[#0F766E]" /> Refresh
          </button>

          <Link to="/simulation" className="ag-btn-primary py-2 px-3.5 text-xs">
            <FlaskConical className="w-3.5 h-3.5" /> Simulation Controls
          </Link>
        </div>
      </div>

      {/* Health Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sensors Online',    val: onlineCount,    sub: 'Reporting GOOD quality', color: 'text-[#16A34A]', Icon: Wifi },
          { label: 'Anomalous Zones',   val: anomalousCount, sub: 'Sustained flow/pressure alert', color: 'text-[#EA580C]', Icon: AlertTriangle },
          { label: 'Stale / Offline',   val: offlineCount,   sub: 'Never shown as normal', color: 'text-[#475569]', Icon: WifiOff },
          { label: 'Telemetry Mode',    val: 'SIMULATED',    sub: 'Synthetic hackathon stream', color: 'text-[#0F766E]', Icon: Activity },
        ].map(({ label, val, sub, color, Icon }) => (
          <div key={label} className="ag-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#60736F]">{label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${color}`}>{val}</p>
              <p className="text-[11px] text-[#60736F] mt-0.5">{sub}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#F7FBFA] border border-[#D8E8E4] flex items-center justify-center">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* 5 Zone Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {zones.map(z => {
          const isSelected = z.zone_id === selectedZoneId
          const isOffline = z.sensor_status === 'OFFLINE'
          const flowDev = z.latest_flow_lpm && z.expected_flow_lpm
            ? Math.round(((z.latest_flow_lpm - z.expected_flow_lpm) / z.expected_flow_lpm) * 100)
            : 0
          return (
            <button
              key={z.zone_id}
              onClick={() => setSelectedZoneId(z.zone_id)}
              className={`ag-card p-4 text-left transition-all ${
                isSelected ? 'ring-2 ring-[#0F766E] border-[#0F766E]' : 'hover:border-[#14B8A6]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-extrabold text-[#073B3A]">{z.zone_id}</span>
                {isOffline ? (
                  <StatusBadge status="SENSOR_OFFLINE" />
                ) : z.active_incident_priority ? (
                  <PriorityBadge level={z.active_incident_priority} />
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D]">
                    NORMAL
                  </span>
                )}
              </div>

              <p className="text-xs font-bold text-[#142522] truncate mb-3">
                {z.zone_name?.split('—')[1]?.trim() || z.zone_name}
              </p>

              <div className="space-y-1.5 text-xs border-t border-[#D8E8E4] pt-2.5">
                <div className="flex justify-between">
                  <span className="text-[#60736F]">Flow:</span>
                  <span className="font-bold text-[#142522]">
                    {isOffline ? 'STALE / —' : `${z.latest_flow_lpm ?? z.expected_flow_lpm} L/m`}
                    {!isOffline && flowDev > 10 && (
                      <span className="text-[#DC2626] ml-1">(+{flowDev}%)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#60736F]">Baseline:</span>
                  <span className="text-[#60736F]">{z.expected_flow_lpm} L/m · {z.expected_pressure_psi} PSI</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#60736F]">Pressure:</span>
                  <span className="font-bold text-[#142522]">
                    {isOffline ? 'OFFLINE' : `${z.latest_pressure_psi ?? z.expected_pressure_psi} PSI`}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Main Dual-Axis Trend Chart */}
      <SensorChart readings={readings} zone={selectedZone} loading={loading} height={260} />

      {/* Reading Log Table */}
      <div className="ag-card overflow-hidden">
        <div className="p-4 border-b border-[#D8E8E4] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#142522]">Telemetry Reading Log — {selectedZoneId}</h3>
            <p className="text-[11px] text-[#60736F]">Immutable time-series readings with quality flags and scenario traceability</p>
          </div>
          <span className="text-xs font-semibold text-[#0F766E]">{readings.length} readings loaded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7FBFA] border-b border-[#D8E8E4] text-[11px] font-bold uppercase text-[#60736F]">
                <th className="py-3 px-4">Reading ID</th>
                <th className="py-3 px-4">Sensor ID</th>
                <th className="py-3 px-4">Observed Flow</th>
                <th className="py-3 px-4">Expected Flow</th>
                <th className="py-3 px-4">Observed Pressure</th>
                <th className="py-3 px-4">Quality Flag</th>
                <th className="py-3 px-4">Scenario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E8E4]">
              {readings.slice().reverse().slice(0, 10).map(r => (
                <tr key={r.id} className="hover:bg-[#F0FDFA]/50">
                  <td className="py-3 px-4 font-mono font-bold text-[#073B3A]">#{r.id}</td>
                  <td className="py-3 px-4 font-mono text-[#142522]">{r.sensor_id}</td>
                  <td className="py-3 px-4 font-bold text-[#0F766E]">
                    {r.flow_lpm != null ? `${r.flow_lpm} L/min` : '—'}
                  </td>
                  <td className="py-3 px-4 text-[#60736F]">{r.expected_flow_lpm} L/min</td>
                  <td className="py-3 px-4 font-bold text-[#EA580C]">
                    {r.pressure_psi != null ? `${r.pressure_psi} PSI` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      r.quality_flag === 'GOOD'
                        ? 'bg-[#DCFCE7] text-[#15803D]'
                        : 'bg-[#E2E8F0] text-[#475569]'
                    }`}>
                      {r.quality_flag}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#60736F]">{r.scenario_id || 'normal'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
