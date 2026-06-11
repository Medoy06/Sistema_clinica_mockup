import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Postgres unique violation
  if ((err as any).code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Ya existe un registro con esos datos.',
    });
  }

  // Postgres foreign key violation
  if ((err as any).code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida en los datos enviados.',
    });
  }

  // Default
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor.',
  });
};
