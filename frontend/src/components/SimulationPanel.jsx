import { useState } from 'react'
import { triggerScenario, startSimulation, resetSimulation, seedDemoData } from '../api/client.js'
import {
  Play, RotateCcw, Zap, AlertTriangle, Wifi, WifiOff,
  TrendingUp, Loader2, CheckCircle2, Database, Terminal
} from 'lucide-react'

const SCENARIOS = [
  {
    id: 'normal',
    name: 'Normal Operation',
    icon: <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />,
    defaultZone: 'ZONE-A',
    desc: 'Flow and pressure stay within normal baseline bounds.',
    effect: 'No active incident created; status NORMAL.',
    badge: 'bg-[#DCFCE7] text-[#15803D]',
  },
  {
    id: 'gradual_leak',
    name: 'Gradual Pipeline Leak',
    icon: <AlertTriangle className="w-4 h-4 text-[#EA580C]" />,
    defaultZone: 'ZONE-B',
    desc: 'Flow +30% above baseline and pressure -22% across 3 consecutive readings.',
    effect: 'Creates or updates HIGH-RISK Suspected Incident.',
    badge: 'bg-[#FFEDD5] text-[#C2410C]',
  },
  {
    id: 'burst',
    name: 'Sudden Pipe Burst',
    icon: <Zap className="w-4 h-4 text-[#DC2626]" />,
    defaultZone: 'ZONE-D',
    desc: 'Major arterial flow surge (+55%) and sharp pressure drop (-34%).',
    effect: 'Creates CRITICAL Priority Suspected Incident.',
    badge: 'bg-[#FEE2E2] text-[#DC2626]',
  },
  {
    id: 'demand_spike',
    name: 'Temporary Demand Spike',
    icon: <TrendingUp className="w-4 h-4 text-[#D97706]" />,
    defaultZone: 'ZONE-C',
    desc: 'Short 1-interval flow spike (+26%) without sustained pressure drop.',
    effect: 'Enters MONITOR state only — false-alarm guard prevents incident.',
    badge: 'bg-[#FEF3C7] text-[#B45309]',
  },
  {
    id: 'sensor_offline',
    name: 'Sensor Offline / Stale',
    icon: <WifiOff className="w-4 h-4 text-[#475569]" />,
    defaultZone: 'ZONE-E',
    desc: 'Telemetry stops or reports STALE quality flag.',
    effect: 'Marks zone sensor as OFFLINE/STALE; never shown as normal.',
    badge: 'bg-[#E2E8F0] text-[#475569]',
  },
  {
    id: 'post_repair_recovery',
    name: 'Post-Repair Recovery',
    icon: <Wifi className="w-4 h-4 text-[#0F766E]" />,
    defaultZone: 'ZONE-B',
    desc: '5 consecutive normal intervals after field engineer completes repair.',
    effect: 'Marks sensor RECOVERED and prompts operator verification.',
    badge: 'bg-[#CCFBF1] text-[#0F766E]',
  },
]

const ZONES = ['ZONE-A', 'ZONE-B', 'ZONE-C', 'ZONE-D', 'ZONE-E']

export default function SimulationPanel({ onScenarioRun }) {
  const [loading, setLoading] = useState(null)
  const [selectedZones, setSelectedZones] = useState({
    normal: 'ZONE-A',
    gradual_leak: 'ZONE-B',
    burst: 'ZONE-D',
    demand_spike: 'ZONE-C',
    sensor_offline: 'ZONE-E',
    post_repair_recovery: 'ZONE-B',
  })
  const [eventLog, setEventLog] = useState([
    {
      time: new Date().toLocaleTimeString(),
      scenario: 'system_init',
      zone: 'ALL',
      status: 'READY',
      message: 'Simulation Lab initialized. All sensor streams are synthetic.',
    },
  ])
  const [confirmReset, setConfirmReset] = useState(false)

  const pushLog = (entry) => {
    setEventLog(prev => [{ time: new Date().toLocaleTimeString(), ...entry }, ...prev.slice(0, 14)])
  }

  const run = async (scenarioId) => {
    const zoneId = selectedZones[scenarioId] || 'ZONE-B'
    const readingsCount = scenarioId === 'demand_spike' ? 1 : scenarioId === 'post_repair_recovery' ? 5 : 3
    setLoading(scenarioId)
    try {
      const { data } = await triggerScenario({
        scenario: scenarioId,
        zone_id: zoneId,
        readings_count: readingsCount,
      })
      pushLog({
        scenario: scenarioId,
        zone: zoneId,
        status: data.anomaly?.status || 'DONE',
        incident: data.incident_code,
        message: data.message,
        explanation: data.anomaly?.explanation,
      })
      onScenarioRun?.()
    } catch (err) {
      pushLog({
        scenario: scenarioId,
        zone: zoneId,
        status: 'ERROR',
        message: err.response?.data?.message || 'Scenario execution failed.',
      })
    } finally {
      setLoading(null)
    }
  }

  const handleSeedRich = async () => {
    setLoading('seed')
    try {
      await seedDemoData()
      pushLog({
        scenario: 'seed_demo',
        zone: 'ALL',
        status: 'SEEDED',
        message: 'Restored rich multi-zone demo dataset (5 incidents, reports, tasks & sensor history).',
      })
      onScenarioRun?.()
    } finally {
      setLoading(null)
    }
  }

  const handleReset = async (withDemo = false) => {
    setLoading('reset')
    setConfirmReset(false)
    try {
      await resetSimulation({ seed_demo: withDemo })
      pushLog({
        scenario: 'reset',
        zone: 'ALL',
        status: 'RESET',
        message: withDemo
          ? 'Demo data reset and re-seeded with initial sample incidents.'
          : 'Clean reset complete. All transactional incidents and readings cleared.',
      })
      onScenarioRun?.()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Columns: Global Controls + 6 Scenario Cards */}
      <div className="lg:col-span-2 space-y-4">
        {/* Global Control Bar */}
        <div className="ag-card p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#142522]">Global Stream &amp; Demo State Controls</h3>
            <p className="text-xs text-[#60736F]">Populate baseline streams, restore sample incidents, or reset cleanly.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSeedRich}
              disabled={!!loading}
              className="ag-btn-primary text-xs py-2 px-3"
            >
              {loading === 'seed' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              Load Rich Demo Data
            </button>
            <button
              onClick={() => setConfirmReset(true)}
              disabled={!!loading}
              className="ag-btn-secondary text-xs py-2 px-3 text-[#DC2626] border-[#FECACA] hover:bg-[#FEF2F2]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo State
            </button>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {confirmReset && (
          <div className="ag-card p-4 border-2 border-[#DC2626] bg-[#FEF2F2]/60 space-y-3">
            <p className="text-sm font-bold text-[#991B1B]">Confirm Demo Environment Reset</p>
            <p className="text-xs text-[#7F1D1D]">
              Choose whether to reset to a completely empty slate (0 incidents) or restore the default rich hackathon demo dataset.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleReset(true)}
                className="px-3 py-1.5 rounded-lg bg-[#0F766E] text-white text-xs font-semibold"
              >
                Reset &amp; Restore Sample Demo Data
              </button>
              <button
                onClick={() => handleReset(false)}
                className="px-3 py-1.5 rounded-lg bg-[#DC2626] text-white text-xs font-semibold"
              >
                Clear All (0 Incidents)
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#D8E8E4] text-xs font-semibold text-[#142522]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* 6 Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCENARIOS.map((sc) => (
            <div key={sc.id} className="ag-card p-4 flex flex-col justify-between hover:border-[#0F766E] transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {sc.icon}
                    <h4 className="text-sm font-bold text-[#142522]">{sc.name}</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.badge}`}>
                    {sc.id.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-[#60736F] mb-2">{sc.desc}</p>
                <p className="text-[11px] font-medium text-[#073B3A] bg-[#F7FBFA] p-2 rounded-lg border border-[#D8E8E4]">
                  <strong>Expected Effect:</strong> {sc.effect}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#D8E8E4]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-[#60736F]">Target:</span>
                  <select
                    value={selectedZones[sc.id]}
                    onChange={(e) => setSelectedZones(s => ({ ...s, [sc.id]: e.target.value }))}
                    className="bg-[#F7FBFA] border border-[#D8E8E4] rounded-lg px-2 py-1 text-xs font-semibold text-[#142522]"
                  >
                    {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>

                <button
                  onClick={() => run(sc.id)}
                  disabled={!!loading}
                  className="ag-btn-primary text-xs py-1.5 px-3"
                >
                  {loading === sc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Run Scenario
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Live Telemetry & Detection Feed */}
      <div className="ag-card p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#D8E8E4]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#0F766E]" />
            <h3 className="text-sm font-bold text-[#142522]">Live Simulation Event Feed</h3>
          </div>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]">
            Synthetic Stream
          </span>
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1 flex-1">
          {eventLog.map((ev, i) => (
            <div key={i} className="bg-[#F7FBFA] border border-[#D8E8E4] rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#073B3A]">{ev.zone} · {ev.scenario}</span>
                <span className="text-[10px] text-[#60736F]">{ev.time}</span>
              </div>
              <p className="text-[#142522] font-medium">{ev.message}</p>
              {ev.explanation && (
                <p className="text-[11px] text-[#60736F] italic">{ev.explanation}</p>
              )}
              {ev.incident && (
                <p className="text-[11px] font-bold text-[#0F766E]">
                  → Linked Operational Case: {ev.incident}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
