import { z } from "zod";

import { DIAGNOSTIC_SECTORS } from "@/lib/diagnostic/contracts";

const wholeNumber = (minimum: number, maximum: number) =>
  z.number().int().min(minimum).max(maximum);

export const diagnosticInputSchema = z
  .object({
    sector: z.enum(DIAGNOSTIC_SECTORS),
    employees: wholeNumber(1, 500),
    technicians: wholeNumber(0, 500),
    monthlyRequests: wholeNumber(0, 10_000),
    monthlyQuotes: wholeNumber(0, 10_000),
    averageQuoteAmount: z.number().min(0).max(10_000_000),
    approximateMarginPercent: z.number().min(0).max(100),
    weeklyAdminHours: z.number().min(0).max(500),
  })
  .superRefine((input, context) => {
    if (input.technicians > input.employees) {
      context.addIssue({
        code: "custom",
        message: "Le nombre de techniciens ne peut pas dépasser l’effectif total.",
        path: ["technicians"],
      });
    }

    if (input.monthlyQuotes > 0 && input.averageQuoteAmount === 0) {
      context.addIssue({
        code: "custom",
        message: "Indiquez un montant moyen lorsque des devis sont créés.",
        path: ["averageQuoteAmount"],
      });
    }
  });

export const diagnosticLeadSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(100),
  company: z.string().trim().min(2).max(160),
  professionalEmail: z.email().max(254),
  phone: z.string().trim().max(40).optional(),
  employees: wholeNumber(1, 500),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/),
});
