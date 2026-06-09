import pool from '../config/db';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'doctor' | 'recepcionista' | 'enfermera';
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface SafeUser extends Omit<User, 'password_hash'> {}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1 AND is_active = true`,
    [email]
  );
  return result.rows[0] || null;
};

export const findUserById = async (id: string): Promise<SafeUser | null> => {
  const result = await pool.query(
    `SELECT id, full_name, email, role, is_active, last_login, created_at 
     FROM users WHERE id = $1 AND is_active = true`,
    [id]
  );
  return result.rows[0] || null;
};

export const updateLastLogin = async (id: string): Promise<void> => {
  await pool.query(
    `UPDATE users SET last_login = NOW() WHERE id = $1`,
    [id]
  );
};

export const createUser = async (data: {
  full_name: string;
  email: string;
  password: string;
  role: User['role'];
}): Promise<SafeUser> => {
  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
  const password_hash = await bcrypt.hash(data.password, rounds);

  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, full_name, email, role, is_active, created_at`,
    [data.full_name, data.email, password_hash, data.role]
  );
  return result.rows[0];
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const logAuditEvent = async (data: {
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: object;
  ip_address?: string;
}): Promise<void> => {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.user_id,
      data.action,
      data.entity_type,
      data.entity_id,
      data.details ? JSON.stringify(data.details) : null,
      data.ip_address,
    ]
  );
};



