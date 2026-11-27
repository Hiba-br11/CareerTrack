import { Route, Routes } from 'react-router-dom'
import ApplicationsListPage from '../pages/ApplicationsListPage.jsx'
import ApplicationFormPage from '../pages/ApplicationFormPage.jsx'
import ApplicationDetailPage from '../pages/ApplicationDetailPage.jsx'

// Mounted on /applications/* in App.jsx
export default function ApplicationRoutes() {
  return (
    <Routes>
      <Route index element={<ApplicationsListPage />} />
      <Route path="new" element={<ApplicationFormPage />} />
      <Route path=":id" element={<ApplicationDetailPage />} />
      <Route path=":id/edit" element={<ApplicationFormPage />} />
    </Routes>
  )
}
