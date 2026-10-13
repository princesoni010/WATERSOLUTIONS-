import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Droplets, LayoutDashboard, AlertTriangle, Map, Activity,
  Wrench, BarChart3, FlaskConical, Settings, HelpCircle,
  LogOut, Search, Bell, ShieldAlert, PlusCircle, Smartphone
} from 'lucide-react'

export const SIDEBAR_ITEMS = [
  { to: '/dashboard',  label: 'Overview',          Icon: LayoutDashboard },
  { to: '/incidents',  label: 'Incidents',         Icon: AlertTriangle },
  { to: '/map',        label: 'Live Map',          Icon: Map },
  { to: '/sensors',    label: 'Sensor Monitoring', Icon: Activity },
  { to: '/tasks',      label: 'Repair Tasks',      Icon: Wrench },
  { to: '/analytics',  label: 'Analytics',         Icon: BarChart3 },
  { to: '/simulation', label: 'Simulation Lab',    Icon: FlaskConical },
  { to: '/settings',   label: 'Settings',          Icon: Settings },
]

export function PublicNavbar() {
  const { pathname } = useLocation()
  return (
    <header className="bg-white/95 backdrop-blur border-b border-[#D8E8E4] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#073B3A] flex items-center justify-center text-[#14B8A6] shadow-sm">
            <Droplets className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[#073B3A]">
            AquaGuard <span className="text-[#0F766E]">AI</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#60736F]">
          <Link to="/" className={pathname === '/' ? 'text-[#073B3A] font-semibold' : 'hover:text-[#073B3A]'}>Home</Link>
          <Link to="/report" className={pathname === '/report' ? 'text-[#073B3A] font-semibold' : 'hover:text-[#073B3A]'}>Report a Leak</Link>
          <Link to="/track-report" className={pathname.startsWith('/track-report') ? 'text-[#073B3A] font-semibold' : 'hover:text-[#073B3A]'}>Track Report</Link>
          <Link to="/dashboard" className="hover:text-[#073B3A]">Operations Demo</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/track-report"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-xs font-semibold text-[#073B3A] border border-[#D8E8E4] hover:bg-[#F0FDFA]"
          >
            Track Report
          </Link>
          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-semibold bg-[#0F766E] hover:bg-[#073B3A] text-white shadow-sm transition-colors"
          >
            Report a Leak
          </Link>
        </div>
      </div>
    </header>
  )
}

export function OperatorSidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="w-[240px] shrink-0 bg-[#073B3A] text-white flex flex-col justify-between min-h-screen select-none">
      {/* Top Brand + Links */}
      <div>
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-[#5EEAD4] shadow-inner">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white block leading-none">
              AquaGuard <span className="text-[#2DD4BF]">AI</span>
            </span>
            <span className="text-[10px] text-[#99F6E4]/70 font-medium">Municipal Water Ops</span>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {SIDEBAR_ITEMS.map(({ to, label, Icon }) => {
            const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#0F766E] text-white shadow-sm border-l-2 border-[#2DD4BF]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#2DD4BF]' : 'text-slate-400'}`} />
                <span>{label}</span>
              </Link>
            )
          })}

          <div className="pt-3 mt-3 border-t border-white/10">
            <p className="px-3.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
              Public Citizen Pages
            </p>
            <Link
              to="/report"
              className="flex items-center gap-3 px-3.5 py-2 rounded-[10px] text-xs font-medium text-[#99F6E4] hover:bg-white/5"
            >
              <PlusCircle className="w-4 h-4 text-[#2DD4BF]" />
              <span>Report a Leak Page</span>
            </Link>
            <Link
              to="/track-report"
              className="flex items-center gap-3 px-3.5 py-2 rounded-[10px] text-xs font-medium text-[#99F6E4] hover:bg-white/5"
            >
              <Search className="w-4 h-4 text-[#2DD4BF]" />
              <span>Track Report Page</span>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-3 px-3.5 py-2 rounded-[10px] text-xs font-medium text-slate-300 hover:bg-white/5"
            >
              <Droplets className="w-4 h-4 text-slate-400" />
              <span>Public Landing Page</span>
            </Link>
          </div>
        </nav>
      </div>

      {/* Bottom Operator Profile + Help/Logout */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-full bg-[#14B8A6] text-[#073B3A] font-extrabold text-xs flex items-center justify-center shrink-0">
            RS
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">Rohit Sharma</p>
            <p className="text-[11px] text-slate-300 truncate">Operations Manager</p>
          </div>
        </div>

        <div className="space-y-0.5 text-xs text-slate-300">
          <Link to="/simulation" className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/5 hover:text-white">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Demo Guide &amp; Help</span>
          </Link>
          <Link to="/" className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/5 hover:text-white">
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Exit to Public Site</span>
          </Link>
        </div>
      </div>
    </aside>
  )
}

export function TopSimulationBanner() {
  return (
    <div className="bg-[#073B3A] text-[#CCFBF1] text-xs py-1.5 px-4 flex items-center justify-between border-b border-white/10">
      <div className="flex items-center gap-2 mx-auto font-medium">
        <span className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse" />
        <span>Simulation Mode — Demo sensor data &amp; modeled water-loss estimates</span>
        <span className="hidden md:inline text-white/60">·</span>
        <span className="hidden md:inline text-[#99F6E4]">AI recommends · Operators decide · Field engineers confirm</span>
      </div>
      <Link
        to="/simulation"
        className="text-[11px] font-semibold text-[#2DD4BF] hover:underline shrink-0 hidden sm:inline"
      >
        Simulation Lab →
      </Link>
    </div>
  )
}

export function OperatorTopBar() {
  const navigate = useNavigate()
  return (
    <header className="h-14 bg-white border-b border-[#D8E8E4] px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Global Search */}
      <div className="relative w-72 max-w-full">
        <Search className="w-4 h-4 text-[#60736F] absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search incidents, zones (e.g. INC-001)..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              navigate(`/incidents?q=${encodeURIComponent(e.target.value.trim())}`)
            }
          }}
          className="w-full bg-[#F7FBFA] border border-[#D8E8E4] rounded-[10px] pl-9 pr-3 py-1.5 text-xs text-[#142522] placeholder-[#60736F] focus:outline-none focus:border-[#0F766E]"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        <Link
          to="/simulation"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0FDFA] border border-[#99F6E4] text-[#0F766E] text-xs font-semibold hover:bg-[#CCFBF1] transition-colors"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Run Scenario
        </Link>

        <button
          onClick={() => navigate('/incidents')}
          title="Active Incident Alerts"
          className="relative p-2 rounded-full hover:bg-[#F7FBFA] text-[#60736F] hover:text-[#142522]"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#DC2626] absolute top-1.5 right-1.5" />
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-[#D8E8E4]">
          <div className="w-8 h-8 rounded-full bg-[#073B3A] text-[#2DD4BF] font-bold text-xs flex items-center justify-center">
            RS
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-xs font-bold text-[#142522]">Rohit Sharma</p>
            <p className="text-[11px] text-[#60736F]">Operations Manager</p>
          </div>
        </div>
      </div>
    </header>
  )
}

export default OperatorSidebar
