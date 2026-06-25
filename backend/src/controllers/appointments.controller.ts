import { Request, Response, NextFunction } from 'express';
import * as AppointmentsModel from '../models/appointments.model';

// ── PATIENTS ──────────────────────────────────────────────────────────────────

export const getPatients = async (req: Request, res: Response) => {
  try {
    const patients = await AppointmentsModel.getAllPatients();
    res.json({ success: true, data: patients });
  } catch (error) {
    console.error('GET PATIENTS ERROR:', error);
    res.status(500).json({ success: false, message: 'Error al obtener pacientes.' });
  }
};

export const getPatient = async (req: Request, res: Response) => {
  try {
    const patient = await AppointmentsModel.getPatientById(req.params.id as string);
    if (!patient) return res.status(404).json({ success: false, message: 'Paciente no encontrado.' });
    res.json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener paciente.' });
  }
};

export const createPatient = async (req: Request, res: Response) => {
  try {
    const { first_name, last_name } = req.body;
    if (!first_name || !last_name) {
      return res.status(400).json({ success: false, message: 'Nombre y apellido son requeridos.' });
    }
    const patient = await AppointmentsModel.createPatient(req.body);
    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    console.error('CREATE PATIENT ERROR:', error);
    res.status(500).json({ success: false, message: 'Error al crear paciente.' });
  }
};

export const updatePatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = await AppointmentsModel.updatePatient(req.params.id as string, req.body);
    if (!patient) return res.status(404).json({ success: false, message: 'Paciente no encontrado.' });
    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

// ── DOCTORS ───────────────────────────────────────────────────────────────────

export const getDoctors = async (req: Request, res: Response) => {
  try {
    const doctors = await AppointmentsModel.getAllDoctors();
    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error('GET DOCTORS ERROR:', error);
    res.status(500).json({ success: false, message: 'Error al obtener médicos.' });
  }
};

export const getDoctor = async (req: Request, res: Response) => {
  try {
    const doctor = await AppointmentsModel.getDoctorById(req.params.id as string);
    if (!doctor) return res.status(404).json({ success: false, message: 'Médico no encontrado.' });
    res.json({ success: true, data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener médico.' });
  }
};

export const getDoctorSchedule = async (req: Request, res: Response) => {
  try {
    const schedule = await AppointmentsModel.getDoctorSchedule(req.params.id as string);
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener horario.' });
  }
};

// ── APPOINTMENTS ──────────────────────────────────────────────────────────────

export const getAppointments = async (req: Request, res: Response) => {
  try {
    const { doctor_id, patient_id, date, status } = req.query;
    const appointments = await AppointmentsModel.getAllAppointments({
      doctor_id: doctor_id as string,
      patient_id: patient_id as string,
      date: date as string,
      status: status as string,
    });
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener citas.' });
  }
};

export const getAppointment = async (req: Request, res: Response) => {
  try {
    const appointment = await AppointmentsModel.getAppointmentById(req.params.id as string);
    if (!appointment) return res.status(404).json({ success: false, message: 'Cita no encontrada.' });
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener cita.' });
  }
};

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const { patient_id, doctor_id, scheduled_at } = req.body;
    if (!patient_id || !doctor_id || !scheduled_at) {
      return res.status(400).json({
        success: false,
        message: 'Paciente, médico y fecha/hora son requeridos.'
      });
    }
    const appointment = await AppointmentsModel.createAppointment({
      ...req.body,
      created_by: req.user!.userId,
    });
    res.status(201).json({ success: true, data: appointment });
  } catch (error: any) {
    console.error('CREATE APPOINTMENT ERROR:', error);
    if (error.message?.startsWith('CONFLICT:')) {
      return res.status(409).json({ success: false, message: error.message.replace('CONFLICT: ', '') });
    }
    res.status(500).json({ success: false, message: 'Error al crear cita.' });
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { status, cancellation_reason, notes } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Estado es requerido.' });
    const appointment = await AppointmentsModel.updateAppointmentStatus(
      req.params.id as string,
      status,
      {
        // Who performed the cancellation comes from the token, never the body.
        cancelled_by: status === 'cancelled' ? req.user!.userId : undefined,
        cancellation_reason,
        notes,
      }
    );
    if (!appointment) return res.status(404).json({ success: false, message: 'Cita no encontrada.' });
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar estado.' });
  }
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await AppointmentsModel.getDoctorNotifications(req.user!.userId);
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener notificaciones.' });
  }
};

export const markRead = async (req: Request, res: Response) => {
  try {
    const affected = await AppointmentsModel.markNotificationRead(
      req.params.id as string,
      req.user!.userId
    );
    if (affected === 0) {
      return res.status(404).json({ success: false, message: 'Notificación no encontrada.' });
    }
    res.json({ success: true, message: 'Notificación marcada como leída.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar notificación.' });
  }
};

// ── MEDICAL RECORDS ───────────────────────────────────────────────────────────

export const getMedicalRecords = async (req: Request, res: Response) => {
  try {
    const records = await AppointmentsModel.getPatientMedicalRecords(req.params.id as string);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('GET MEDICAL RECORDS ERROR:', error);
    res.status(500).json({ success: false, message: 'Error al obtener historial médico.' });
  }
};

export const createMedicalRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patient_id } = req.body;
    if (!patient_id) {
      return res.status(400).json({
        success: false,
        message: 'El paciente es requerido.',
      });
    }

    // AUTHORSHIP: doctor_id is NOT trusted from the body (that let a
    // receptionist forge a record in a doctor's name). Resolve it from the
    // caller instead:
    //  - If the caller is a doctor, force doctor_id to THEIR doctor record.
    //  - If the caller is admin (not a doctor, no doctor_id of their own),
    //    they must supply a valid doctor_id explicitly. Admin is the trusted
    //    superuser, so this is acceptable; the can('medical_records') gate
    //    already blocks everyone else.
    let doctor_id: string | undefined;
    const callerDoctor = await AppointmentsModel.getDoctorByUserId(req.user!.userId);
    if (callerDoctor) {
      doctor_id = callerDoctor.id; // forced — body value ignored
    } else if (req.user!.role === 'admin') {
      doctor_id = req.body.doctor_id; // admin must name the doctor
    }

    if (!doctor_id) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo determinar el médico responsable del registro.',
      });
    }

    const record = await AppointmentsModel.createMedicalRecord({
      ...req.body,
      doctor_id,
    });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('CREATE MEDICAL RECORD ERROR:', error);
    next(error);
  }
};
export const getAppointmentHistory = async (req: Request, res: Response) => {
  try {
    const history = await AppointmentsModel.getPatientAppointmentHistory(req.params.id as string);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener historial de citas.' });
  }
};