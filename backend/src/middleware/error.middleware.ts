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
  // Postgres invalid text representation (e.g. malformed UUID)
  if ((err as any).code === '22P02') {
    return res.status(400).json({
      success: false,
      message: 'Formato de dato inválido (ID o valor mal formado).',
    });
  }
  // Postgres not-null violation — a required field was missing. This should
  // normally be caught earlier by Zod, but if a NOT NULL column isn't covered
  // by validation, degrade gracefully to a 400 instead of a 500 (no stack-trace
  // leak, no scary "Error interno"). Defense in depth for every endpoint.
  if ((err as any).code === '23502') {
    return res.status(400).json({
      success: false,
      message: 'Falta un campo requerido.',
    });
  }
  // Postgres check-constraint violation — a value broke a CHECK (e.g. an enum
  // or range). Bad input, not a server fault → 400.
  if ((err as any).code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Un valor enviado no es válido.',
    });
  }
  // Postgres numeric overflow — a number exceeded the column's precision/scale
  // (e.g. a value too large for numeric(10,3)). Bad input → 400, not 500.
  // Zod should bound numerics at the schema, but this is the system-wide net.
  if ((err as any).code === '22003') {
    return res.status(400).json({
      success: false,
      message: 'Un valor numérico está fuera del rango permitido.',
    });
  }
  // Default
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor.',
  });
};