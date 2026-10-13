import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line
} from 'recharts'
import { getDashboardSummary } from '../api/client.js'
import { BarChart3, Download, Info, Droplets, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

const ZONE_LOSS_DATA = [
  { zone: 'Zone D (Hospital)', lossKL: 82.4, excessLpm: 57.2 },
  { zone: 'Zone B (Pandri)',   lossKL: 43.2, excessLpm: 30.0 },
  { zone: 'Zone A (Civil)',    lossKL: 32.4, excessLpm: 22.5 },
  { zone: 'Zone C (Shankar)',  lossKL: 17.3, excessLpm: 12.0 },
  { zone: 'Zone E (Tatibandh)',lossKL: 0.0,  excessLpm: 0.0 },
]

const RESPONSE_TREND = [
  { day: 'Mon', mins: 145 },
  { day: 'Tue', mins: 128 },
  { day: 'Wed', mins: 112 },
  { day: 'Thu', mins: 98 },
  { day: 'Fri', mins: 92 },
  { day: 'Sat', mins: 84 },
  { day: 'Sun', mins: 78 },
]

export default function Analytics() {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    getDashboardSummary().then(({ data }) => setSummary(data)).catch(() => {})
  }, [])

  const kpis = summary?.kpis || {}

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#073B3A]">Water Loss &amp; Operations Analytics</h1>
          <p className="text-xs text-[#60736F] font-medium">
            Modeled water-loss impact, response time trends, and repair verification funnel
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="ag-btn-secondary text-xs py-2 px-3.5"
        >
          <Download className="w-3.5 h-3.5 text-[#0F766E]" />
          Download Impact Report
        </button>
      </div>

      {/* Persistent Disclaimer Banner per UI/UX Specification Section 17 */}
      <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-[14px] p-4 flex items-center gap-3 text-xs text-[#073B3A]">
        <Info className="w-5 h-5 text-[#0F766E] shrink-0" />
        <span>
          <strong>Simulation &amp; Modeling Disclosure:</strong> All water-loss volumes are based on simulated zone-level flow deviations (<code className="font-mono">Excess Flow × Duration</code>) and are not verified billing measurements. Linked citizen reports are never double-counted at the zone level.
        </span>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Estimated Potential Loss (24h)',
            value: `${((kpis.potential_loss_24h_liters || 175248) / 1000).toFixed(1)} kL`,
            sub: 'Based on active zone excess flow (Sim)',
            color: 'text-[#DC2626]',
            Icon: Droplets,
          },
          {
            label: 'Modeled Loss Avoided (Verified)',
            value: '64.8 kL',
            sub: 'After verified valve & collar repairs',
            color: 'text-[#16A34A]',
            Icon: CheckCircle2,
          },
          {
            label: 'Avg. Triage-to-Dispatch Time',
            value: '78 mins',
            sub: 'Down from 145 mins with AI triage',
            color: 'text-[#0F766E]',
            Icon: Clock,
          },
          {
            label: 'False-Alarm Suppression',
            value: '100%',
            sub: 'Short demand spikes filtered via 3-reading rule',
            color: 'text-[#073B3A]',
            Icon: AlertTriangle,
          },
        ].map(({ label, value, sub, color, Icon }) => (
          <div key={label} className="ag-card p-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#60736F]">{label}</span>
              <Icon className="w-4 h-4 text-[#0F766E]" />
            </div>
            <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
            <p className="text-[11px] text-[#60736F]">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="ag-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-[#142522]">Modeled 24-Hour Water Loss by Zone (kL)</h2>
            <p className="text-[11px] text-[#60736F]">
              Zone D (Hospital Corridor) and Zone B (Pandri) contribute the highest simulated excess flow this week.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ZONE_LOSS_DATA} margin={{ top: 10, right: 12, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2ECE9" vertical={false} />
              <XAxis dataKey="zone" tick={{ fill: '#60736F', fontSize: 11 }} />
              <YAxis tick={{ fill: '#60736F', fontSize: 11 }} unit=" kL" />
              <Tooltip />
              <Bar dataKey="lossKL" name="Projected 24h Loss (kL)" fill="#0F766E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="ag-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-[#142522]">Average Response Time Trend (Minutes)</h2>
            <p className="text-[11px] text-[#60736F]">
              Time from anomaly detection / citizen report to technician inspection assignment
            </p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={RESPONSE_TREND} margin={{ top: 10, right: 12, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2ECE9" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#60736F', fontSize: 11 }} />
              <YAxis tick={{ fill: '#60736F', fontSize: 11 }} unit="m" />
              <Tooltip />
              <Line type="monotone" dataKey="mins" name="Response Time (mins)" stroke="#14B8A6" strokeWidth={2.5} dot={{ r: 4, fill: '#0F766E' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
