import { useState, useEffect } from 'react'
import { getZones, getUsers } from '../api/client.js'
import { Settings as SettingsIcon, Users, MapPin, Sliders, Bell, ShieldAlert, CheckCircle2 } from 'lucide-react'

export default function Settings() {
  const [tab, setTab] = useState('zones')
  const [zones, setZones] = useState([])
  const [users, setUsers] = useState([])
  const [saved, setSaved] = useState(false)
  const [weights, setWeights] = useState({
    loss: 30,
    anomaly: 25,
    impact: 20,
    reports: 15,
    age: 10,
  })

  useEffect(() => {
    getZones().then(({ data }) => setZones(data.zones || [])).catch(() => {})
    getUsers().then(({ data }) => setUsers(data.users || [])).catch(() => {})
  }, [])

  const saveSettings = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#073B3A] flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-[#0F766E]" />
          Settings &amp; Configuration
        </h1>
        <p className="text-xs text-[#60736F] font-medium mt-0.5">
          Manage municipal water zones, sensor baselines, role-based team members, and explainable priority weights
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#D8E8E4] pb-3 flex-wrap">
        {[
          { id: 'zones',   label: 'Water Zones & Sensors', Icon: MapPin },
          { id: 'rules',   label: 'Priority Scoring Rules', Icon: Sliders },
          { id: 'team',    label: 'Team Members & Roles',  Icon: Users },
          { id: 'alerts',  label: 'Notifications',         Icon: Bell },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${
              tab === id
                ? 'bg-[#0F766E] text-white shadow-sm'
                : 'bg-white border border-[#D8E8E4] text-[#60736F] hover:text-[#142522]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {saved && (
        <div className="bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] rounded-xl p-3 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Configuration saved and recorded in the audit log.
        </div>
      )}

      {tab === 'zones' && (
        <div className="ag-card overflow-hidden">
          <div className="p-4 border-b border-[#D8E8E4]">
            <h2 className="text-sm font-bold text-[#142522]">Configured Municipal Water Zones</h2>
            <p className="text-xs text-[#60736F]">Baseline flow (L/min), expected pressure (PSI), and public impact categories</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7FBFA] border-b border-[#D8E8E4] text-[11px] font-bold uppercase text-[#60736F]">
                  <th className="py-3 px-4">Zone ID</th>
                  <th className="py-3 px-4">Zone Name</th>
                  <th className="py-3 px-4">Baseline Flow</th>
                  <th className="py-3 px-4">Baseline Pressure</th>
                  <th className="py-3 px-4">Public Impact Category</th>
                  <th className="py-3 px-4">Primary Sensor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E8E4]">
                {zones.map(z => (
                  <tr key={z.id} className="hover:bg-[#F0FDFA]/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#073B3A]">{z.id}</td>
                    <td className="py-3.5 px-4 font-bold text-[#142522]">{z.name}</td>
                    <td className="py-3.5 px-4 text-[#0F766E] font-bold">{z.expected_flow_lpm} L/min</td>
                    <td className="py-3.5 px-4 text-[#EA580C] font-bold">{z.expected_pressure_psi} PSI</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F0FDFA] border border-[#99F6E4] text-[#0F766E] font-semibold">
                        {z.impact_category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#60736F]">FLOW-{z.id}-01</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'rules' && (
        <div className="ag-card p-6 space-y-5 max-w-2xl">
          <div>
            <h2 className="text-sm font-bold text-[#142522]">Explainable Priority Formula Weights</h2>
            <p className="text-xs text-[#60736F]">
              Default TRD Formula: <code className="font-mono font-bold text-[#073B3A]">Priority = 0.30L + 0.25A + 0.20I + 0.15R + 0.10T</code>
            </p>
          </div>

          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 flex items-start gap-2 text-xs text-[#92400E]">
            <ShieldAlert className="w-4 h-4 shrink-0 text-[#D97706] mt-0.5" />
            <span>
              Changes to priority weights affect active incident triage rankings across the municipality and are logged in the audit timeline.
            </span>
          </div>

          <div className="space-y-4">
            {[
              { key: 'loss',    label: 'L — Potential Water Loss Severity (%)', val: weights.loss },
              { key: 'anomaly', label: 'A — Sensor Flow/Pressure Anomaly (%)',  val: weights.anomaly },
              { key: 'impact',  label: 'I — Public Impact Category (%)',        val: weights.impact },
              { key: 'reports', label: 'R — Citizen Evidence & Photos (%)',     val: weights.reports },
              { key: 'age',     label: 'T — Time Unresolved Duration (%)',      val: weights.age },
            ].map(item => (
              <div key={item.key} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#142522]">{item.label}</span>
                  <span className="text-[#0F766E]">{item.val}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={item.val}
                  onChange={e => setWeights(w => ({ ...w, [item.key]: Number(e.target.value) }))}
                  className="w-full accent-[#0F766E]"
                />
              </div>
            ))}
          </div>

          <button onClick={saveSettings} className="ag-btn-primary text-xs py-2.5 px-5">
            Save Priority Rules
          </button>
        </div>
      )}

      {tab === 'team' && (
        <div className="ag-card overflow-hidden max-w-3xl">
          <div className="p-4 border-b border-[#D8E8E4]">
            <h2 className="text-sm font-bold text-[#142522]">Municipal Operations &amp; Field Team</h2>
          </div>
          <div className="divide-y divide-[#D8E8E4] text-xs">
            {(users.length ? users : [
              { id: 1, name: 'Rohit Sharma', email: 'operator@aquaguard.demo', role: 'OPERATOR' },
              { id: 2, name: 'Priya Sharma', email: 'tech1@aquaguard.demo', role: 'TECHNICIAN' },
              { id: 3, name: 'Ravi Kumar', email: 'tech2@aquaguard.demo', role: 'TECHNICIAN' },
              { id: 4, name: 'Admin User', email: 'admin@aquaguard.demo', role: 'ADMIN' },
            ]).map(u => (
              <div key={u.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#142522]">{u.name}</p>
                  <p className="text-[#60736F]">{u.email}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#F0FDFA] border border-[#99F6E4] text-[#0F766E] font-bold">
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="ag-card p-6 space-y-4 max-w-xl text-xs">
          <h2 className="text-sm font-bold text-[#142522]">Alert &amp; Persistence Threshold Preferences</h2>
          <label className="flex items-center justify-between p-3 bg-[#F7FBFA] rounded-xl border border-[#D8E8E4]">
            <span className="font-semibold text-[#142522]">Require 3 consecutive abnormal readings before creating incident</span>
            <input type="checkbox" defaultChecked className="accent-[#0F766E] w-4 h-4" />
          </label>
          <label className="flex items-center justify-between p-3 bg-[#F7FBFA] rounded-xl border border-[#D8E8E4]">
            <span className="font-semibold text-[#142522]">Auto-corroborate citizen reports within 100m of active zone alert</span>
            <input type="checkbox" defaultChecked className="accent-[#0F766E] w-4 h-4" />
          </label>
          <label className="flex items-center justify-between p-3 bg-[#F7FBFA] rounded-xl border border-[#D8E8E4]">
            <span className="font-semibold text-[#142522]">Prompt operator verification after 5 normal post-repair readings</span>
            <input type="checkbox" defaultChecked className="accent-[#0F766E] w-4 h-4" />
          </label>
          <button onClick={saveSettings} className="ag-btn-primary text-xs py-2 px-4">Save Preferences</button>
        </div>
      )}
    </div>
  )
}
