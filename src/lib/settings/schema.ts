import { z } from "zod";

export const organizationSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(160, "Le nom ne peut pas dépasser 160 caractères."),
  timezone: z
    .string()
    .trim()
    .min(1, "Choisissez un fuseau horaire.")
    .max(80, "Ce fuseau horaire n’est pas valide.")
    .refine(isValidTimezone, "Ce fuseau horaire n’est pas valide."),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Utilisez un code devise à 3 lettres."),
});

export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>;

function isValidTimezone(timezone: string) {
  try {
    Intl.DateTimeFormat("fr-FR", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
