-- Patient Status enum

CREATE TYPE patient_status AS ENUM ('active', 'inactive');

-- Appointment status enum
Create type appointment_status as enum
('scheduled', 
'confirmed',
'cancelled',
'completed',
'no_show'
);

-- Patients table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    identity_number VARCHAR(20) UNIQUE,
    date_of_birth DATE,
    gender VARCHAR(10) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    blood_type VARCHAR(5),
    allergies TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    status patient_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP default now(),
    updated_at TIMESTAMP default now()
);

-- Doctors table (extends users)
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT null REFERENCES users(id) ON DELETE CASCADE,
    specialty VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) UNIQUE,
    consultation_duration integer default 30, -- in minutes
    consultation_fee decimal(10, 2) default 0,
    is_active boolean default true,
    created_at TIMESTAMP default now(),
    updated_at TIMESTAMP default now()
);

--Doctor's schedule table (which days and times they are available for appointments)
CREATE TABLE doctor_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT null REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active boolean default true,
    created_at TIMESTAMP default now()
);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID not null references patients(id) on delete restrict,
    doctor_id UUID not null references doctors(id) on delete restrict,
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes integer default 30,
    status appointment_status not null default 'scheduled',
    consultation_type VARCHAR(100),
    reason TEXT,
    notes TEXT,
    cancelled_by varchar(100),
    cancellation_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP default now(),
    updated_at TIMESTAMP default now()
);

-- Appointment notifications log (to track when notifications were sent for appointments)
CREATE TABLE appointment_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT null references appointments(id) on delete cascade,
    notification_type VARCHAR(50) not null, -- e.g., 'reminder', '
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT not null,
    is_sent boolean default false,
    created_at TIMESTAMP default now()
);

-- Indexes for common queries
create index idx_appointments_doctor_id on appointments(doctor_id);
create index idx_appointments_patient_id on appointments(patient_id);
create index idx_appointments_scheduled_at on appointments(scheduled_at);
create index idx_appointment_status on appointments(status);
create index idc_notifications_recipient on appointment_notifications(recipient_user_id, is_sent);
create index idx_doctor_schedules_doctor on doctor_schedules(doctor_id);

-- Seed a default doctor linked to admin user for testing
INSERT INTO doctors (user_id, specialty, license_number, consultation_duration, consultation_fee)
SELECT id, 'Medicina General', 'LIC-001', 30, 500.00
FROM users WHERE email = 'admin@clinica.hn';

-- Seed schedule for that doctor (Mon-Fri 8am-5pm)
INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time)
SELECT d.id, day, '08:00', '17:00'
FROM doctors d
CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS days(day)
WHERE d.license_number = 'LIC-001';