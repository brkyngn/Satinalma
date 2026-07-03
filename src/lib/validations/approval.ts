import { z } from "zod";

export const createApprovalSchema = z
  .object({
    selectedQuoteId: z.string().min(1).optional(),
    decision: z.enum(["approved", "rejected"]),
    comment: z.string().trim().optional(),
  })
  .refine((data) => data.decision === "rejected" || !!data.selectedQuoteId, {
    message: "Onay için bir teklif seçilmelidir",
    path: ["selectedQuoteId"],
  });

export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;
