import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Loader2, ChevronRight, Wrench, MapPin, User } from 'lucide-react'
import { updateTask } from '../api/client.js'
import { PriorityBadge, StatusBadge, ConfidenceBadge } from './KPIcards.jsx'

const STATUS_FLOW = ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED']

export default function TaskBoard({ tasks = [], loading, onUpdate, viewMode = 'kanban' }) {
  const [updatingId, setUpdatingId] = useState(null)

  const advance = async (task) => {
    const idx = STATUS_FLOW.indexOf(task.status)
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return
    const newStatus = STATUS_FLOW[idx + 1]
    setUpdatingId(task.id)
    try {
      await updateTask(task.id, {
        status: newStatus,
        findings: task.findings || 'Field engineer confirmed pipeline joint seepage during on-site inspection.',
        repair_action: newStatus === 'COMPLETED' ? (task.repair_action || 'Replaced damaged collar seal and pressure-tested line.') : task.repair_action,
        field_confirmed: newStatus === 'COMPLETED' || task.task_type === 'INSPECTION',
      })
      onUpdate?.()
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="ag-card h-64 animate-pulse bg-white" />
        ))}
      </div>
    )
  }

  if (!tasks.length) {
    return (
      <div className="ag-card text-center text-[#60736F] py-12">
        <Wrench className="mx-auto mb-2 w-8 h-8 text-[#14B8A6]" />
        <p className="text-sm font-bold text-[#142522]">No technician tasks assigned yet</p>
        <p className="text-xs mt-1">Assign an engineer from any Incident Detail screen to create a field task.</p>
      </div>
    )
  }

  if (viewMode === 'kanban') {
    const columns = [
      { key: 'ASSIGNED',    title: 'Assigned',    accent: 'border-t-4 border-t-[#6D28D9]' },
      { key: 'ACCEPTED',    title: 'Accepted',    accent: 'border-t-4 border-t-[#0284C7]' },
      { key: 'IN_PROGRESS', title: 'In Progress', accent: 'border-t-4 border-t-[#0F766E]' },
      { key: 'COMPLETED',   title: 'Completed',   accent: 'border-t-4 border-t-[#16A34A]' },
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key)
          return (
            <div key={col.key} className={`ag-card ${col.accent} p-3.5 bg-[#F7FBFA]/70 flex flex-col`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#142522]">
                  {col.title}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-[#D8E8E4] text-[#073B3A]">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#60736F] border border-dashed border-[#D8E8E4] rounded-xl">
                    No tasks in {col.title}
                  </div>
                ) : (
                  colTasks.map(task => {
                    const idx = STATUS_FLOW.indexOf(task.status)
                    const canAdvance = idx >= 0 && idx < STATUS_FLOW.length - 1
                    return (
                      <div key={task.id} className="bg-white border border-[#D8E8E4] rounded-xl p-3.5 shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            to={`/incidents/${task.incident_id}`}
                            className="font-mono text-xs font-extrabold text-[#073B3A] hover:text-[#0F766E] hover:underline"
                          >
                            INC-2026-{String((task.incident_id || 1) + 1050)}
                          </Link>
                          <PriorityBadge level={task.priority_level || 'HIGH'} />
                        </div>

                        <p className="text-xs font-bold text-[#142522] flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                          <span className="truncate">{task.zone_name || task.zone_id || 'Zone B — Pandri'}</span>
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-[#60736F]">
                          <span className="px-2 py-0.5 rounded bg-[#F0FDFA] text-[#0F766E] font-semibold border border-[#99F6E4]">
                            {task.task_type}
                          </span>
                          <span className="flex items-center gap-1 font-medium text-[#142522]">
                            <User className="w-3 h-3 text-[#60736F]" />
                            {task.assigned_to || 'Priya Sharma'}
                          </span>
                        </div>

                        {task.findings && (
                          <p className="text-[11px] text-[#60736F] bg-[#F7FBFA] p-2 rounded-lg border border-[#D8E8E4] line-clamp-2">
                            {task.findings}
                          </p>
                        )}

                        <div className="pt-1 flex items-center justify-between gap-2">
                          <ConfidenceBadge level={task.confidence_level || 'CORROBORATED'} showPct={false} />
                          {canAdvance ? (
                            <button
                              onClick={() => advance(task)}
                              disabled={updatingId === task.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0F766E] hover:bg-[#073B3A] text-white text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-60"
                            >
                              {updatingId === task.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                              {STATUS_FLOW[idx + 1].replace('_', ' ')}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Table/List mode
  return (
    <div className="space-y-3">
      {tasks.map(task => {
        const idx = STATUS_FLOW.indexOf(task.status)
        const canAdvance = idx < STATUS_FLOW.length - 1 && task.status !== 'CANCELLED'
        return (
          <div key={task.id} className="ag-card p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-extrabold text-[#073B3A]">TSK-{String(task.id).padStart(3, '0')}</span>
                <span className="text-xs bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4] font-semibold px-2 py-0.5 rounded">
                  {task.task_type}
                </span>
                <StatusBadge status={task.status} />
                <PriorityBadge level={task.priority_level || 'HIGH'} />
              </div>
              <div className="text-xs text-[#60736F] flex items-center gap-2">
                <span>{task.zone_name || 'Municipal Zone'}</span>
                <span>·</span>
                <span>Engineer: <strong className="text-[#142522]">{task.assigned_to}</strong></span>
                {task.incident_id && (
                  <Link to={`/incidents/${task.incident_id}`} className="text-[#0F766E] font-semibold hover:underline">
                    → Open INC-2026-{String(task.incident_id + 1050)}
                  </Link>
                )}
              </div>
            </div>

            {canAdvance && (
              <button
                onClick={() => advance(task)}
                disabled={updatingId === task.id}
                className="ag-btn-primary text-xs py-2 px-3"
              >
                {updatingId === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Advance to {STATUS_FLOW[idx + 1].replace('_', ' ')}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
