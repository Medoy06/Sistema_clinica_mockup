import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { LoginPage } from './pages/auth/LoginPage';
import { useAuth } from './context/AuthContext';
import { AppointmentsPage } from './pages/appointments/AppointmentsPage';
import { appointmentsService } from './services/appointments.service';
import { PatientsPage } from './pages/patients/PatientsPage';
import { PatientProfilePage } from './pages/patients/PatientProfilePage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ComunicacionesPage } from './pages/communications/ComunicacionesPage';
import { PosPage } from './pages/pos/PosPage';

// Which roles may view which path. Mirrors the sidebar/permission map
// (cosmetic — backend enforces). Used by renderPage to redirect a role
// away from a path it shouldn't reach. '/' and '/comunicaciones' are open
// to everyone (every role can see Inicio + the placeholder).
const pathAccess: Record<string, string[]> = {
  '/': ['admin', 'doctor', 'recepcionista', 'enfermera', 'farmaceutico', 'bodega'],
  '/pos': ['admin', 'farmaceutico', 'recepcionista'],
  '/inventario': ['admin', 'farmaceutico', 'recepcionista', 'bodega'],
  '/citas': ['admin', 'doctor', 'recepcionista', 'enfermera'],
  '/pacientes': ['admin', 'doctor', 'recepcionista', 'enfermera'],
  '/comunicaciones': ['admin', 'doctor', 'recepcionista', 'enfermera', 'farmaceutico', 'bodega'],
};

const canViewPath = (path: string, role?: string) => {
  const allowed = pathAccess[path];
  if (!allowed) return true; // unknown path → let the switch's default handle it
  return allowed.includes(role ?? '');
};

function App() {
  const { user, token, logout, loading } = useAuth();
  // Default to Inicio (every role can see it), NOT inventario.
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !token) return;
    const fetchNotifications = async () => {
      try {
        const notifs = await appointmentsService.getNotifications();
        setUnreadCount(notifs.filter(n => !n.is_sent).length);
      } catch {
        // silent fail (e.g. a role without clinical access)
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user, token]);

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
    // Safety net: if the current role can't view this path, send them home.
    // Belt-and-suspenders — the sidebar already hides forbidden links and the
    // backend 403s the data, but this stops a stale/forced path from rendering
    // a page the role shouldn't see.
    if (!canViewPath(currentPath, user.role)) {
      return <DashboardPage onNavigate={setCurrentPath} />;
    }

    switch (currentPath) {
      case '/':
        return <DashboardPage onNavigate={setCurrentPath} />;
      case '/pos':
        return <PosPage />;
      case '/pacientes':
        if (selectedPatientId) {
          return (
            <PatientProfilePage
              patientId={selectedPatientId}
              onBack={() => setSelectedPatientId(null)}
            />
          );
        }
        return <PatientsPage onSelectPatient={setSelectedPatientId} />;
      case '/inventario':
        return <InventoryPage />;
      case '/citas':
        return <AppointmentsPage />;
      case '/comunicaciones':
        return <ComunicacionesPage />;
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
      onNavigate={(path: string) => {
        setSelectedPatientId(null);
        setCurrentPath(path);
      }}
      user={user}
      onLogout={logout}
      unreadCount={unreadCount}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;