Create table medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID not null references patients(id) on delete restrict,
    doctor_id UUID not null references doctors(id) on delete restrict,  
    appointment_id UUID references appointments(id) on delete set null,
    visit_date timestamp not null default now(),
    diagnosis text,
    treatment text,
    prescription text,
    notes text,
    created_at timestamp default now(),
    updated_at timestamp default now()
);
