import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clinic_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  identity_number?: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  allergies?: string;
}

export interface Doctor {
  id: string;
  user_id: string;
  specialty: string;
  license_number?: string;
  consultation_duration: number;
  consultation_fee?: number;
  full_name: string;
  email: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  consultation_type?: string;
  reason?: string;
  notes?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  patient_name?: string;
  doctor_name?: string;
  specialty?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  appointment_id: string;
  notification_type: string;
  message: string;
  is_sent: boolean;
  patient_name: string;
  scheduled_at: string;
  appointment_status: string;
  created_at: string;
}

export interface CreatePatientData {
  first_name: string;
  last_name: string;
  identity_number?: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface CreateAppointmentData {
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  consultation_type?: string;
  reason?: string;
}

export const appointmentsService = {
  // Patients
  getPatients: async (): Promise<Patient[]> => {
    const res = await api.get('/appointments/patients');
    return res.data.data;
  },

  createPatient: async (data: CreatePatientData): Promise<Patient> => {
    const res = await api.post('/appointments/patients', data);
    return res.data.data;
  },

  // Doctors
  getDoctors: async (): Promise<Doctor[]> => {
    const res = await api.get('/appointments/doctors');
    return res.data.data;
  },

  // Appointments
  getAppointments: async (filters?: {
    doctor_id?: string;
    patient_id?: string;
    date?: string;
    status?: string;
  }): Promise<Appointment[]> => {
    const params = new URLSearchParams();
    if (filters?.doctor_id) params.append('doctor_id', filters.doctor_id);
    if (filters?.patient_id) params.append('patient_id', filters.patient_id);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.status) params.append('status', filters.status);
    const res = await api.get(`/appointments?${params.toString()}`);
    return res.data.data;
  },

  createAppointment: async (data: CreateAppointmentData): Promise<Appointment> => {
    const res = await api.post('/appointments', data);
    return res.data.data;
  },

  updateStatus: async (
    id: string,
    status: Appointment['status'],
    extra?: { cancelled_by?: string; cancellation_reason?: string; notes?: string }
  ): Promise<Appointment> => {
    const res = await api.patch(`/appointments/${id}/status`, { status, ...extra });
    return res.data.data;
  },

  // Notifications
  getNotifications: async (): Promise<Notification[]> => {
    const res = await api.get('/appointments/notifications/me');
    return res.data.data;
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await api.patch(`/appointments/notifications/${id}/read`);
  },
};

