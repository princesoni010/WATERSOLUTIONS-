import { useState, useRef, useEffect } from 'react'
import {
  MapPin, Upload, Camera, Send, CheckCircle2,
  AlertCircle, Loader2, ShieldAlert, Copy, Check, X
} from 'lucide-react'
import { submitReport } from '../api/client.js'

const ISSUE_TYPES = [
  { value: 'PIPELINE_LEAK',    label: 'Pipeline Leak',          desc: 'Roadside or main line burst/seepage' },
  { value: 'PUBLIC_TAP_LEAK',  label: 'Public Tap Leakage',     desc: 'Broken standpost or running public tap' },
  { value: 'TANK_OVERFLOW',    label: 'Water Tank Overflow',    desc: 'Overhead or ground reservoir overflow' },
  { value: 'WATER_POOLING',    label: 'Roadside Water Pooling', desc: 'Unexplained surface water accumulation' },
  { value: 'VALVE_JOINT_LEAK', label: 'Valve / Joint Leak',     desc: 'Chamber or pipe collar leakage' },
  { value: 'OTHER',            label: 'Other Issue',            desc: 'Other municipal water leakage' },
]

const PRESET_LOCATIONS = [
  { label: 'Pandri Bus Stand Gate 2 (Zone B)', lat: '21.2569', lng: '81.6414' },
  { label: 'Telibandha Hospital Main Road (Zone D)', lat: '21.2412', lng: '81.6652' },
  { label: 'Shankar Nagar Sector 2 Park (Zone C)', lat: '21.2487', lng: '81.6582' },
  { label: 'Civil Lines Ward 4 Secretariat (Zone A)', lat: '21.2516', lng: '81.6298' },
]

export default function CitizenReportForm({ onSubmitted, externalPin, onPinChange }) {
  const [form, setForm] = useState({
    issue_type: 'PIPELINE_LEAK',
    description: '',
    latitude: externalPin?.lat || '21.2569',
    longitude: externalPin?.lng || '81.6414',
    contact: '',
    consent: true,
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [locLoading, setLocLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  const fileRef = useRef(null)
  const cameraInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // Sync when user clicks on an external map
  if (externalPin?.lat && externalPin?.lng && (form.latitude !== externalPin.lat || form.longitude !== externalPin.lng)) {
    setForm(f => ({ ...f, latitude: externalPin.lat, longitude: externalPin.lng }))
  }

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraOpen(false)
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const openCamera = async () => {
    setCameraError(null)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraInputRef.current?.click()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 50)
    } catch {
      setCameraError('Camera access unavailable or blocked. Opening file camera picker instead.')
      cameraInputRef.current?.click()
    }
  }

  const capturePhotoFromVideo = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob) return
      const capturedFile = new File([blob], `leak_capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
      setImageFile(capturedFile)
      setImagePreview(URL.createObjectURL(capturedFile))
      stopCameraStream()
    }, 'image/jpeg', 0.92)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => {
      const next = { ...f, [name]: type === 'checkbox' ? checked : value }
      if ((name === 'latitude' || name === 'longitude') && onPinChange) {
        onPinChange({ lat: next.latitude, lng: next.longitude })
      }
      return next
    })
  }

  const handleImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const useCurrentLocation = () => {
    setLocLoading(true)
    if (!navigator.geolocation) {
      setForm(f => ({ ...f, latitude: '21.2569', longitude: '81.6414' }))
      setLocLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6)
        const lng = pos.coords.longitude.toFixed(6)
        setForm(f => ({ ...f, latitude: lat, longitude: lng }))
        onPinChange?.({ lat, lng })
        setLocLoading(false)
      },
      () => {
        setForm(f => ({ ...f, latitude: '21.2569', longitude: '81.6414' }))
        setLocLoading(false)
      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!form.issue_type) return setError('Please select a leak issue type.')
    if (!form.latitude || !form.longitude) return setError('Enter a valid location or choose a preset pin.')

    stopCameraStream()
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('issue_type', form.issue_type)
      fd.append('description', form.description)
      fd.append('latitude', form.latitude)
      fd.append('longitude', form.longitude)
      if (imageFile) fd.append('image', imageFile)

      const { data } = await submitReport(fd)
      setResult(data)
      onSubmitted?.(data)
    } catch (err) {
      setError(err.response?.data?.message || 'We could not submit the report. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyRef = () => {
    if (!result?.tracking_reference) return
    navigator.clipboard?.writeText(result.tracking_reference)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (result) {
    return (
      <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-[14px] p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#16A34A]/15 text-[#16A34A] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-[#073B3A]">
            Thank you — your report has been received
          </h3>
          <p className="text-xs text-[#60736F] mt-1">
            Our municipal water operations team will review the evidence.
          </p>
        </div>

        {/* Tracking Reference Card */}
        <div className="bg-white border border-[#D8E8E4] rounded-xl p-4 max-w-sm mx-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#60736F]">
            Tracking Reference
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="font-mono text-2xl font-extrabold text-[#073B3A]">
              {result.tracking_reference}
            </span>
            <button
              type="button"
              onClick={copyRef}
              className="p-1.5 rounded-lg border border-[#D8E8E4] hover:bg-[#F7FBFA] text-[#0F766E]"
              title="Copy Tracking ID"
            >
              {copied ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 3-Stage Status Tracker */}
        <div className="flex items-center justify-center gap-2 text-xs font-semibold pt-2">
          <span className="px-3 py-1 rounded-full bg-[#16A34A] text-white">1. Submitted</span>
          <span className="text-[#60736F]">→</span>
          <span className={`px-3 py-1 rounded-full ${result.linked_incident_code ? 'bg-[#0F766E] text-white' : 'bg-white border border-[#D8E8E4] text-[#60736F]'}`}>
            2. {result.linked_incident_code ? `Linked (${result.linked_incident_code})` : 'Under Review'}
          </span>
          <span className="text-[#60736F]">→</span>
          <span className="px-3 py-1 rounded-full bg-white border border-[#D8E8E4] text-[#60736F]">
            3. Action Assigned
          </span>
        </div>

        {result.linked_incident_code && (
          <p className="text-xs text-[#0F766E] font-semibold bg-white/80 py-2 px-3 rounded-lg border border-[#99F6E4] inline-block">
            ✓ Automatically linked with operational case <strong>{result.linked_incident_code}</strong>!
          </p>
        )}

        <p className="text-[11px] text-[#60736F]">
          Note: Your report may be linked with other citizen reports or sensor alerts after operator review.
        </p>

        <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
          <a
            href={`/track-report?ref=${encodeURIComponent(result.tracking_reference)}`}
            className="ag-btn-primary"
          >
            Track Report Status →
          </a>
          {result.linked_incident_id && (
            <a
              href={`/incidents/${result.linked_incident_id}`}
              className="ag-btn-secondary border-[#0F766E] text-[#0F766E]"
            >
              View in Admin Console ({result.linked_incident_code}) →
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setResult(null)
              setImageFile(null)
              setImagePreview(null)
            }}
            className="ag-btn-secondary"
          >
            Report Another Leak
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 text-[#DC2626] text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 1. Select Leak Type Tiles */}
      <div>
        <label className="block text-xs font-bold text-[#142522] uppercase tracking-wider mb-2">
          1. Select Leak Type *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ISSUE_TYPES.map((t) => {
            const active = form.issue_type === t.value
            return (
              <button
                type="button"
                key={t.value}
                onClick={() => setForm(f => ({ ...f, issue_type: t.value }))}
                className={`text-left p-3 rounded-xl border transition-all ${
                  active
                    ? 'bg-[#F0FDFA] border-[#0F766E] ring-2 ring-[#14B8A6]/25'
                    : 'bg-[#F7FBFA] border-[#D8E8E4] hover:border-[#14B8A6]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#142522]">{t.label}</span>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    active ? 'border-[#0F766E] bg-[#0F766E]' : 'border-[#60736F]'
                  }`}>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-[11px] text-[#60736F] mt-0.5">{t.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Where is the leak? */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold text-[#142522] uppercase tracking-wider">
            2. Where is the leak? *
          </label>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locLoading}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] hover:underline"
          >
            {locLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            Use My Current Location
          </button>
        </div>

        {/* Quick Demo Location Presets */}
        <div className="mb-2.5">
          <select
            onChange={(e) => {
              const idx = e.target.value
              if (idx !== '') {
                const p = PRESET_LOCATIONS[Number(idx)]
                setForm(f => ({ ...f, latitude: p.lat, longitude: p.lng }))
                onPinChange?.({ lat: p.lat, lng: p.lng })
              }
            }}
            className="ag-input w-full text-xs"
            defaultValue="0"
          >
            {PRESET_LOCATIONS.map((p, i) => (
              <option key={p.label} value={i}>📍 Demo Pin: {p.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <span className="text-[10px] font-semibold text-[#60736F] block mb-1">Latitude</span>
            <input
              type="number"
              step="any"
              name="latitude"
              value={form.latitude}
              onChange={handleChange}
              placeholder="21.2569"
              required
              className="ag-input w-full"
            />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-[#60736F] block mb-1">Longitude</span>
            <input
              type="number"
              step="any"
              name="longitude"
              value={form.longitude}
              onChange={handleChange}
              placeholder="81.6414"
              required
              className="ag-input w-full"
            />
          </div>
        </div>
      </div>

      {/* 3. Add Details & Photo Evidence (Both Upload & Click Photo) */}
      <div>
        <label className="block text-xs font-bold text-[#142522] uppercase tracking-wider mb-1.5">
          3. Add Details &amp; Photo Evidence
        </label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          placeholder="e.g. Water visible on road near Pandri Bus Stand Gate 2, flowing steadily toward storm drain..."
          className="ag-input w-full resize-none mb-3"
        />

        {/* Hidden file inputs for Upload and fallback Camera Capture */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImage}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImage}
          className="hidden"
        />

        {/* Side-by-side Upload Photo & Click Photo (Camera) Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-[#99F6E4] hover:border-[#0F766E] bg-[#F0FDFA]/60 text-[#0F766E] rounded-xl text-xs font-bold transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Photo from Device
          </button>

          <button
            type="button"
            onClick={cameraOpen ? stopCameraStream : openCamera}
            className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-[#0F766E] bg-[#0F766E]/10 hover:bg-[#0F766E] text-[#073B3A] hover:text-white rounded-xl text-xs font-bold transition-colors"
          >
            <Camera className="w-4 h-4" />
            {cameraOpen ? 'Close Camera' : 'Click Photo (Open Camera)'}
          </button>
        </div>

        {cameraError && (
          <p className="text-[11px] text-[#B45309] mt-1.5">{cameraError}</p>
        )}

        {/* Live Camera Viewfinder Modal / Box */}
        {cameraOpen && (
          <div className="mt-3 bg-[#073B3A] rounded-xl p-3 space-y-3 border border-[#14B8A6]">
            <div className="flex items-center justify-between text-white text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
                Live Camera Preview
              </span>
              <button
                type="button"
                onClick={stopCameraStream}
                className="text-slate-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-64 mx-auto flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={capturePhotoFromVideo}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#14B8A6] hover:bg-[#0F766E] text-[#073B3A] hover:text-white font-extrabold text-xs shadow-md transition-all"
              >
                <Camera className="w-4 h-4" />
                Capture Photo Now
              </button>
              <button
                type="button"
                onClick={stopCameraStream}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Attached / Captured Image Preview */}
        {imagePreview && (
          <div className="mt-3 flex items-center justify-between gap-3 bg-[#F7FBFA] p-3 rounded-xl border border-[#D8E8E4]">
            <div className="flex items-center gap-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-16 w-24 rounded-lg object-cover border border-[#D8E8E4]"
              />
              <div className="text-xs text-[#60736F]">
                <p className="font-bold text-[#142522]">{imageFile?.name || 'Photo Attached'}</p>
                <p>Ready for AI pre-screening — field verification required.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setImageFile(null); setImagePreview(null) }}
              className="text-xs text-[#DC2626] font-bold hover:underline px-2"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Optional Private Contact + Safety Note */}
      <div className="bg-[#F7FBFA] border border-[#D8E8E4] rounded-xl p-3.5 space-y-2.5">
        <div>
          <label className="block text-xs font-semibold text-[#142522] mb-1">
            Optional Phone / Email <span className="text-[#0F766E] font-normal">(Private — never shown on public map)</span>
          </label>
          <input
            type="text"
            name="contact"
            value={form.contact}
            onChange={handleChange}
            placeholder="Optional contact for SMS status updates"
            className="ag-input w-full text-xs"
          />
        </div>

        <div className="flex items-start gap-2 text-[11px] text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
          <span>
            <strong>Safety Notice:</strong> Do not enter unsafe trenches or stand near pressurized pipe bursts. Capture photos from a safe distance.
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="ag-btn-primary w-full py-3 text-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {loading ? 'Submitting Report…' : 'Submit Report'}
      </button>
    </form>
  )
}
