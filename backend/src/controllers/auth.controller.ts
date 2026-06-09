import { Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import * as AuthModel from '../models/auth.model';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos.',
      });
    }

    // Find user
    const user = await AuthModel.findUserByEmail(email.toLowerCase());
    if (!user) {
      // Same message whether email or password is wrong
      // Never tell the attacker which one failed
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    // Verify password
    const valid = await AuthModel.verifyPassword(password, user.password_hash);
    if (!valid) {
      await AuthModel.logAuditEvent({
        action: 'LOGIN_FAILED',
        details: { email },
        ip_address: req.ip,
      });
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    // Generate token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role,
  },
  process.env.JWT_SECRET as string,
  { expiresIn: '8h' }
);

    // Update last login
    await AuthModel.updateLastLogin(user.id);

    // Log successful login
    await AuthModel.logAuditEvent({
      user_id: user.id,
      action: 'LOGIN_SUCCESS',
      ip_address: req.ip,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión.',
    });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await AuthModel.findUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.',
      });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario.',
    });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos.',
      });
    }

    const existing = await AuthModel.findUserByEmail(email.toLowerCase());
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un usuario con ese email.',
      });
    }

    const user = await AuthModel.createUser({
      full_name,
      email: email.toLowerCase(),
      password,
      role,
    });

    await AuthModel.logAuditEvent({
      user_id: req.user!.userId,
      action: 'USER_CREATED',
      entity_type: 'user',
      entity_id: user.id,
      details: { email, role },
      ip_address: req.ip,
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario.',
    });
  }
};