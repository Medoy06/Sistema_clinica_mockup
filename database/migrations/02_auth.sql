CREATE TYPE user_role AS ENUM (
  'admin',
  'doctor', 
  'recepcionista',
  'enfermera'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'recepcionista',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit log for security-sensitive actions
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Default admin user (password: Admin1234!)
INSERT INTO users (full_name, email, password_hash, role) VALUES (
  'Administrador',
  'admin@clinica.hn',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCjLBnH5c5uD5VFLt4qjXNy',
  'admin'
);