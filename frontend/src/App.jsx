import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { OperatorSidebar, TopSimulationBanner, OperatorTopBar } from './components/Navbar.jsx'
import Landing from './pages/Landing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LiveMap from './pages/LiveMap.jsx'
import ReportLeak from './pages/ReportLeak.jsx'
import TrackReport from './pages/TrackReport.jsx'
import Incidents from './pages/Incidents.jsx'
import IncidentDetail from './pages/IncidentDetail.jsx'
import SensorMonitoring from './pages/SensorMonitoring.jsx'
import TechnicianTasks from './pages/TechnicianTasks.jsx'
import Analytics from './pages/Analytics.jsx'
import AdminSimulation from './pages/AdminSimulation.jsx'
import Settings from './pages/Settings.jsx'

function OperatorWorkspaceLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7FBFA] text-[#142522]">
      <TopSimulationBanner />
      <div className="flex flex-1 min-h-0">
        <OperatorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <OperatorTopBar />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public & Citizen Pages (Separate Report Leak and Report Tracking pages) */}
        <Route path="/" element={<Landing />} />
        <Route path="/report" element={<ReportLeak />} />
        <Route path="/track-report" element={<TrackReport />} />

        {/* Authenticated Laptop-First Operator Workspace */}
        <Route element={<OperatorWorkspaceLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/sensors" element={<SensorMonitoring />} />
          <Route path="/tasks" element={<TechnicianTasks />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/simulation" element={<AdminSimulation />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
