import { Link } from 'react-router-dom'
import { PriorityBadge, StatusBadge, ConfidenceBadge } from './KPIcards.jsx'
import { Clock, Droplets, ArrowRight } from 'lucide-react'

export function timeAgo(isoStr) {
  if (!isoStr) return 'Just now'
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000
  if (diff < 60) return `${Math.max(1, Math.round(diff))}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

export default function PriorityQueue({ incidents = [], loading }) {
  if (loading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#F7FBFA] border border-[#D8E8E4] rounded-xl h-20 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!incidents.length) {
    return (
      <div className="text-center text-[#60736F] py-10 bg-[#F7FBFA] rounded-xl border border-[#D8E8E4]">
        <Droplets className="mx-auto mb-2 w-7 h-7 text-[#14B8A6]" />
        <p className="text-sm font-semibold text-[#142522]">No active priority incidents</p>
        <p className="text-xs text-[#60736F] mt-0.5">All monitored water zones are operating near baseline.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5 max-h-[390px] overflow-y-auto pr-1">
      {incidents.map((inc) => (
        <Link
          key={inc.id}
          to={`/incidents/${inc.id}`}
          className="block bg-[#F7FBFA] hover:bg-[#F0FDFA] border border-[#D8E8E4] hover:border-[#14B8A6] rounded-xl p-3.5 transition-all group"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-extrabold text-[#073B3A]">
                INC-2026-{String(inc.id + 1050)}
              </span>
              <PriorityBadge level={inc.priority_level} score={inc.priority_score} />
            </div>
            <StatusBadge status={inc.status} />
          </div>

          <p className="text-xs font-semibold text-[#142522] truncate">
            {inc.zone_name || inc.zone_id}
          </p>

          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#D8E8E4]/70 text-[11px] text-[#60736F]">
            <div className="flex items-center gap-2">
              <ConfidenceBadge level={inc.confidence_level} />
              {inc.estimated_excess_flow_lpm > 0 && (
                <span className="text-[#0F766E] font-semibold">
                  +{inc.estimated_excess_flow_lpm} L/m
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 text-[#0F766E] font-semibold group-hover:translate-x-0.5 transition-transform">
              <Clock className="w-3 h-3 text-[#60736F]" />
              {timeAgo(inc.created_at)}
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
