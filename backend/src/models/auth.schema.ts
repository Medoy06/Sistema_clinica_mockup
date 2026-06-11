import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const CreateUserSchema = z.object({
  full_name: z.string().min(1, 'El nombre es requerido').max(255),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
 role: z.enum(['admin', 'doctor', 'recepcionista', 'enfermera'], {
  errorMap: () => ({ message: 'Rol inválido' }),
}),
});
