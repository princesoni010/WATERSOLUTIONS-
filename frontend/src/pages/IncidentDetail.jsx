import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getIncident, assignEngineer, verifyIncident,
  updateIncident, overridePriority, getZoneReadings, getUsers
} from '../api/client.js'
import { PriorityBadge, StatusBadge, ConfidenceBadge } from '../components/KPIcards.jsx'
import AiIncidentBrief from '../components/AiIncidentBrief.jsx'
import SensorChart from '../components/SensorChart.jsx'
import {
  ArrowLeft, MapPin, User, CheckCircle2, RotateCcw,
  Loader2, FileText, Sliders, ShieldCheck, ExternalLink,
  Camera, Eye, Image as ImageIcon, PlusCircle
} from 'lucide-react'

function fmtDateTime(iso) {
  if (!iso) return '13 Oct 2026, 09:20 AM'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const DEMO_LEAK_IMAGES = [
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80', // Municipal water pipeline valve & main trunk line
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80', // Pipeline joint leak with water escaping collar
]

export default function IncidentDetail() {
  const { id } = useParams()
  const [incident, setIncident] = useState(null)
  const [readings, setReadings] = useState([])
  const [engineers, setEngineers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')
  const [actionLoading, setActionLoading] = useState(null)
  const [engineerId, setEngineerId] = useState('2')
  const [verifyReason, setVerifyReason] = useState('')
  const [overrideModal, setOverrideModal] = useState(false)
  const [overrideScore, setOverrideScore] = useState('85')
  const [overrideLevel, setOverrideLevel] = useState('CRITICAL')
  const [overrideReason, setOverrideReason] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const incRes = await getIncident(id)
      const inc = incRes.data.incident
      setIncident(inc)

      const uRes = await getUsers().catch(() => ({ data: { users: [] } }))
      const techs = (uRes.data.users || []).filter(u => u.role === 'TECHNICIAN')
      setEngineers(techs)
      if (techs[0]) setEngineerId(String(techs[0].id))

      if (inc?.zone_id) {
        const zr = await getZoneReadings(inc.zone_id, { limit: 24 }).catch(() => ({ data: { readings: [] } }))
        setReadings(zr.data.readings || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleAssign = async () => {
    if (!engineerId) return
    setActionLoading('assign')
    try {
      await assignEngineer(id, { engineer_id: parseInt(engineerId, 10) })
      await load()
    } finally {
      setActionLoading(null)
    }
  }

  const handleStatusChange = async (status) => {
    setActionLoading(status)
    try {
      await updateIncident(id, { status, reason: `Operator transitioned status to ${status}` })
      await load()
    } finally {
      setActionLoading(null)
    }
  }

  const handleVerify = async (action) => {
    setActionLoading(action)
    try {
      await verifyIncident(id, { action, reason: verifyReason || 'Operator verified post-repair recovery' })
      await load()
    } finally {
      setActionLoading(null)
    }
  }

  const handleOverride = async (e) => {
    e.preventDefault()
    if (!overrideReason.trim()) return
    setActionLoading('override')
    try {
      await overridePriority(id, {
        priority_score: parseFloat(overrideScore),
        priority_level: overrideLevel,
        reason: overrideReason,
      })
      setOverrideModal(false)
      setOverrideReason('')
      await load()
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-[1440px] mx-auto space-y-4">
        <div className="ag-card h-24 animate-pulse bg-white" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="ag-card h-96 animate-pulse bg-white" />
          <div className="ag-card h-96 animate-pulse bg-white" />
        </div>
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="p-12 text-center text-[#60736F]">
        <p className="text-lg font-bold text-[#142522]">Incident not found</p>
        <Link to="/incidents" className="text-xs font-bold text-[#0F766E] hover:underline mt-2 inline-block">
          ← Back to Incidents List
        </Link>
      </div>
    )
  }

  const inc = incident
  const displayId = `INC-2026-${String(inc.id + 1050)}`
  const zoneObj = inc.zone_id ? { id: inc.zone_id, name: inc.zone_name } : null
  const reportsList = inc.reports || []

  const TABS = [
    { id: 'summary',  label: 'Summary' },
    { id: 'ai',       label: `AI Analysis & Evidence (${reportsList.length})` },
    { id: 'sensor',   label: 'Sensor Data' },
    { id: 'timeline', label: `Timeline (${inc.audit_events?.length || 0})` },
    { id: 'tasks',    label: `Field Updates (${inc.tasks?.length || 0})` },
  ]

  return (
    <div className="p-6 space-y-5 max-w-[1500px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#60736F] font-medium">
        <Link to="/incidents" className="hover:text-[#073B3A] flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Incidents
        </Link>
        <span>›</span>
        <span className="text-[#073B3A] font-bold">{displayId}</span>
      </div>

      {/* Top Header Card */}
      <div className="ag-card p-5 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-[#073B3A] tracking-tight font-mono">
                {displayId}
              </h1>
              <StatusBadge status={inc.status} />
              <PriorityBadge level={inc.priority_level} score={inc.priority_score} />
              <ConfidenceBadge level={inc.confidence_level} />
            </div>
            <p className="text-xs font-semibold text-[#60736F] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
              {inc.zone_name || inc.zone_id} · Lat {inc.latitude?.toFixed(4)}, Lng {inc.longitude?.toFixed(4)}
            </p>
          </div>

          {/* Operator Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-[#F7FBFA] border border-[#D8E8E4] rounded-[10px] p-1">
              <select
                value={engineerId}
                onChange={e => setEngineerId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#142522] px-2 py-1 focus:outline-none"
              >
                {engineers.length > 0 ? (
                  engineers.map(eng => (
                    <option key={eng.id} value={eng.id}>{eng.name} (Field Engineer)</option>
                  ))
                ) : (
                  <>
                    <option value="2">Priya Sharma (Field Engineer)</option>
                    <option value="3">Ravi Kumar (Field Engineer)</option>
                  </>
                )}
              </select>
              <button
                onClick={handleAssign}
                disabled={!!actionLoading}
                className="px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#073B3A] text-white text-xs font-bold flex items-center gap-1"
              >
                {actionLoading === 'assign' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <User className="w-3.5 h-3.5" />}
                Assign Technician
              </button>
            </div>

            <button
              onClick={() => setOverrideModal(v => !v)}
              className="ag-btn-secondary text-xs py-2 px-3"
            >
              <Sliders className="w-3.5 h-3.5 text-[#0F766E]" />
              Override Priority
            </button>

            {inc.status !== 'VERIFIED_RESOLVED' ? (
              <button
                onClick={() => handleVerify('VERIFY')}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verify Resolved
              </button>
            ) : (
              <button
                onClick={() => handleVerify('REOPEN')}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-[#DC2626] text-white text-xs font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reopen Incident
              </button>
            )}
          </div>
        </div>

        {/* Override Priority Modal Drawer */}
        {overrideModal && (
          <form onSubmit={handleOverride} className="bg-[#F7FBFA] border border-[#D8E8E4] rounded-xl p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#60736F] mb-1">New Score (0–100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={overrideScore}
                onChange={e => setOverrideScore(e.target.value)}
                className="ag-input w-28 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#60736F] mb-1">Priority Level</label>
              <select
                value={overrideLevel}
                onChange={e => setOverrideLevel(e.target.value)}
                className="ag-input py-1.5 text-xs font-semibold"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] font-bold text-[#60736F] mb-1">Mandatory Audit Reason *</label>
              <input
                type="text"
                required
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="e.g. Hospital main feeder — escalating for immediate dispatch"
                className="ag-input w-full py-1.5 text-xs"
              />
            </div>
            <button type="submit" className="ag-btn-primary py-1.5 px-4 text-xs">Save Override</button>
          </form>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 border-t border-[#D8E8E4] pt-3 overflow-x-auto">
          {TABS.map(t => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`pb-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[#0F766E] text-[#0F766E]'
                    : 'border-transparent text-[#60736F] hover:text-[#142522]'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2-Column Summary Grid: Column 1 Incident Summary + Column 2 AI Priority Score */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Column 1: Incident Summary + Water Loss Estimate */}
          <div className="lg:col-span-6 ag-card p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <h3 className="text-sm font-bold text-[#142522] border-b border-[#D8E8E4] pb-2.5">
                Incident Summary
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-[#60736F] block">Reported At</span>
                  <strong className="text-[#142522] font-semibold">{fmtDateTime(inc.created_at)}</strong>
                </div>

                <div>
                  <span className="text-[#60736F] block">Reported By / Source</span>
                  <strong className="text-[#142522] font-semibold">
                    {reportsList.length > 0 ? `Citizen App (${reportsList.length} report) + IoT Sensor` : 'Zone IoT Sensor Telemetry'}
                  </strong>
                </div>

                <div>
                  <span className="text-[#60736F] block">Zone</span>
                  <strong className="text-[#142522] font-semibold">{inc.zone_name || inc.zone_id}</strong>
                </div>

                <div>
                  <span className="text-[#60736F] block mb-1">Evidence Confidence</span>
                  <ConfidenceBadge level={inc.confidence_level} />
                </div>

                <div>
                  <span className="text-[#60736F] block">Assigned To</span>
                  <strong className="text-[#142522] font-semibold">
                    {inc.assigned_engineer_name || 'Unassigned — Ready for dispatch'}
                  </strong>
                </div>

                <div>
                  <span className="text-[#60736F] block">Target SLA</span>
                  <strong className="text-[#0F766E] font-bold">
                    {inc.priority_level === 'CRITICAL' ? 'Immediate (< 2 hours)' : 'Within 4 hours'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Modeled Water Loss Card */}
            <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#073B3A]">Modeled Water Loss</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white text-[#0F766E] border border-[#99F6E4]">
                  Simulated
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white rounded-lg p-2 border border-[#D8E8E4]">
                  <span className="text-[10px] text-[#60736F] block">Excess Flow</span>
                  <strong className="text-sm font-extrabold text-[#0F766E]">
                    +{inc.estimated_excess_flow_lpm || 0} L/min
                  </strong>
                </div>
                <div className="bg-white rounded-lg p-2 border border-[#D8E8E4]">
                  <span className="text-[10px] text-[#60736F] block">24h Potential Loss</span>
                  <strong className="text-sm font-extrabold text-[#DC2626]">
                    {Number(inc.estimated_loss_24h_liters || 0).toLocaleString()} L
                  </strong>
                </div>
              </div>
              <p className="text-[10px] text-[#60736F]">
                Basis: Simulated zone-level flow deviation · Field verification required.
              </p>
            </div>
          </div>

          {/* Column 2: AI Priority Score Card (86 / 100 + Why this score?) */}
          <div className="lg:col-span-6">
            <AiIncidentBrief incident={inc} />
          </div>
        </div>
      )}

      {/* Prominent Linked Citizen Reports & Photo Evidence Section (Max 2 Reports) */}
      <div className="ag-card p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#D8E8E4] pb-3.5">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-[#0F766E]" />
            <div>
              <h2 className="text-base font-extrabold text-[#073B3A]">
                Linked Citizen Reports &amp; Photo Evidence ({Math.min(2, reportsList.length)})
              </h2>
              <p className="text-xs text-[#60736F]">
                Showing top corroborated citizen leak reports and photo proofs for {displayId}
              </p>
            </div>
          </div>
          <Link
            to="/report"
            className="ag-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#0F766E]" />
            Link Another Report
          </Link>
        </div>

        {reportsList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {reportsList.slice(0, 2).map((r, idx) => {
              const displayImg = r.image_url || DEMO_LEAK_IMAGES[idx % DEMO_LEAK_IMAGES.length]
              return (
                <div
                  key={r.id || idx}
                  className="bg-[#F7FBFA] border border-[#D8E8E4] rounded-2xl p-4 space-y-3.5 hover:border-[#14B8A6] transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[#073B3A] bg-white border border-[#D8E8E4] px-2.5 py-1 rounded-lg">
                        {r.tracking_reference}
                      </span>
                      <span className="text-xs font-bold text-[#142522]">
                        {(r.issue_type || 'PIPELINE_LEAK').replace(/_/g, ' ')}
                      </span>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  {/* Evidence Photo (Uploaded or Demo Leak Image) */}
                  <div className="relative rounded-xl overflow-hidden bg-[#073B3A] border border-[#D8E8E4] h-52 flex items-center justify-center">
                    <img
                      src={displayImg}
                      alt={`Citizen photo for ${r.tracking_reference}`}
                      className="w-full h-full object-cover"
                    />

                    {/* AI Severity Overlay Pill */}
                    <div className="absolute bottom-2 left-2 bg-[#073B3A]/85 backdrop-blur text-[#2DD4BF] border border-[#14B8A6] text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                      AI Verified: {r.ai_image_tags?.assessment_text || 'Water pooling & surface pipeline leak'}
                    </div>
                  </div>

                  {/* Citizen Description Card */}
                  <div className="bg-white rounded-xl p-3.5 border border-[#D8E8E4] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#60736F] block">
                      Citizen Description
                    </span>
                    <p className="text-xs font-semibold text-[#142522] leading-relaxed">
                      &ldquo;{r.description || 'Visible continuous water leak observed on road near pipeline collar joint.'}&rdquo;
                    </p>
                  </div>

                  {/* Metadata & Public Link */}
                  <div className="flex items-center justify-between text-[11px] text-[#60736F] pt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                      {Number(r.latitude).toFixed(4)}° N, {Number(r.longitude).toFixed(4)}° E
                    </span>
                    <Link
                      to={`/track-report?ref=${r.tracking_reference}`}
                      className="font-bold text-[#0F766E] hover:underline flex items-center gap-1"
                    >
                      Track Citizen View →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-[#F7FBFA] rounded-xl border border-dashed border-[#D8E8E4] space-y-2">
            <Camera className="w-8 h-8 text-[#14B8A6] mx-auto opacity-75" />
            <p className="text-xs font-bold text-[#142522]">No citizen reports linked to this incident yet</p>
            <p className="text-[11px] text-[#60736F] max-w-md mx-auto">
              Any citizen report submitted on the Citizen Portal within 100m will automatically corroborate and display its photo and description here.
            </p>
            <Link to="/report" className="ag-btn-primary text-xs py-1.5 px-3.5 mt-2 inline-flex">
              Submit Test Citizen Report →
            </Link>
          </div>
        )}
      </div>

      {/* Tab 3: Sensor Data */}
      {(activeTab === 'sensor' || activeTab === 'summary') && (
        <SensorChart readings={readings} zone={zoneObj} loading={false} height={230} />
      )}

      {/* Tab 4 & 5: Field Tasks & Audit Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Field Tasks */}
        <div className="ag-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#142522]">Field Technician Tasks ({inc.tasks?.length || 0})</h3>
            <Link to="/tasks" className="text-xs font-bold text-[#0F766E] hover:underline">
              Open Tasks Board →
            </Link>
          </div>
          {inc.tasks?.length ? (
            <div className="space-y-2.5">
              {inc.tasks.map(t => (
                <div key={t.id} className="bg-[#F7FBFA] border border-[#D8E8E4] rounded-xl p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#073B3A]">TSK-{String(t.id).padStart(3, '0')} · {t.task_type}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-[#142522] font-semibold">Assigned Engineer: {t.assigned_to}</p>
                  {t.findings && <p className="text-[#60736F]"><strong>Findings:</strong> {t.findings}</p>}
                  {t.repair_action && <p className="text-[#0F766E]"><strong>Action:</strong> {t.repair_action}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#60736F] py-6 text-center">No technician tasks assigned yet.</p>
          )}
        </div>

        {/* Activity Audit Timeline */}
        <div className="ag-card p-5 space-y-3">
          <h3 className="text-sm font-bold text-[#142522]">Immutable Accountability Timeline</h3>
          {inc.audit_events?.length ? (
            <div className="space-y-3 relative pl-4 before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-0.5 before:bg-[#D8E8E4]">
              {inc.audit_events.map(ev => (
                <div key={ev.id} className="relative text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] absolute -left-[13px] top-1 border-2 border-white" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#073B3A]">{ev.action?.replace(/_/g, ' ')}</span>
                    <span className="text-[11px] text-[#60736F]">{fmtDateTime(ev.created_at)}</span>
                  </div>
                  {ev.reason && <p className="text-[#60736F] mt-0.5">{ev.reason}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#60736F] py-6 text-center">No audit events recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
