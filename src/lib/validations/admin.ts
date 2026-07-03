import { z } from "zod";

export const roleNameSchema = z.enum([
  "admin",
  "requester",
  "purchasing",
  "approver",
  "site_manager",
]);

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Ad soyad zorunludur"),
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  phone: z.string().trim().optional(),
  roles: z.array(roleNameSchema).min(1, "En az bir rol seçilmelidir"),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Ad soyad zorunludur"),
  phone: z.string().trim().optional(),
  active: z.coerce.boolean(),
  roles: z.array(roleNameSchema).min(1, "En az bir rol seçilmelidir"),
  password: z
    .string()
    .min(6, "Şifre en az 6 karakter olmalıdır")
    .optional()
    .or(z.literal("")),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Proje adı zorunludur"),
  code: z.string().trim().min(1, "Proje kodu zorunludur"),
  address: z.string().trim().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
