import { Link } from 'react-router-dom'
import { PublicNavbar } from '../components/Navbar.jsx'
import {
  Droplets, ShieldCheck, Activity, MapPin, Wrench,
  Zap, Eye, BarChart3, CheckCircle2, ArrowRight, Building2
} from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7FBFA] text-[#142522]">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#F7FBFA] via-[#E6F4F1] to-[#CCFBF1]/50 border-b border-[#D8E8E4]">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#99F6E4] text-[#0F766E] text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
              Smart Municipal Water-Operations Decision Support
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#073B3A] leading-[1.12] tracking-tight">
              Every Drop Counts.<br />
              <span className="text-[#0F766E]">Detect Smart.</span><br />
              Prioritize Fast.
            </h1>

            <p className="text-base text-[#60736F] max-w-xl leading-relaxed">
              AquaGuard AI connects citizen leak reports, simulated IoT flow &amp; pressure anomalies, explainable AI priority scoring, and field repair verification to help municipal teams reduce water loss.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <Link
                to="/report"
                className="px-6 py-3 rounded-[10px] bg-[#0F766E] hover:bg-[#073B3A] text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
              >
                Report a Leak
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/dashboard"
                className="px-6 py-3 rounded-[10px] bg-white hover:bg-[#F0FDFA] text-[#073B3A] border border-[#D8E8E4] font-bold text-sm shadow-sm transition-all"
              >
                View Operations Dashboard Demo
              </Link>
            </div>

            <div className="flex items-center gap-6 pt-2 text-xs text-[#60736F] font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                Explainable Priority Formula
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                Human-in-the-Loop Verification
              </span>
            </div>
          </div>

          {/* Right Smart-City Water Network Graphic Card */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl bg-gradient-to-br from-[#073B3A] via-[#0D5E57] to-[#0F766E] p-6 text-white shadow-xl border border-white/15 overflow-hidden">
              {/* Decorative network lines */}
              <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" viewBox="0 0 500 320">
                <path d="M30 250 Q 150 180 260 210 T 470 110" fill="none" stroke="#5EEAD4" strokeWidth="2.5" strokeDasharray="6 4" />
                <path d="M50 90 Q 200 150 320 120 T 460 240" fill="none" stroke="#99F6E4" strokeWidth="1.5" />
                <circle cx="140" cy="195" r="7" fill="#2DD4BF" />
                <circle cx="260" cy="210" r="9" fill="#F97316" />
                <circle cx="320" cy="120" r="7" fill="#2DD4BF" />
                <circle cx="410" cy="150" r="10" fill="#EF4444" />
              </svg>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/15 pb-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-[#2DD4BF]" />
                    <span className="font-bold text-sm">Live Municipal Telemetry &amp; GIS Fusion</span>
                  </div>
                  <span className="text-[11px] bg-white/10 px-2.5 py-0.5 rounded-full text-[#99F6E4] font-semibold">
                    Simulation Mode
                  </span>
                </div>

                {/* Mini Live Cards inside Hero Illustration */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 backdrop-blur rounded-xl p-3.5 border border-white/15">
                    <span className="text-[11px] text-[#99F6E4] block">Zone B — Pandri Main</span>
                    <p className="text-xl font-extrabold mt-0.5">130 L/min <span className="text-xs font-semibold text-[#FDBA74]">(+30%)</span></p>
                    <p className="text-[11px] text-white/75 mt-1">Pressure: 46 PSI (-22% drop)</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-xl p-3.5 border border-white/15">
                    <span className="text-[11px] text-[#99F6E4] block">AI Triage Priority</span>
                    <p className="text-xl font-extrabold mt-0.5 text-[#FDBA74]">74 / 100 · HIGH</p>
                    <p className="text-[11px] text-white/75 mt-1">2 Citizen Photos Corroborated</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3.5 text-[#142522] shadow-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-[#EA580C] font-bold text-xs">
                      INC
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-[#073B3A]">INC-2026-1052 · Suspected Pipeline Leak</p>
                      <p className="text-[11px] text-[#60736F]">Suspected leak — field verification required · Est. 43.2 kL/24h at risk</p>
                    </div>
                  </div>
                  <Link
                    to="/dashboard"
                    className="px-3 py-1.5 rounded-lg bg-[#0F766E] text-white text-xs font-bold shrink-0 hover:bg-[#073B3A]"
                  >
                    Open →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Step Strip inside Hero bottom */}
        <div id="how-it-works" className="max-w-6xl mx-auto px-6 pb-12">
          <div className="ag-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#D8E8E4]">
            {[
              {
                num: '1',
                title: 'Report',
                desc: 'Citizens report visible leaks with GPS pin & photo in under 60 seconds.',
                Icon: MapPin,
              },
              {
                num: '2',
                title: 'Detect & Prioritize',
                desc: 'AI fuses sustained flow/pressure anomalies with citizen reports to rank urgency.',
                Icon: Activity,
              },
              {
                num: '3',
                title: 'Repair & Verify',
                desc: 'Field engineers confirm on site, upload repair proof, and operators verify recovery.',
                Icon: Wrench,
              },
            ].map((step, i) => (
              <div key={step.num} className={`flex items-start gap-4 ${i > 0 ? 'md:pl-6 pt-4 md:pt-0' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] text-[#0F766E] flex items-center justify-center font-extrabold text-sm shrink-0">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#073B3A] flex items-center gap-1.5">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#60736F] mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why AquaGuard AI? 4 Cards */}
      <section id="why-aquaguard" className="py-16 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#073B3A]">Why AquaGuard AI?</h2>
          <p className="text-sm text-[#60736F] mt-2">
            An alert alone does not save water — explainable prioritization, evidence fusion, and verified field closure do.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              title: 'Faster Response',
              desc: 'Reduce response time by fusing citizen complaints and zone sensor anomalies into one queue.',
              Icon: Zap,
            },
            {
              title: 'Explainable Priority',
              desc: 'Transparent 0–100 priority breakdown separating evidence confidence from repair urgency.',
              Icon: Eye,
            },
            {
              title: 'Water Loss Insights',
              desc: 'Model excess flow L/min and 24-hour litres at risk without double-counting linked reports.',
              Icon: BarChart3,
            },
            {
              title: 'Field Accountability',
              desc: 'Track every action from inspection assignment and before/after proof to post-repair recovery.',
              Icon: ShieldCheck,
            },
          ].map(({ title, desc, Icon }) => (
            <div key={title} className="ag-card p-6 text-center hover:border-[#0F766E] transition-all">
              <div className="w-11 h-11 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] text-[#0F766E] flex items-center justify-center mx-auto mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-[#073B3A]">{title}</h3>
              <p className="text-xs text-[#60736F] mt-2 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Deep Teal Trusted by Smart Cities Strip matching mockup */}
      <section className="bg-[#073B3A] text-white py-10">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-6">
          <p className="text-xs uppercase tracking-widest text-[#99F6E4] font-bold">
            Designed for Municipal Smart Water Operations
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { city: 'Bengaluru', state: 'Karnataka' },
              { city: 'Indore',    state: 'Madhya Pradesh' },
              { city: 'Surat',     state: 'Gujarat' },
              { city: 'Raipur',    state: 'Chhattisgarh' },
            ].map((c) => (
              <div key={c.city} className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-xl py-3 px-4">
                <Building2 className="w-5 h-5 text-[#2DD4BF] shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-bold text-white leading-tight">{c.city}</p>
                  <p className="text-[11px] text-[#99F6E4]/80">{c.state}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#D8E8E4] py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#60736F]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#073B3A] text-[#2DD4BF] flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-[#073B3A]">AquaGuard AI</span>
            <span>— Building water-secure cities with data, AI, and people.</span>
          </div>
          <div className="flex items-center gap-5 font-medium">
            <Link to="/report" className="hover:text-[#073B3A]">Report a Leak</Link>
            <Link to="/dashboard" className="hover:text-[#073B3A]">Operations Console</Link>
            <Link to="/map" className="hover:text-[#073B3A]">Live GIS Map</Link>
            <Link to="/simulation" className="hover:text-[#073B3A]">Simulation Lab</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
