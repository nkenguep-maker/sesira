import { z } from "zod";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

export const customerInputSchema = z
  .object({
    type: z.enum(["PERSON", "COMPANY"]),
    displayName: z.string().trim().min(2).max(200),
    companyName: optionalText(200),
    email: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.email().max(254).optional(),
    ),
    phone: optionalText(40),
  })
  .superRefine((customer, context) => {
    if (customer.type === "COMPANY" && !customer.companyName) {
      context.addIssue({
        code: "custom",
        message: "Le nom de l’entreprise est requis.",
        path: ["companyName"],
      });
    }
  });

export type CustomerInput = z.infer<typeof customerInputSchema>;
