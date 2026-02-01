
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/authContext';
import { ProjectProvider } from './services/projectContext';
import { ThemeProvider } from './services/themeContext';
import Login from './app/(auth)/Login';
import AdminDashboard from './app/(admin)/AdminDashboard';
import ManageUsers from './app/(admin)/ManageUsers';
import UserDashboard from './app/(user)/UserDashboard';
import ProjectInventory from './app/ProjectInventory';
import InventoryHistory from './app/InventoryHistory';
import Settings from './app/Settings';
import Layout from './components/layout/Layout';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children?: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Role based redirect for root path
const RootRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return user.role === 'admin' 
    ? <Navigate to="/admin/dashboard" replace /> 
    : <Navigate to="/user/dashboard" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProjectProvider>
        <ThemeProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={<RootRedirect />} />

              {/* Shared Protected Routes (Settings) */}
              <Route element={
                <ProtectedRoute allowedRoles={['admin', 'user']}>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<ManageUsers />} />
                <Route path="history" element={<InventoryHistory />} />
                <Route path="project/:projectId/inventory" element={<ProjectInventory />} />
              </Route>

              {/* User Routes */}
              <Route path="/user" element={
                <ProtectedRoute allowedRoles={['user', 'admin']}>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<UserDashboard />} />
                <Route path="history" element={<InventoryHistory />} />
                <Route path="project/:projectId/inventory" element={<ProjectInventory />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </ThemeProvider>
      </ProjectProvider>
    </AuthProvider>
  );
};

export default App;