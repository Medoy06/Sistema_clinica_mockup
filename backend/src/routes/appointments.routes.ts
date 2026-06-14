import { Router } from 'express';
import * as AppointmentsController from '../controllers/appointments.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// ── PATIENTS ──────────────────────────────────────────────────────────────────
router.get('/patients', AppointmentsController.getPatients);
router.get('/patients/:id', AppointmentsController.getPatient);
router.post('/patients', AppointmentsController.createPatient);
router.put('/patients/:id', AppointmentsController.updatePatient);
router.get('/patients/:id/medical-records', AppointmentsController.getMedicalRecords);
router.post('/medical-records', AppointmentsController.createMedicalRecord);
router.get('/patients/:id/history', AppointmentsController.getAppointmentHistory);

// ── DOCTORS ───────────────────────────────────────────────────────────────────
router.get('/doctors', AppointmentsController.getDoctors);
router.get('/doctors/:id', AppointmentsController.getDoctor);
router.get('/doctors/:id/schedule', AppointmentsController.getDoctorSchedule);

// ── APPOINTMENTS ──────────────────────────────────────────────────────────────
router.get('/', AppointmentsController.getAppointments);
router.get('/:id', AppointmentsController.getAppointment);
router.post('/', AppointmentsController.createAppointment);
router.patch('/:id/status', AppointmentsController.updateStatus);

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
router.get('/notifications/me', AppointmentsController.getNotifications);
router.patch('/notifications/:id/read', AppointmentsController.markRead);

export default router;
