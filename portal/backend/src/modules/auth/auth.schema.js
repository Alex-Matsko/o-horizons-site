import { z } from 'zod';

export const RegisterSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Need uppercase').regex(/[0-9]/, 'Need digit'),
  org_name: z.string().min(2).max(255),
  phone:    z.string().optional(),
  inn:      z.string().optional(),
});

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});
