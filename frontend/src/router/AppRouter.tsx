import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { HodDashboard } from '../pages/hod/HodDashboard';
import { CoordinatorDashboard } from '../pages/coordinator/CoordinatorDashboard';
import { CoursesPage } from '../pages/department/CoursesPage';
import { GroupsPage } from '../pages/department/GroupsPage';
import { LecturersPage } from '../pages/department/LecturersPage';
import { IssuesPage } from '../pages/department/IssuesPage';
import { TimetablePage } from '../pages/timetable/TimetablePage';
import { ResourcesPage } from '../pages/coordinator/ResourcesPage';
import { GlobalIssuesPage } from '../pages/coordinator/GlobalIssuesPage';
import { GlobalTimetablePage } from '../pages/coordinator/GlobalTimetablePage';
import { useAuthStore } from '../stores/authStore';

const PrivateRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* HOD Routes */}
        <Route
          path="/hod/*"
          element={
            <PrivateRoute roles={['hod', 'delegate']}>
              <Routes>
                <Route path="dashboard" element={<HodDashboard />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="groups" element={<GroupsPage />} />
                <Route path="lecturers" element={<LecturersPage />} />
                <Route path="issues" element={<IssuesPage />} />
                <Route path="timetable" element={<TimetablePage />} />
                <Route path="*" element={<Navigate to="dashboard" />} />
              </Routes>
            </PrivateRoute>
          }
        />
        
        {/* Coordinator Routes */}
        <Route
          path="/coordinator/*"
          element={
            <PrivateRoute roles={['coordinator']}>
              <Routes>
                <Route path="dashboard" element={<CoordinatorDashboard />} />
                <Route path="resources" element={<ResourcesPage />} />
                <Route path="issues" element={<GlobalIssuesPage />} />
                <Route path="timetable" element={<GlobalTimetablePage />} />
                <Route path="*" element={<Navigate to="dashboard" />} />
              </Routes>
            </PrivateRoute>
          }
        />
        
        {/* Default redirect to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
};
