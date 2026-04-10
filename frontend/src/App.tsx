import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { UnitsPage } from './pages/UnitsPage'
import { UnitDetailPage } from './pages/UnitDetailPage'
import { EquipmentListPage } from './pages/EquipmentListPage'
import { EquipmentProfilePage } from './pages/EquipmentProfilePage'
import { MaintenancePage } from './pages/MaintenancePage'
import { MaintenanceCalendarPage } from './pages/MaintenanceCalendarPage'
import { UsersPage } from './pages/UsersPage'
import { PublicProfilePage } from './pages/PublicProfilePage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/p/:id" element={<PublicProfilePage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/units" element={<UnitsPage />} />
        <Route path="/units/:id" element={<UnitDetailPage />} />
        <Route path="/equipment" element={<EquipmentListPage />} />
        <Route path="/equipment/:id" element={<EquipmentProfilePage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/maintenance/calendar" element={<MaintenanceCalendarPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
