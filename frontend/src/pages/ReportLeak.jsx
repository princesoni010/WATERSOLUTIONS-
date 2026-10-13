import { PublicNavbar } from '../components/Navbar.jsx'
import CitizenReportForm from '../components/CitizenReportForm.jsx'

export default function ReportLeak() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7FBFA]">
      <PublicNavbar />

      <div className="max-w-[720px] mx-auto px-6 py-10 w-full space-y-6">
        {/* Centered Header */}
        <div className="text-center space-y-2">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#F0FDFA] border border-[#99F6E4] px-3 py-1 rounded-full">
            Citizen Reporting Portal
          </span>
          <h1 className="text-3xl font-extrabold text-[#073B3A]">Report a Water Leak</h1>
          <p className="text-sm text-[#60736F] max-w-lg mx-auto">
            Select the leak type, share the location, and attach a photo. Our municipal operations team will review and prioritize it.
          </p>
        </div>

        {/* Centered Form Card */}
        <div className="ag-card p-6 sm:p-8">
          <CitizenReportForm />
        </div>
      </div>
    </div>
  )
}
