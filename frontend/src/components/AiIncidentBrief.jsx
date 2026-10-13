import { ShieldAlert, Sparkles } from 'lucide-react'

export default function AiIncidentBrief({ incident }) {
  if (!incident) return null

  const score = Math.round(incident.priority_score || 74)
  const level = incident.priority_level || 'HIGH'
  const breakdown = incident.priority_breakdown || {}

  // Weighted contributions for the "Why this score?" list (matching the Incident Detail mockup!)
  const lossPts = Math.round((breakdown.loss_severity_L || 70) * 0.30)
  const anomalyPts = Math.round((breakdown.anomaly_severity_A || 75) * 0.25)
  const impactPts = Math.round((breakdown.public_impact_I || 80) * 0.20)
  const reportPts = Math.round((breakdown.citizen_evidence_R || 65) * 0.15)
  const agePts = Math.max(2, Math.round((breakdown.time_unresolved_T || 30) * 0.10))

  const levelText =
    level === 'CRITICAL' ? 'Critical Priority'
    : level === 'HIGH' ? 'High Priority'
    : level === 'MEDIUM' ? 'Medium Priority'
    : 'Low / Monitor Priority'

  const levelColor =
    level === 'CRITICAL' ? 'text-[#DC2626]'
    : level === 'HIGH' ? 'text-[#EA580C]'
    : level === 'MEDIUM' ? 'text-[#D97706]'
    : 'text-[#2563EB]'

  const reasons = [
    { label: 'High flow anomaly & excess volume', pts: `+${lossPts}` },
    { label: 'Sustained pressure drop in zone', pts: `+${anomalyPts}` },
    { label: `Corroborated citizen reports (${incident.report_count || 1})`, pts: `+${reportPts}` },
    { label: 'Proximity to high-impact corridor', pts: `+${impactPts}` },
    { label: 'Unresolved duration factor', pts: `+${agePts}` },
  ]

  return (
    <div className="ag-card p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#142522] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#0F766E]" />
            AI Priority Score
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]">
            0.30L + 0.25A + 0.20I + 0.15R + 0.10T
          </span>
        </div>

        {/* Big Score display like 86 / 100 */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-[#073B3A] tracking-tight">{score}</span>
            <span className="text-lg font-bold text-[#60736F]">/ 100</span>
          </div>
          <p className={`text-xs font-bold mt-0.5 ${levelColor}`}>{levelText}</p>
        </div>

        {/* Gradient Score Bar 0..100 */}
        <div className="mb-4">
          <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-[#16A34A] via-[#EAB308] to-[#DC2626]">
            <div
              className="absolute -top-1 w-4 h-4 rounded-full bg-white border-2 border-[#073B3A] shadow"
              style={{ left: `calc(${Math.min(96, Math.max(4, score))}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#60736F] font-medium mt-1">
            <span>0</span>
            <span>40</span>
            <span>60</span>
            <span>80</span>
            <span>100</span>
          </div>
        </div>

        {/* Why this score? */}
        <div className="border-t border-[#D8E8E4] pt-3">
          <p className="text-xs font-bold text-[#142522] mb-2">Why this score?</p>
          <div className="space-y-2">
            {reasons.map((r) => (
              <div key={r.label} className="flex items-center justify-between text-xs">
                <span className="text-[#60736F]">{r.label}</span>
                <span className="font-bold text-[#0F766E] bg-[#F0FDFA] px-2 py-0.5 rounded">
                  {r.pts}
                </span>
              </div>
            ))}
          </div>
        </div>

        {incident.priority_explanation && (
          <p className="text-xs text-[#60736F] mt-3 bg-[#F7FBFA] p-2.5 rounded-lg border border-[#D8E8E4]">
            {incident.priority_explanation}
          </p>
        )}
      </div>

      {/* Non-dismissible Advisory Notice matching mockup */}
      <div className="mt-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 flex items-start gap-2 text-xs text-[#1E40AF]">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#2563EB]" />
        <div>
          <strong className="font-semibold block">AI output is advisory.</strong>
          <span>Suspected leak — field verification required before confirmation.</span>
        </div>
      </div>
    </div>
  )
}
