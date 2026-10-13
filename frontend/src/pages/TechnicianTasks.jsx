import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getTasks, updateTask, uploadProof, seedDemoData } from '../api/client.js'
import TaskBoard from '../components/TaskBoard.jsx'
import { PriorityBadge, StatusBadge } from '../components/KPIcards.jsx'
import {
  Wrench, Upload, Loader2, CheckCircle2, AlertCircle,
  LayoutGrid, List, Camera, UserCheck, ClipboardCheck
} from 'lucide-react'

export default function TechnicianTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('kanban')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [fieldStatus, setFieldStatus] = useState('IN_PROGRESS')
  const [attachType, setAttachType] = useState('AFTER')
  const [findings, setFindings] = useState('Leak confirmed near pipeline collar joint; steady water flow visible.')
  const [repairAction, setRepairAction] = useState('Isolated gate valve and replaced 150mm gasket seal.')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const fileRef = useRef()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getTasks({ limit: 100 })
      if ((data.tasks || []).length === 0) {
        await seedDemoData()
        const r2 = await getTasks({ limit: 100 })
        const list = r2.data.tasks || []
        setTasks(list)
        if (list[0]) setSelectedTaskId(String(list[0].id))
      } else {
        const list = data.tasks || []
        setTasks(list)
        if (!selectedTaskId && list[0]) {
          setSelectedTaskId(String(list[0].id))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleFieldSubmit = async (e) => {
    e.preventDefault()
    const targetId = selectedTaskId ? parseInt(selectedTaskId, 10) : tasks[0]?.id
    if (!targetId) return
    setSubmitting(true)
    setMessage(null)
    try {
      await updateTask(targetId, {
        status: fieldStatus,
        findings,
        repair_action: repairAction,
        field_confirmed: true,
      })
      if (file) {
        const fd = new FormData()
        fd.append('image', file)
        fd.append('attachment_type', attachType)
        await uploadProof(targetId, fd)
      }
      setMessage({
        type: 'success',
        text: `Task TSK-${String(targetId).padStart(3, '0')} updated (${fieldStatus.replace('_', ' ')}).`,
      })
      setFile(null)
      await load()
    } catch {
      setMessage({ type: 'error', text: 'Could not save task update. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const assignedCount   = tasks.filter(t => t.status === 'ASSIGNED').length
  const acceptedCount   = tasks.filter(t => t.status === 'ACCEPTED').length
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const completedCount  = tasks.filter(t => t.status === 'COMPLETED').length

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header + View Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#073B3A]">Repair Tasks &amp; Field Operations</h1>
          <p className="text-xs text-[#60736F] font-medium">
            Desktop operations board for managing inspection assignments, engineer findings, and repair verification proof
          </p>
        </div>

        <div className="inline-flex rounded-[10px] border border-[#D8E8E4] bg-white p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              viewMode === 'kanban' ? 'bg-[#0F766E] text-white' : 'text-[#60736F] hover:text-[#142522]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Kanban Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              viewMode === 'list' ? 'bg-[#0F766E] text-white' : 'text-[#60736F] hover:text-[#142522]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List View
          </button>
        </div>
      </div>

      {/* Top Task Summary Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assigned Tasks',    val: assignedCount,   color: 'text-[#6D28D9]' },
          { label: 'Accepted by Crew',  val: acceptedCount,   color: 'text-[#0284C7]' },
          { label: 'Repair In Progress',val: inProgressCount, color: 'text-[#0F766E]' },
          { label: 'Completed Repairs', val: completedCount,  color: 'text-[#16A34A]' },
        ].map(c => (
          <div key={c.label} className="ag-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#60736F]">{c.label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${c.color}`}>{c.val}</p>
            </div>
            <Wrench className={`w-5 h-5 ${c.color} opacity-75`} />
          </div>
        ))}
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-xl p-3.5 text-xs font-semibold border ${
          message.type === 'success'
            ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#15803D]'
            : 'bg-[#FEE2E2] border-[#FECACA] text-[#DC2626]'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Main Kanban or List Board */}
      <TaskBoard tasks={tasks} loading={loading} onUpdate={load} viewMode={viewMode} />

      {/* Laptop 2-Column Bottom Section: Field Findings & Repair Proof Form + Engineer Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Desktop Field Findings & Proof Upload Panel */}
        <div className="lg:col-span-8 ag-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#D8E8E4] pb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#0F766E]" />
              <div>
                <h2 className="text-sm font-bold text-[#073B3A]">Record Engineer Findings &amp; Repair Proof</h2>
                <p className="text-xs text-[#60736F]">
                  Update task status, log physical inspection findings, and attach before/after repair photos
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleFieldSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#142522] mb-1">Select Task *</label>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="ag-input w-full text-xs font-semibold"
              >
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>
                    TSK-{String(t.id).padStart(3, '0')} · INC-2026-{String((t.incident_id || 1) + 1050)} ({t.zone_name || 'Zone B'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#142522] mb-1">Task Lifecycle Status *</label>
              <select
                value={fieldStatus}
                onChange={e => setFieldStatus(e.target.value)}
                className="ag-input w-full text-xs font-semibold"
              >
                <option value="ACCEPTED">Accepted by Engineer</option>
                <option value="IN_PROGRESS">In Progress (Field Confirmed)</option>
                <option value="COMPLETED">Completed (Ready for Verification)</option>
                <option value="BLOCKED">Blocked (Requires Support)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-[#142522] mb-1">On-Site Inspection Findings *</label>
              <textarea
                rows={2}
                value={findings}
                onChange={e => setFindings(e.target.value)}
                className="ag-input w-full text-xs resize-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[#142522] mb-1">Repair Action Taken</label>
              <input
                type="text"
                value={repairAction}
                onChange={e => setRepairAction(e.target.value)}
                className="ag-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-[#142522] mb-1">Proof Attachment Type &amp; Photo</label>
              <div className="flex items-center gap-2">
                <select
                  value={attachType}
                  onChange={e => setAttachType(e.target.value)}
                  className="ag-input text-xs font-semibold w-36"
                >
                  <option value="BEFORE">Before Repair</option>
                  <option value="AFTER">After Repair</option>
                </select>
                <input ref={fileRef} type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current.click()}
                  className="ag-btn-secondary flex-1 py-2 text-xs"
                >
                  <Camera className="w-3.5 h-3.5 text-[#0F766E]" />
                  {file ? file.name : 'Choose Photo'}
                </button>
              </div>
            </div>

            <div className="md:col-span-2 pt-2 flex items-center justify-between">
              <span className="text-[11px] text-[#60736F]">
                Note: Do not mark Field Confirmed unless the leak was physically verified on site.
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="ag-btn-primary text-xs py-2.5 px-6"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Save Task Update
              </button>
            </div>
          </form>
        </div>

        {/* Right 4 Columns: Field Engineer Workload */}
        <div className="lg:col-span-4 ag-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#D8E8E4] pb-3">
            <UserCheck className="w-5 h-5 text-[#0F766E]" />
            <div>
              <h2 className="text-sm font-bold text-[#073B3A]">Technician Workload</h2>
              <p className="text-xs text-[#60736F]">Active field assignments per engineer</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {[
              { name: 'Priya Sharma', role: 'Senior Field Engineer', zone: 'Zone D & Zone A', active: 2, status: 'On Site' },
              { name: 'Ravi Kumar',   role: 'Pipeline Specialist',   zone: 'Zone B — Pandri', active: 1, status: 'En Route' },
              { name: 'Vikram Singh', role: 'Valve & Metering Tech', zone: 'Zone C & Zone E', active: 0, status: 'Available' },
            ].map((eng) => (
              <div key={eng.name} className="bg-[#F7FBFA] border border-[#D8E8E4] rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#142522]">{eng.name}</p>
                  <p className="text-[11px] text-[#60736F]">{eng.role} · {eng.zone}</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F0FDFA] border border-[#99F6E4] text-[#0F766E] font-bold text-[11px]">
                    {eng.active} active
                  </span>
                  <p className="text-[10px] text-[#60736F] mt-1">{eng.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
