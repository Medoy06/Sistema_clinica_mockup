import { useState, useEffect, useCallback } from 'react';
import {
  appointmentsService,
  type Patient,
  type Doctor,
  type Appointment,
  type Notification,
  type CreatePatientData,
  type CreateAppointmentData,
} from '../services/appointments.service';

export const useAppointments = (filters?: {
  doctor_id?: string;
  date?: string;
  status?: string;
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [appts, pts, docs, notifs] = await Promise.all([
        appointmentsService.getAppointments(filters),
        appointmentsService.getPatients(),
        appointmentsService.getDoctors(),
        appointmentsService.getNotifications(),
      ]);
      setAppointments(appts);
      setPatients(pts);
      setDoctors(docs);
      setNotifications(notifs);
      setError(null);
    } catch (err) {
      setError('Error al cargar las citas.');
    } finally {
      setLoading(false);
    }
  }, [filters?.doctor_id, filters?.date, filters?.status]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createPatient = async (data: CreatePatientData) => {
    const patient = await appointmentsService.createPatient(data);
    setPatients(prev => [...prev, patient]);
    return patient;
  };

  const createAppointment = async (data: CreateAppointmentData) => {
    const appointment = await appointmentsService.createAppointment(data);
    setAppointments(prev => [...prev, appointment]);
    return appointment;
  };

  const updateStatus = async (
    id: string,
    status: Appointment['status'],
    extra?: { cancelled_by?: string; cancellation_reason?: string; notes?: string }
  ) => {
    const updated = await appointmentsService.updateStatus(id, status, extra);
    setAppointments(prev =>
      prev.map(a => a.id === id ? updated : a)
    );
    return updated;
  };

  const markNotificationRead = async (id: string) => {
    await appointmentsService.markNotificationRead(id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_sent: true } : n)
    );
  };

  const unreadCount = notifications.filter(n => !n.is_sent).length;

  return {
    appointments,
    patients,
    doctors,
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchAll,
    createPatient,
    createAppointment,
    updateStatus,
    markNotificationRead,
  };
};