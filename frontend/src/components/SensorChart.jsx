import {
  ResponsiveContainer, ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

function fmt(ts) {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return String(ts)
  }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#D8E8E4] rounded-xl px-3.5 py-2.5 text-xs space-y-1 shadow-lg">
      <p className="text-[#073B3A] font-bold">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: <strong>{p.value != null ? Number(p.value).toFixed(1) : '—'}</strong>
          {p.name.toLowerCase().includes('flow') ? ' L/min' : ' PSI'}
        </p>
      ))}
      <p className="text-[10px] text-[#60736F] pt-1 border-t border-[#D8E8E4]">
        Simulated telemetry reading
      </p>
    </div>
  )
}

export default function SensorChart({ readings = [], zone, loading, height = 220 }) {
  if (loading) {
    return <div className="ag-card h-56 animate-pulse bg-white" />
  }

  const data = readings.map((r, idx) => ({
    time: fmt(r.recorded_at || r.timestamp) || `T-${readings.length - idx}m`,
    flow: r.flow_lpm,
    expectedFlow: r.expected_flow_lpm ?? zone?.expected_flow_lpm ?? 100,
    pressure: r.pressure_psi,
    expectedPressure: r.expected_pressure_psi ?? zone?.expected_pressure_psi ?? 60,
    quality: r.quality_flag,
  }))

  if (!data.length) {
    return (
      <div className="ag-card h-52 flex items-center justify-center text-[#60736F] text-sm">
        No telemetry readings available for this zone yet.
      </div>
    )
  }

  const baseFlow = zone?.expected_flow_lpm ?? data[0]?.expectedFlow ?? 100
  const basePressure = zone?.expected_pressure_psi ?? data[0]?.expectedPressure ?? 60

  return (
    <div className="ag-card p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <p className="text-xs font-bold text-[#142522]">
            {zone?.name || zone?.id || 'Zone Telemetry'} — Flow &amp; Pressure vs. Baseline
          </p>
          <p className="text-[11px] text-[#60736F]">
            Baseline Flow: <strong>{baseFlow} L/min</strong> · Baseline Pressure: <strong>{basePressure} PSI</strong>
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
          Simulated Sensor Feed
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2ECE9" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: '#60736F', fontSize: 11 }} axisLine={{ stroke: '#D8E8E4' }} />
          <YAxis yAxisId="flow" orientation="left" tick={{ fill: '#0F766E', fontSize: 11 }} axisLine={false} />
          <YAxis yAxisId="pressure" orientation="right" tick={{ fill: '#EA580C', fontSize: 11 }} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />

          <Area
            yAxisId="flow"
            type="monotone"
            dataKey="flow"
            name="Actual Flow (L/min)"
            stroke="#0F766E"
            fill="url(#flowFill)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#0F766E' }}
          />
          <Line
            yAxisId="flow"
            type="monotone"
            dataKey="expectedFlow"
            name="Expected Baseline (L/min)"
            stroke="#60736F"
            strokeDasharray="5 4"
            dot={false}
            strokeWidth={1.5}
          />
          <Line
            yAxisId="pressure"
            type="monotone"
            dataKey="pressure"
            name="Actual Pressure (PSI)"
            stroke="#EA580C"
            strokeWidth={2}
            dot={{ r: 2.5, fill: '#EA580C' }}
          />
          <Line
            yAxisId="pressure"
            type="monotone"
            dataKey="expectedPressure"
            name="Expected Pressure (PSI)"
            stroke="#FDBA74"
            strokeDasharray="4 4"
            dot={false}
            strokeWidth={1.5}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
