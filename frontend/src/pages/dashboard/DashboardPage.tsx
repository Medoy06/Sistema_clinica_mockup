import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appointmentsService } from '../../services/appointments.service';
import { inventoryService } from '../../services/inventory.service';
import type { Appointment, Notification } from '../../services/appointments.service';
import type { InventoryItem } from '../../services/inventory.service';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

const statusLabels: Record<Appointment['status'], string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'No asistió',
};

const statusColors: Record<Appointment['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-700',
  no_show: 'bg-amber-100 text-amber-700',
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });

export const DashboardPage = ({ onNavigate }: DashboardPageProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [patientsCount, setPatientsCount] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const today = toDateInputValue(new Date());
        const [appts, low, notifs, patients, doctors] = await Promise.all([
          appointmentsService.getAppointments({ date: today }),
          inventoryService.getLowStock(),
          appointmentsService.getNotifications(),
          appointmentsService.getPatients(),
          appointmentsService.getDoctors(),
        ]);

        // Role-aware filtering: doctors only see their own appointments
        let myAppointments = appts;
        if (user?.role === 'doctor') {
          const myDoctor = doctors.find(d => d.user_id === user.id);
          if (myDoctor) {
            myAppointments = appts.filter(a => a.doctor_id === myDoctor.id);
          }
        }

        setAppointments(myAppointments);
        setLowStock(low);
        setNotifications(notifs);
        setPatientsCount(patients.length);
      } catch (err) {
        // dashboard is non-critical, fail silently
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_sent).length;
  const todayLabel = new Date().toLocaleDateString('es-HN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-slate-500">Cargando...</p>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Bienvenido, {user?.full_name}
        </h1>
        <p className="text-slate-500 text-sm mt-1 capitalize">{todayLabel}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">
            {user?.role === 'doctor' ? 'Mis citas de hoy' : 'Citas de hoy'}
          </p>
          <p className="text-3xl font-bold text-slate-800">{appointments.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Stock bajo</p>
          <p className={`text-3xl font-bold ${lowStock.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {lowStock.length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Notificaciones</p>
          <p className={`text-3xl font-bold ${unreadCount > 0 ? 'text-blue-600' : 'text-slate-800'}`}>
            {unreadCount}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Pacientes registrados</p>
          <p className="text-3xl font-bold text-slate-800">{patientsCount}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => onNavigate('/citas')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nueva Cita
        </button>
        <button
          onClick={() => onNavigate('/inventario')}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo Artículo
        </button>
        <button
          onClick={() => onNavigate('/pacientes')}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Ver Pacientes
        </button>
      </div>

      {/* Two column previews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's appointments */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-700">
              {user?.role === 'doctor' ? 'Mis citas de hoy' : 'Citas de hoy'}
            </h2>
            <button
              onClick={() => onNavigate('/citas')}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Ver todas →
            </button>
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No hay citas para hoy</p>
          ) : (
            <div className="space-y-2">
              {appointments.slice(0, 5).map(appt => (
                <div key={appt.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {formatTime(appt.scheduled_at)} — {appt.patient_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Dr. {appt.doctor_name} — {appt.specialty}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[appt.status]}`}>
                    {statusLabels[appt.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock items */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-700">Stock Bajo</h2>
            <button
              onClick={() => onNavigate('/inventario')}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Ver inventario →
            </button>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">
              Todo el inventario está en niveles normales
            </p>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.category_name || 'Sin categoría'}</p>
                  </div>
                  <span className="text-sm font-medium text-red-600">
                    {item.quantity} / {item.min_quantity} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};