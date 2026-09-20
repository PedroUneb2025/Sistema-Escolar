import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail institucional.')
    .email('Digite um e-mail válido.'),
  password: z
    .string()
    .min(1, 'Informe sua senha.')
    .min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  remember: z.boolean(),
});

export const mfaSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Informe o código de verificação.')
    .regex(/^\d{6}$/, 'O código deve conter exatamente 6 números.'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type MFAFormData = z.infer<typeof mfaSchema>;
