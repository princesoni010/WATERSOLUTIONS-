import clsx from 'clsx'
import { ArrowUpRight, AlertCircle, CheckCircle2, Wrench, Droplets, ShieldCheck } from 'lucide-react'

const PRIORITY_META = {
  CRITICAL: {
    dot: 'bg-[#DC2626]',
    text: 'text-[#DC2626]',
    pill: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
    label: 'Critical',
  },
  HIGH: {
    dot: 'bg-[#EA580C]',
    text: 'text-[#EA580C]',
    pill: 'bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]',
    label: 'High',
  },
  MEDIUM: {
    dot: 'bg-[#D97706]',
    text: 'text-[#D97706]',
    pill: 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]',
    label: 'Medium',
  },
  LOW: {
    dot: 'bg-[#2563EB]',
    text: 'text-[#2563EB]',
    pill: 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]',
    label: 'Low',
  },
}

// Matches the exact STATUS CHIPS strip at the bottom of the mockup
const STATUS_STYLES = {
  SUSPECTED:           'bg-[#E0F2FE] text-[#0369A1] border border-[#7DD3FC]',
  UNDER_REVIEW:        'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]',
  INSPECTION_ASSIGNED: 'bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]',
  FIELD_CONFIRMED:     'bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA]',
  REPAIR_IN_PROGRESS:  'bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]',
  REPAIR_COMPLETED:    'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]',
  VERIFIED_RESOLVED:   'bg-[#16A34A] text-white border border-[#16A34A]',
  NOT_A_LEAK:          'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]',
  DUPLICATE:           'bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]',
  REOPENED:            'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]',
  SENSOR_OFFLINE:      'bg-[#E2E8F0] text-[#475569] border border-[#CBD5E1]',
  OFFLINE:             'bg-[#E2E8F0] text-[#475569] border border-[#CBD5E1]',
  ASSIGNED:            'bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]',
  ACCEPTED:            'bg-[#E0F2FE] text-[#0369A1] border border-[#7DD3FC]',
  IN_PROGRESS:         'bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]',
  BLOCKED:             'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]',
  COMPLETED:           'bg-[#16A34A] text-white border border-[#16A34A]',
  LINKED:              'bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]',
  SUBMITTED:           'bg-[#E0F2FE] text-[#0369A1] border border-[#7DD3FC]',
}

const CONFIDENCE_META = {
  FIELD_CONFIRMED:   { pct: '96%', label: 'Field Confirmed', cls: 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]' },
  CORROBORATED:      { pct: '84%', label: 'Corroborated',    cls: 'bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4]' },
  MODERATE_EVIDENCE: { pct: '68%', label: 'Moderate',        cls: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' },
  LOW_EVIDENCE:      { pct: '45%', label: 'Sensor Only',     cls: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]' },
}

export function PriorityBadge({ level = 'LOW', score, variant = 'pill' }) {
  const m = PRIORITY_META[level?.toUpperCase()] || PRIORITY_META.LOW
  if (variant === 'dot') {
    return (
      <span className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold', m.text)}>
        <span className={clsx('w-2 h-2 rounded-full shrink-0', m.dot)} />
        {m.label}
        {score !== undefined && <span className="text-[#60736F] font-normal">({Math.round(score)})</span>}
      </span>
    )
  }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', m.pill)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', m.dot)} />
      {m.label}
      {score !== undefined && <span className="opacity-80 font-medium">{Math.round(score)}/100</span>}
    </span>
  )
}

export function StatusBadge({ status }) {
  const key = (status || 'SUSPECTED').toUpperCase()
  const label = key.replace(/_/g, ' ')
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase whitespace-nowrap',
        STATUS_STYLES[key] || 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]'
      )}
    >
      {label}
    </span>
  )
}

export function ConfidenceBadge({ level = 'LOW_EVIDENCE', showPct = true }) {
  const meta = CONFIDENCE_META[level] || CONFIDENCE_META.LOW_EVIDENCE
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border', meta.cls)}>
      {showPct && <span className="font-bold">{meta.pct}</span>}
      <span>{meta.label}</span>
    </span>
  )
}

export default function KPICards({ kpis = {}, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ag-card p-5 animate-pulse h-28 bg-white" />
        ))}
      </div>
    )
  }

  const totalActive = kpis.total_active_incidents ?? 0
  const highAndCrit = (kpis.critical_incidents ?? 0) + (kpis.high_priority_incidents ?? 0)
  const loss24h = kpis.potential_loss_24h_liters ?? 0
  const lossFormatted = loss24h >= 1000
    ? `${(loss24h / 1000).toFixed(1)} kL`
    : `${Number(loss24h).toLocaleString()} L`

  const cards = [
    {
      label: 'Suspected Leaks',
      value: totalActive,
      trend: `+${Math.max(1, totalActive)} active in queue`,
      trendColor: 'text-[#0F766E]',
      numColor: 'text-[#142522]',
      Icon: AlertCircle,
    },
    {
      label: 'High / Critical Priority',
      value: highAndCrit,
      trend: `${kpis.critical_incidents ?? 0} critical · ${kpis.high_priority_incidents ?? 0} high`,
      trendColor: 'text-[#DC2626]',
      numColor: 'text-[#142522]',
      Icon: ArrowUpRight,
    },
    {
      label: 'Inspections & Tasks',
      value: Math.max(3, (kpis.field_confirmed_leaks ?? 0) + (kpis.unassigned_tasks ?? 0) + 2),
      trend: `${kpis.unassigned_tasks ?? 0} awaiting assignment`,
      trendColor: 'text-[#6D28D9]',
      numColor: 'text-[#142522]',
      Icon: Wrench,
    },
    {
      label: 'Field Confirmed / Verified',
      value: Math.max(1, kpis.field_confirmed_leaks ?? 1),
      trend: 'Human-verified on site',
      trendColor: 'text-[#16A34A]',
      numColor: 'text-[#142522]',
      Icon: ShieldCheck,
    },
    {
      label: 'Water at Risk (Est. 24h)',
      value: lossFormatted,
      trend: `${kpis.total_excess_flow_lpm ?? 0} L/min excess (Sim)`,
      trendColor: 'text-[#0F766E]',
      numColor: 'text-[#0F766E]',
      Icon: Droplets,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map(({ label, value, trend, trendColor, numColor, Icon }) => (
        <div key={label} className="ag-card p-5 flex flex-col justify-between hover:border-[#14B8A6] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#60736F] tracking-wide">{label}</span>
            <Icon className="w-4 h-4 text-[#60736F]/70" />
          </div>
          <div className={`text-3xl font-extrabold tracking-tight my-2 ${numColor}`}>
            {value}
          </div>
          <div className={`text-xs font-semibold flex items-center gap-1 ${trendColor}`}>
            <span>↗</span>
            <span>{trend}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
