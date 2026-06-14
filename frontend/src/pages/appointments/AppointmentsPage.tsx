import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAppointments } from '../../hooks/useAppointments';
import { useAuth } from '../../context/AuthContext';
import type { Appointment, CreatePatientData } from '../../services/appointments.service';

// ── STATUS HELPERS ─────────────────────────────────────────────────────────────

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

// ── HELPERS ────────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-HN', {
    weekday: 'long', year: 'numeric',
    month: 'long', day: 'numeric'
  });
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ── COMPONENT ──────────────────────────────────────────────────────────────────

export const AppointmentsPage = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const {
    appointments, patients, doctors, notifications,
    unreadCount, loading, error,
    createPatient, createAppointment, updateStatus, markNotificationRead,
  } = useAppointments({ date: selectedDate });

  // ── APPOINTMENT FORM STATE ──
  const [apptForm, setApptForm] = useState({
    patient_id: '',
    doctor_id: '',
    scheduled_at: '',
    consultation_type: '',
    reason: '',
    duration_minutes: 30,
  });

  // ── PATIENT FORM STATE ──
  const [patientForm, setPatientForm] = useState<CreatePatientData>({
    first_name: '',
    last_name: '',
    identity_number: '',
    phone: '',
    email: '',
    gender: '',
    blood_type: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // ── HANDLERS ──

  const handleCreateAppointment = async () => {
    if (!apptForm.patient_id || !apptForm.doctor_id || !apptForm.scheduled_at) {
      toast.error('Paciente, médico y fecha/hora son requeridos.');
      return;
    }
    try {
      setSubmitting(true);
      await createAppointment(apptForm);
      toast.success('Cita creada correctamente.');
      setShowNewAppointment(false);
      setApptForm({
        patient_id: '', doctor_id: '', scheduled_at: '',
        consultation_type: '', reason: '', duration_minutes: 30,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear la cita.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!patientForm.first_name || !patientForm.last_name) {
      toast.error('Nombre y apellido son requeridos.');
      return;
    }
    try {
      setSubmitting(true);
      const patient = await createPatient(patientForm);
      toast.success('Paciente registrado correctamente.');
      setShowNewPatient(false);
      setApptForm(prev => ({ ...prev, patient_id: patient.id }));
      setPatientForm({
        first_name: '', last_name: '', identity_number: '',
        phone: '', email: '', gender: '', blood_type: '',
      });
    } catch (err) {
      toast.error('Error al registrar el paciente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    appointment: Appointment,
    status: Appointment['status']
  ) => {
    try {
      await updateStatus(appointment.id, status);
      toast.success(`Cita ${statusLabels[status].toLowerCase()}.`);
    } catch (err) {
      toast.error('Error al actualizar el estado.');
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await updateStatus(cancelTarget.id, 'cancelled', {
        cancelled_by: user?.full_name,
        cancellation_reason: cancellationReason,
      });
      toast.success('Cita cancelada.');
      setCancelTarget(null);
      setCancellationReason('');
    } catch (err) {
      toast.error('Error al cancelar la cita.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-slate-500">Cargando citas...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-red-500">{error}</p>
    </div>
  );

  return (
    <div className="p-6">

      {/* ── CANCEL DIALOG ── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCancelTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Cancelar Cita</h3>
            <p className="text-sm text-slate-500 mb-4">
              ¿Está seguro que desea cancelar la cita de{' '}
              <span className="font-medium">{cancelTarget.patient_name}</span>?
            </p>
            <div className="mb-4">
              <label className="text-sm text-slate-600 block mb-1">
                Motivo de cancelación (opcional)
              </label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={cancellationReason}
                onChange={e => setCancellationReason(e.target.value)}
                placeholder="Ingrese el motivo..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Cancelar cita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Citas</h1>
          <p className="text-slate-500 text-sm mt-1">
            {appointments.length} cita(s) para {formatDate(selectedDate + 'T12:00:00')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Notifications bell */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowNewAppointment(!showNewAppointment)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Nueva Cita
          </button>
        </div>
      </div>

      {/* ── NOTIFICATIONS PANEL ── */}
      {showNotifications && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <h2 className="text-base font-semibold text-slate-700 mb-3">
            Notificaciones
          </h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-400">No hay notificaciones.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between p-3 rounded-lg ${
                    n.is_sent ? 'bg-slate-50' : 'bg-blue-50 border border-blue-100'
                  }`}
                >
                  <div>
                    <p className="text-sm text-slate-700">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Paciente: {n.patient_name} —{' '}
                      {new Date(n.created_at).toLocaleDateString('es-HN')}
                    </p>
                  </div>
                  {!n.is_sent && (
                    <button
                      onClick={() => markNotificationRead(n.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 ml-3 shrink-0"
                    >
                      Marcar leída
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NEW PATIENT FORM ── */}
      {showNewPatient && (
        <div className="bg-white rounded-lg border border-blue-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">
            Registrar Nuevo Paciente
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600 block mb-1">Nombre *</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={patientForm.first_name}
                onChange={e => setPatientForm({ ...patientForm, first_name: e.target.value })}
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">Apellido *</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={patientForm.last_name}
                onChange={e => setPatientForm({ ...patientForm, last_name: e.target.value })}
                placeholder="Apellido"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">Identidad</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={patientForm.identity_number}
                onChange={e => setPatientForm({ ...patientForm, identity_number: e.target.value })}
                placeholder="Número de identidad"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">Teléfono</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={patientForm.phone}
                onChange={e => setPatientForm({ ...patientForm, phone: e.target.value })}
                placeholder="Teléfono"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">Correo</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={patientForm.email}
                onChange={e => setPatientForm({ ...patientForm, email: e.target.value })}
                placeholder="Correo electrónico"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">Género</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={patientForm.gender}
                onChange={e => setPatientForm({ ...patientForm, gender: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
                <div>
  <label className="text-sm text-slate-600 block mb-1">Fecha de nacimiento</label>
  <input
    type="date"
    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    value={patientForm.date_of_birth || ''}
    onChange={e => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}
  />
</div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">Tipo de sangre</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={patientForm.blood_type}
                onChange={e => setPatientForm({ ...patientForm, blood_type: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreatePatient}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? 'Guardando...' : 'Registrar Paciente'}
            </button>
            <button
              onClick={() => setShowNewPatient(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── NEW APPOINTMENT FORM ── */}
      {showNewAppointment && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">
            Nueva Cita
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-slate-600">Paciente *</label>
                <button
                  onClick={() => setShowNewPatient(true)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  + Nuevo paciente
                </button>
              </div>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={apptForm.patient_id}
                onChange={e => setApptForm({ ...apptForm, patient_id: e.target.value })}
              >
                <option value="">Seleccionar paciente...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                    {p.identity_number ? ` — ${p.identity_number}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">Médico *</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={apptForm.doctor_id}
                onChange={e => setApptForm({ ...apptForm, doctor_id: e.target.value })}
              >
                <option value="">Seleccionar médico...</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} — {d.specialty}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">Fecha y hora *</label>
              <input
                type="datetime-local"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={apptForm.scheduled_at}
                onChange={e => setApptForm({ ...apptForm, scheduled_at: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">
                Duración (minutos)
              </label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={apptForm.duration_minutes}
                onChange={e => setApptForm({ ...apptForm, duration_minutes: Number(e.target.value) })}
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">
                Tipo de consulta
              </label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={apptForm.consultation_type}
                onChange={e => setApptForm({ ...apptForm, consultation_type: e.target.value })}
                placeholder="General, control, emergencia..."
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">Motivo</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={apptForm.reason}
                onChange={e => setApptForm({ ...apptForm, reason: e.target.value })}
                placeholder="Motivo de la consulta..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreateAppointment}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? 'Guardando...' : 'Crear Cita'}
            </button>
            <button
              onClick={() => setShowNewAppointment(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── DATE PICKER ── */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium">Fecha:</label>
          <input
            type="date"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        <button
          onClick={() => setSelectedDate(toDateInputValue(new Date()))}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Hoy
        </button>
      </div>

      {/* ── APPOINTMENTS LIST ── */}
      {appointments.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-slate-500 font-medium">No hay citas para este día</p>
          <p className="text-slate-400 text-sm mt-1">
            Haga clic en "+ Nueva Cita" para agendar una
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map(appointment => (
            <div
              key={appointment.id}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-lg font-semibold text-slate-800">
                      {formatTime(appointment.scheduled_at)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[appointment.status]}`}>
                      {statusLabels[appointment.status]}
                    </span>
                    {appointment.consultation_type && (
                      <span className="text-xs text-slate-400">
                        {appointment.consultation_type}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-slate-800">
                    {appointment.patient_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    Dr. {appointment.doctor_name} — {appointment.specialty}
                  </p>
                  {appointment.reason && (
                    <p className="text-sm text-slate-400 mt-1">
                      Motivo: {appointment.reason}
                    </p>
                  )}
                  {appointment.cancellation_reason && (
                    <p className="text-sm text-red-400 mt-1">
                      Cancelada: {appointment.cancellation_reason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {appointment.status !== 'cancelled' &&
                 appointment.status !== 'completed' && (
                  <div className="flex items-center gap-2 ml-4">
                    {appointment.status === 'scheduled' && (
                      <button
                        onClick={() => handleStatusChange(appointment, 'confirmed')}
                        className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        Confirmar
                      </button>
                    )}
                    {(appointment.status === 'scheduled' ||
                      appointment.status === 'confirmed') && (
                      <button
                        onClick={() => handleStatusChange(appointment, 'completed')}
                        className="text-xs bg-slate-50 text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        Completar
                      </button>
                    )}
                    {(appointment.status === 'scheduled' ||
                      appointment.status === 'confirmed') && (
                      <button
                        onClick={() => handleStatusChange(appointment, 'no_show')}
                        className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        No asistió
                      </button>
                    )}
                    <button
                      onClick={() => setCancelTarget(appointment)}
                      className="text-xs bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

