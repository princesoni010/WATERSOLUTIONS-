import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getIncidents, getReports, seedDemoData } from '../api/client.js'
import { PriorityBadge, StatusBadge, ConfidenceBadge } from '../components/KPIcards.jsx'
import { Search, Download, Eye, PlusCircle, Droplets, Calendar, FileText } from 'lucide-react'

function fmtDate(iso) {
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

export default function Incidents() {
  const [searchParams] = useSearchParams()
  const [incidents, setIncidents] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('incidents')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [zoneFilter, setZoneFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')
  const [search, setSearch] = useState(searchParams.get('q') || '')

  const load = async () => {
    setLoading(true)
    try {
      const params = { limit: 100 }
      if (priorityFilter !== 'ALL') params.priority_level = priorityFilter
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (zoneFilter !== 'ALL') params.zone_id = zoneFilter

      const [incRes, repRes] = await Promise.all([
        getIncidents(params),
        getReports({ limit: 100 }),
      ])

      if ((incRes.data.incidents || []).length === 0 && priorityFilter === 'ALL' && statusFilter === 'ALL' && zoneFilter === 'ALL') {
        await seedDemoData()
        const [r2, rep2] = await Promise.all([getIncidents(params), getReports({ limit: 100 })])
        setIncidents(r2.data.incidents || [])
        setReports(rep2.data.reports || [])
      } else {
        setIncidents(incRes.data.incidents || [])
        setReports(repRes.data.reports || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [priorityFilter, statusFilter, zoneFilter])

  const filteredIncidents = [...incidents]
    .filter(i =>
      !search ||
      `INC-2026-${i.id + 1050} INC-${String(i.id).padStart(3, '0')} ${i.zone_name || ''} ${i.zone_id || ''} ${i.status || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
      }
      return (b.priority_score || 0) - (a.priority_score || 0)
    })

  const filteredReports = reports.filter(r =>
    !search ||
    `${r.tracking_reference} ${r.issue_type} ${r.description || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const exportCsv = () => {
    const headers = ['Incident ID', 'Zone', 'Priority', 'Score', 'Status', 'Confidence', 'Excess Flow LPM', 'Loss 24h Liters']
    const rows = filteredIncidents.map(i => [
      `INC-2026-${i.id + 1050}`,
      `"${i.zone_name || i.zone_id}"`,
      i.priority_level,
      i.priority_score,
      i.status,
      i.confidence_level,
      i.estimated_excess_flow_lpm,
      i.estimated_loss_24h_liters,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'aquaguard_incidents.csv'
    a.click()
  }

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#073B3A]">Incidents &amp; Citizen Reports</h1>
          <p className="text-xs text-[#60736F] font-medium">
            View, prioritize, and manage all suspected leak incidents and citizen-submitted reports
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={exportCsv} className="ag-btn-secondary text-xs py-2 px-3.5">
            <Download className="w-3.5 h-3.5 text-[#0F766E]" />
            Export CSV
          </button>
          <Link to="/report" className="ag-btn-primary text-xs py-2 px-3.5">
            <PlusCircle className="w-3.5 h-3.5" />
            Log New Report / Incident
          </Link>
        </div>
      </div>

      {/* Tab Switcher: All Incidents vs Citizen Reports Received */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${
            activeTab === 'incidents'
              ? 'bg-[#0F766E] text-white shadow-sm'
              : 'bg-white border border-[#D8E8E4] text-[#60736F] hover:text-[#142522]'
          }`}
        >
          Operational Incidents ({filteredIncidents.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-[10px] text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'reports'
              ? 'bg-[#0F766E] text-white shadow-sm'
              : 'bg-white border border-[#D8E8E4] text-[#60736F] hover:text-[#142522]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Citizen Reports Submitted ({filteredReports.length})
        </button>
      </div>

      {/* Main White Card */}
      <div className="ag-card overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-[#D8E8E4] flex items-center justify-between flex-wrap gap-3 bg-[#F7FBFA]/60">
          <div className="flex items-center gap-2.5 flex-wrap flex-1">
            <div className="relative w-64 max-w-full">
              <Search className="w-4 h-4 text-[#60736F] absolute left-3 top-2.5" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ID, zone, or description..."
                className="ag-input w-full pl-9 py-1.5 text-xs"
              />
            </div>

            {activeTab === 'incidents' && (
              <>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="ag-input py-1.5 text-xs font-semibold"
                >
                  <option value="newest">Sort: Newest / Recently Updated</option>
                  <option value="priority">Sort: Highest Priority Score</option>
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
                  <option value="REPAIR_IN_PROGRESS">Repair In Progress</option>
                  <option value="REPAIR_COMPLETED">Repair Completed</option>
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

                <select
                  value={zoneFilter}
                  onChange={e => setZoneFilter(e.target.value)}
                  className="ag-input py-1.5 text-xs font-semibold"
                >
                  <option value="ALL">All Zones</option>
                  <option value="ZONE-A">Zone A — Civil Lines</option>
                  <option value="ZONE-B">Zone B — Pandri Market</option>
                  <option value="ZONE-C">Zone C — Shankar Nagar</option>
                  <option value="ZONE-D">Zone D — Telibandha Hospital</option>
                  <option value="ZONE-E">Zone E — Tatibandh</option>
                </select>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-white border border-[#D8E8E4] text-xs text-[#60736F] font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Live Database</span>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#F7FBFA] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'incidents' ? (
          filteredIncidents.length === 0 ? (
            <div className="text-center py-16 text-[#60736F]">
              <Droplets className="mx-auto w-10 h-10 text-[#14B8A6] mb-2 opacity-60" />
              <p className="text-sm font-bold text-[#142522]">No incidents match the current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7FBFA] border-b border-[#D8E8E4] text-[11px] font-bold uppercase tracking-wider text-[#60736F]">
                    <th className="py-3.5 px-5">ID</th>
                    <th className="py-3.5 px-4">Location / Zone</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Updated / Reported At</th>
                    <th className="py-3.5 px-4">Confidence</th>
                    <th className="py-3.5 px-4">Assigned Engineer</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8E8E4] text-xs">
                  {filteredIncidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-[#F0FDFA]/60 transition-colors">
                      <td className="py-4 px-5 font-mono font-extrabold text-[#073B3A]">
                        <Link to={`/incidents/${inc.id}`} className="hover:underline">
                          INC-2026-{String(inc.id + 1050)}
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-[#142522]">{inc.zone_name || inc.zone_id}</p>
                        <p className="text-[11px] text-[#60736F]">
                          {inc.report_count || 0} citizen report(s) · +{inc.estimated_excess_flow_lpm || 0} L/min
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <PriorityBadge level={inc.priority_level} score={inc.priority_score} variant="dot" />
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={inc.status} />
                      </td>
                      <td className="py-4 px-4 text-[#60736F] font-medium">
                        {fmtDate(inc.updated_at || inc.created_at)}
                      </td>
                      <td className="py-4 px-4">
                        <ConfidenceBadge level={inc.confidence_level} />
                      </td>
                      <td className="py-4 px-4 font-medium text-[#142522]">
                        {inc.assigned_engineer_name || <span className="text-[#60736F] italic">Unassigned</span>}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          to={`/incidents/${inc.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[#D8E8E4] hover:border-[#0F766E] hover:bg-[#F0FDFA] text-[#073B3A]"
                          title="Open Incident Decision View"
                        >
                          <Eye className="w-4 h-4 text-[#0F766E]" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7FBFA] border-b border-[#D8E8E4] text-[11px] font-bold uppercase tracking-wider text-[#60736F]">
                  <th className="py-3.5 px-5">Tracking ID</th>
                  <th className="py-3.5 px-4">Issue Category</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Coordinates</th>
                  <th className="py-3.5 px-4">Submitted At</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Linked Case</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E8E4] text-xs">
                {filteredReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-[#F0FDFA]/60 transition-colors">
                    <td className="py-4 px-5 font-mono font-extrabold text-[#0F766E]">
                      {rep.tracking_reference}
                    </td>
                    <td className="py-4 px-4 font-bold text-[#142522]">
                      {(rep.issue_type || 'PIPELINE_LEAK').replace(/_/g, ' ')}
                    </td>
                    <td className="py-4 px-4 text-[#60736F] max-w-sm">
                      {rep.description || 'Visible water leak reported by citizen'}
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px] text-[#60736F]">
                      {Number(rep.latitude).toFixed(4)}, {Number(rep.longitude).toFixed(4)}
                    </td>
                    <td className="py-4 px-4 text-[#60736F]">
                      {fmtDate(rep.created_at)}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={rep.status} />
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-[#073B3A]">
                      {rep.incident_id ? (
                        <Link to={`/incidents/${rep.incident_id}`} className="text-[#0F766E] hover:underline">
                          INC-2026-{String(rep.incident_id + 1050)}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
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
                          Track
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Pagination Bar */}
        <div className="px-5 py-3.5 border-t border-[#D8E8E4] bg-[#F7FBFA]/50 flex items-center justify-between text-xs text-[#60736F]">
          <span>
            Showing <strong>1 to {activeTab === 'incidents' ? filteredIncidents.length : filteredReports.length}</strong> results
          </span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 rounded border border-[#D8E8E4] bg-white text-[#60736F]">‹</button>
            <button className="px-2.5 py-1 rounded bg-[#073B3A] text-white font-bold">1</button>
            <button className="px-2.5 py-1 rounded border border-[#D8E8E4] bg-white text-[#60736F]">›</button>
          </div>
        </div>
      </div>
    </div>
  )
}
