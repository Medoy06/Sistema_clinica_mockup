import pool from '../config/db';

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  identity_number?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Doctor {
    id: string;
    user_id: string;
    specialty?: string;
    license_number?: string;
    consultation_duration?: number;
    consultation_fee?: number;
    is_available: boolean;
    full_name?: string;
    email?: string;
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
  created_by?: string;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  doctor_name?: string;
  specialty?: string;
}

// ── PATIENTS ──────────────────────────────────────────────────────────────────

export const getAllPatients = async () => {
  const result = await pool.query(`
    SELECT * FROM patients
    WHERE status = 'active'
    ORDER BY last_name ASC, first_name ASC
  `);
  return result.rows;
};


export const getPatientById = async (id: string) => {
  const result = await pool.query(`
    SELECT * FROM patients WHERE id = $1`,
    [id]
    );
    return result.rows[0] || null;
};

export const createPatient = async (data: Partial<Patient>) => {
  const result = await pool.query(`
    INSERT INTO patients (
      first_name, last_name, identity_number, date_of_birth,
      gender, phone, email, address, blood_type, allergies,
      emergency_contact_name, emergency_contact_phone
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *
  `, [
    data.first_name, data.last_name, data.identity_number, data.date_of_birth,
    data.gender, data.phone, data.email, data.address, data.blood_type,
    data.allergies, data.emergency_contact_name, data.emergency_contact_phone
  ]);
  return result.rows[0];
};

export const updatePatient = async (id: string, data: Partial<Patient>) => {
  const fields = Object.keys(data)
    .map((key, i) => `${key} = $${i + 2}`)
    .join(', ');
  const values = Object.values(data);
  const result = await pool.query(`
    UPDATE patients SET ${fields}, updated_at = NOW()
    WHERE id = $1 RETURNING *
  `, [id, ...values]);
  return result.rows[0] || null;
};

// ── DOCTORS ───────────────────────────────────────────────────────────────────

export const getAllDoctors = async () => {
  const result = await pool.query(`
    SELECT d.*, u.full_name, u.email
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    WHERE d.is_active = true AND u.is_active = true
    ORDER BY u.full_name ASC
  `);
  return result.rows;
};

export const getDoctorById = async (id: string) => {
  const result = await pool.query(`
    SELECT d.*, u.full_name, u.email
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    WHERE d.id = $1
  `, [id]);
  return result.rows[0] || null;
};

export const getDoctorSchedule = async (doctorId: string) => {
  const result = await pool.query(`
    SELECT * FROM doctor_schedules
    WHERE doctor_id = $1 AND is_active = true
    ORDER BY day_of_week ASC
  `, [doctorId]);
  return result.rows;
};

// ── APPOINTMENTS ──────────────────────────────────────────────────────────────

export const getAllAppointments = async (filters: {
  doctor_id?: string;
  patient_id?: string;
  date?: string;
  status?: string;
}) => {
  let query = `
    SELECT 
      a.*,
      CONCAT(p.first_name, ' ', p.last_name) as patient_name,
      u.full_name as doctor_name,
      d.specialty
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users u ON d.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramCount = 1;

   if (filters.doctor_id) {
    query += ` AND a.doctor_id = $${paramCount++}`;
    params.push(filters.doctor_id);
  }
  if (filters.patient_id) {
    query += ` AND a.patient_id = $${paramCount++}`;
    params.push(filters.patient_id);
  }
  if (filters.date) {
    query += ` AND DATE(a.scheduled_at) = $${paramCount++}`;
    params.push(filters.date);
  }
  if (filters.status) {
    query += ` AND a.status = $${paramCount++}`;
    params.push(filters.status);
  }

  query += ` ORDER BY a.scheduled_at ASC`;

  const result = await pool.query(query, params);
  return result.rows;
};

export const getAppointmentById = async (id: string) => {
  const result = await pool.query(`
    SELECT 
      a.*,
      CONCAT(p.first_name, ' ', p.last_name) as patient_name,
      p.phone as patient_phone,
      u.full_name as doctor_name,
      d.specialty
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users u ON d.user_id = u.id
    WHERE a.id = $1
  `, [id]);
  return result.rows[0] || null;
};

export const createAppointment = async (data: {
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  consultation_type?: string;
  reason?: string;
  created_by?: string;
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check for conflicts
    const conflict = await client.query(`
      SELECT id FROM appointments
      WHERE doctor_id = $1
        AND status NOT IN ('cancelled', 'no_show')
        AND scheduled_at < $2::timestamp + ($3 || ' minutes')::interval
        AND scheduled_at + (duration_minutes || ' minutes')::interval > $2::timestamp
    `, [data.doctor_id, data.scheduled_at, data.duration_minutes || 30]);

    if (conflict.rows.length > 0) {
      throw new Error('CONFLICT: El médico ya tiene una cita en ese horario.');
    }

    const result = await client.query(`
      INSERT INTO appointments (
        patient_id, doctor_id, scheduled_at, duration_minutes,
        consultation_type, reason, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [
      data.patient_id, data.doctor_id, data.scheduled_at,
      data.duration_minutes || 30, data.consultation_type,
      data.reason, data.created_by
    ]);

    const appointment = result.rows[0];

    // Create notification for doctor
    await client.query(`
      INSERT INTO appointment_notifications (
        appointment_id, notification_type, recipient_user_id, message
      )
      SELECT $1, 'nueva_cita', d.user_id,
        'Nueva cita programada para ' || TO_CHAR($2::timestamp, 'DD/MM/YYYY HH24:MI')
      FROM doctors d WHERE d.id = $3
    `, [appointment.id, data.scheduled_at, data.doctor_id]);

     await client.query('COMMIT');
    return appointment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateAppointmentStatus = async (
  id: string,
  status: Appointment['status'],
  extra?: { cancelled_by?: string; cancellation_reason?: string; notes?: string }
) => {
  const result = await pool.query(`
    UPDATE appointments
    SET status = $2,
        cancelled_by = $3,
        cancellation_reason = $4,
        notes = COALESCE($5, notes),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id, status, extra?.cancelled_by, extra?.cancellation_reason, extra?.notes]);
  return result.rows[0] || null;
};

export const getDoctorNotifications = async (userId: string) => {
  const result = await pool.query(`
    SELECT 
      n.*,
      CONCAT(p.first_name, ' ', p.last_name) as patient_name,
      a.scheduled_at,
      a.status as appointment_status
    FROM appointment_notifications n
    JOIN appointments a ON n.appointment_id = a.id
    JOIN patients p ON a.patient_id = p.id
    WHERE n.recipient_user_id = $1
    ORDER BY n.created_at DESC
    LIMIT 20
  `, [userId]);
  return result.rows;
};

export const markNotificationRead = async (id: string) => {
  await pool.query(
    `UPDATE appointment_notifications SET is_sent = true WHERE id = $1`,
    [id]
  );
};