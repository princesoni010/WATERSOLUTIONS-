import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PublicNavbar } from '../components/Navbar.jsx'
import { getReportStatus, seedDemoData } from '../api/client.js'
import { StatusBadge } from '../components/KPIcards.jsx'
import IncidentMap from '../components/IncidentMap.jsx'
import {
  Search, CheckCircle2, Clock, MapPin, ShieldCheck,
  FileText, ArrowRight, AlertCircle, Copy, Check, PlusCircle
} from 'lucide-react'

const SAMPLE_REFS = [
  'AG-2026-00101',
  'AG-2026-00104',
  'AG-2026-00108',
  'AG-2026-00112',
]

function getStageIndex(report) {
  if (!report) return 0
  const incStatus = report.incident_status
  const repStatus = report.status
  if (incStatus === 'VERIFIED_RESOLVED' || incStatus === 'REPAIR_COMPLETED') return 3
  if (['INSPECTION_ASSIGNED', 'FIELD_CONFIRMED', 'REPAIR_IN_PROGRESS'].includes(incStatus)) return 2
  if (repStatus === 'LINKED' || repStatus === 'UNDER_REVIEW' || incStatus === 'UNDER_REVIEW' || incStatus === 'SUSPECTED') return 1
  return 0
}

export default function TrackReport() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialRef = searchParams.get('ref') || 'AG-2026-00101'

  const [refInput, setRefInput] = useState(initialRef)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const lookup = useCallback(async (targetRef) => {
    const cleanRef = (targetRef ?? refInput).trim().toUpperCase()
    if (!cleanRef) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await getReportStatus(cleanRef)
      setReport(data.report)
      setSearchParams({ ref: cleanRef }, { replace: true })
    } catch {
      // If demo DB was empty, seed once and retry if it's a default sample ref
      if (SAMPLE_REFS.includes(cleanRef)) {
        try {
          await seedDemoData()
          const r2 = await getReportStatus(cleanRef)
          setReport(r2.data.report)
          setSearchParams({ ref: cleanRef }, { replace: true })
          setLoading(false)
          return
        } catch {}
      }
      setReport(null)
      setError(`No report found for tracking reference "${cleanRef}". Please check your ID and try again.`)
    } finally {
      setLoading(false)
    }
  }, [refInput, setSearchParams])

  useEffect(() => {
    lookup(initialRef)
  }, [])

  const copyId = () => {
    if (!report?.tracking_reference) return
    navigator.clipboard?.writeText(report.tracking_reference)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stageIdx = getStageIndex(report)
  const stages = [
    { title: 'Received',      desc: 'Report logged with tracking ID' },
    { title: 'Under Review',  desc: 'Corroborated with zone telemetry' },
    { title: 'Team Assigned', desc: 'Field engineer dispatched to site' },
    { title: 'Resolved',      desc: 'Repair verified & flow normalized' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#F7FBFA] text-[#142522]">
      <PublicNavbar />

      <div className="max-w-4xl mx-auto px-6 py-10 w-full space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#F0FDFA] border border-[#99F6E4] px-3 py-1 rounded-full">
              Public Citizen Tracking Portal
            </span>
            <h1 className="text-3xl font-extrabold text-[#073B3A] mt-2">Track Your Leak Report</h1>
            <p className="text-sm text-[#60736F] mt-1">
              Enter your tracking reference number to view real-time municipal review and repair progress.
            </p>
          </div>

          <Link to="/report" className="ag-btn-secondary text-xs py-2.5 px-4">
            <PlusCircle className="w-4 h-4 text-[#0F766E]" />
            Report a New Leak
          </Link>
        </div>

        {/* Search Box Card */}
        <div className="ag-card p-6 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              lookup(refInput)
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#60736F] absolute left-3.5 top-3" />
              <input
                type="text"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                placeholder="Enter Tracking Reference (e.g. AG-2026-00101)"
                className="ag-input w-full pl-10 py-2.5 text-sm font-mono font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="ag-btn-primary px-6 py-2.5 text-sm"
            >
              {loading ? 'Searching…' : 'Track Report Status'}
            </button>
          </form>

          {/* Sample Quick-Click Demo References */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[#60736F] font-medium">Try Demo Tracking IDs:</span>
            {SAMPLE_REFS.map((sRef) => (
              <button
                key={sRef}
                type="button"
                onClick={() => {
                  setRefInput(sRef)
                  lookup(sRef)
                }}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold border transition-colors ${
                  report?.tracking_reference === sRef
                    ? 'bg-[#0F766E] text-white border-[#0F766E]'
                    : 'bg-[#F7FBFA] text-[#073B3A] border-[#D8E8E4] hover:border-[#0F766E]'
                }`}
              >
                {sRef}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="ag-card p-6 border-[#FECACA] bg-[#FEF2F2] flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 text-[#DC2626] text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <Link to="/report" className="ag-btn-primary text-xs py-2 px-4">
              Submit a New Report →
            </Link>
          </div>
        )}

        {/* Result Card */}
        {report && (
          <div className="space-y-6">
            {/* Top Status Timeline Card */}
            <div className="ag-card p-6 space-y-6">
              <div className="flex items-start justify-between flex-wrap gap-4 border-b border-[#D8E8E4] pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#60736F]">
                    Tracking Reference
                  </span>
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="font-mono text-2xl font-extrabold text-[#073B3A]">
                      {report.tracking_reference}
                    </span>
                    <button
                      type="button"
                      onClick={copyId}
                      className="p-1.5 rounded-lg border border-[#D8E8E4] hover:bg-[#F7FBFA] text-[#0F766E]"
                      title="Copy Tracking Reference"
                    >
                      {copied ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <StatusBadge status={report.status} />
                  </div>
                </div>

                <div className="text-right text-xs text-[#60736F]">
                  <span className="block">Submitted On</span>
                  <strong className="text-[#142522] font-semibold">
                    {report.created_at
                      ? new Date(report.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '13 Oct 2026'}
                  </strong>
                </div>
              </div>

              {/* 4-Stage Visual Progress Stepper */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {stages.map((st, idx) => {
                  const done = idx <= stageIdx
                  const current = idx === stageIdx
                  return (
                    <div
                      key={st.title}
                      className={`rounded-xl p-3.5 border transition-all ${
                        current
                          ? 'bg-[#F0FDFA] border-[#0F766E] ring-2 ring-[#14B8A6]/25'
                          : done
                          ? 'bg-white border-[#99F6E4]'
                          : 'bg-[#F7FBFA] border-[#D8E8E4] opacity-65'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                          done ? 'bg-[#16A34A] text-white' : 'bg-[#D8E8E4] text-[#60736F]'
                        }`}>
                          {done ? '✓' : idx + 1}
                        </div>
                        <span className="text-xs font-extrabold text-[#073B3A]">{st.title}</span>
                      </div>
                      <p className="text-[11px] text-[#60736F] pl-8">{st.desc}</p>
                    </div>
                  )
                })}
              </div>

              {/* Transparency Note */}
              <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-2 text-[#073B3A]">
                  <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0" />
                  <span>
                    {report.incident_code ? (
                      <>
                        Your report has been linked with municipal operations case{' '}
                        <strong>{report.incident_code}</strong> ({(report.incident_status || 'UNDER_REVIEW').replace(/_/g, ' ')}).
                      </>
                    ) : (
                      <>Your report may be linked with nearby citizen reports or zone sensor alerts after operator review.</>
                    )}
                  </span>
                </div>
                {report.incident_id && (
                  <Link
                    to={`/incidents/${report.incident_id}`}
                    className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
                  >
                    View Operations Case <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {/* Bottom 2-Column Snapshot + Location Map */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-6 ag-card p-6 space-y-4">
                <h2 className="text-sm font-bold text-[#073B3A] flex items-center gap-2 border-b border-[#D8E8E4] pb-3">
                  <FileText className="w-4 h-4 text-[#0F766E]" />
                  Report Snapshot (Public-Safe View)
                </h2>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[#60736F] block">Issue Category</span>
                    <strong className="text-sm font-bold text-[#142522]">
                      {(report.issue_type || 'PIPELINE_LEAK').replace(/_/g, ' ')}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[#60736F] block">Reported Description</span>
                    <p className="text-[#142522] font-medium mt-0.5 bg-[#F7FBFA] p-3 rounded-xl border border-[#D8E8E4]">
                      {report.description || 'Visible water leakage reported via citizen portal.'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[#60736F] block">GPS Coordinates</span>
                    <strong className="text-[#142522] font-mono">
                      {Number(report.latitude).toFixed(4)}° N, {Number(report.longitude).toFixed(4)}° E
                    </strong>
                  </div>

                  {report.image_url && (
                    <div>
                      <span className="text-[#60736F] block mb-1">Attached Evidence Photo</span>
                      <img
                        src={report.image_url}
                        alt="Citizen report attachment"
                        className="rounded-xl max-h-44 object-cover border border-[#D8E8E4]"
                      />
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-[#60736F] pt-2 border-t border-[#D8E8E4]">
                  Privacy Note: Reporter contact details and internal technician notes are never exposed on public tracking pages.
                </p>
              </div>

              <div className="md:col-span-6 ag-card p-6 space-y-3">
                <h2 className="text-sm font-bold text-[#073B3A] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0F766E]" />
                  Reported Location Pin
                </h2>
                <IncidentMap
                  incidents={[
                    {
                      id: report.incident_id || report.id || 1,
                      latitude: report.latitude,
                      longitude: report.longitude,
                      priority_level: 'HIGH',
                      priority_score: 74,
                      status: report.incident_status || report.status,
                      zone_name: `Report ${report.tracking_reference}`,
                    },
                  ]}
                  showControls={false}
                  showZones={true}
                  showSensors={false}
                  height="260px"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
