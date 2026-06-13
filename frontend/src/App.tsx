import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { LoginPage } from './pages/auth/LoginPage';
import { useAuth } from './context/AuthContext';
import { AppointmentsPage } from './pages/appointments/AppointmentsPage';

function App() {
  const { user, token, logout, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState('/inventario');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (!user || !token) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPath) {
      case '/inventario':
        return <InventoryPage />;
      case '/citas':
        return <AppointmentsPage />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-400">
              <p className="text-6xl mb-4">🏥</p>
              <p className="text-xl font-medium">
                Bienvenido, {user.full_name}
              </p>
              <p className="text-sm mt-2">Seleccione una opción del menú</p>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout
      currentPath={currentPath}
      onNavigate={setCurrentPath}
      user={user}
      onLogout={logout}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;