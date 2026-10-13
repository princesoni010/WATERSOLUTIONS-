import { useState } from 'react'
import SimulationPanel from '../components/SimulationPanel.jsx'
import { FlaskConical, ShieldAlert } from 'lucide-react'

export default function AdminSimulation() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#073B3A] flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-[#0F766E]" />
            Simulation Lab
          </h1>
          <p className="text-xs text-[#60736F] font-medium mt-0.5">
            Admin control panel to trigger repeatable hackathon scenarios and inspect the detection-to-priority pipeline
          </p>
        </div>
      </div>

      {/* Always-visible Demo Warning Banner per UI/UX Spec Section 18 */}
      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[14px] p-4 flex items-start gap-3 text-xs text-[#92400E]">
        <ShieldAlert className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold block text-[#78350F]">
            Demo Environment — All sensor readings and water-loss estimates are synthetic.
          </strong>
          <span>
            Each leak scenario injects 3 consecutive readings to demonstrate the persistence rule (<code className="font-mono">flow_increase ≥ 25%</code> and <code className="font-mono">pressure_drop ≥ 15%</code> for ≥ 3 readings). Temporary demand spikes inject 1 reading to demonstrate false-alarm prevention.
          </span>
        </div>
      </div>

      {/* Main Simulation Control Panel + Live Event Feed */}
      <SimulationPanel onScenarioRun={() => setRefreshKey(k => k + 1)} />

      {/* 3-Minute Judge Walkthrough Guide */}
      <div className="ag-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#073B3A]">3-Minute Judge Demo Storyline</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          {[
            { step: '1. Baseline & Alert', desc: 'Trigger "Gradual Pipeline Leak" on Zone B. Observe +30% flow & -22% pressure across 3 readings.' },
            { step: '2. Citizen Fusion',   desc: 'Submit a photo report near Pandri Bus Stand. Watch confidence upgrade to Corroborated.' },
            { step: '3. Explainable AI',   desc: 'Open INC-2026-1052 to show the 0–100 priority breakdown and why it is High Priority.' },
            { step: '4. Field Dispatch',   desc: 'Assign Priya Sharma, confirm physical leak in Field App, and upload repair proof.' },
            { step: '5. Verify Closure',   desc: 'Trigger "Post-Repair Recovery" (5 normal intervals) and click Verify Resolved.' },
          ].map((s) => (
            <div key={s.step} className="bg-[#F7FBFA] border border-[#D8E8E4] rounded-xl p-3.5 space-y-1">
              <p className="font-extrabold text-[#0F766E]">{s.step}</p>
              <p className="text-[#60736F] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
