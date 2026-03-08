import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';

import AppLayout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Units from './pages/Units';
import Tenants from './pages/Tenants';
import Payments from './pages/Payments';
import Owners from './pages/Owners';
import Settlements from './pages/Settlements';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { PropertyProvider } from './context/PropertyContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Spin } from 'antd';
import { migrateLocalStorageToSupabase } from './lib/store';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  useEffect(() => {
    migrateLocalStorageToSupabase();
  }, []);

  return (
    <AuthProvider>
      <ConfigProvider
        locale={esES}
        theme={{
          token: {
            colorPrimary: '#44a8ac',
          },
          components: {
            Layout: {
              siderBg: '#6d6d6d',
            },
            Menu: {
              darkItemBg: '#6d6d6d',
              darkItemSelectedBg: '#44a8ac',
            },
          },
        }}
      >
        <PropertyProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="unidades" element={<Units />} />
                <Route path="propietarios" element={<Owners />} />
                <Route path="inquilinos" element={<Tenants />} />
                <Route path="cobranzas" element={<Payments />} />
                <Route path="liquidaciones" element={<Settlements />} />
                <Route path="perfil" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </HashRouter>
        </PropertyProvider>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
