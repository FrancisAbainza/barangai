import z from "zod";

export const adminProfileFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
});

export type AdminProfileFormValues = z.infer<typeof adminProfileFormSchema>;
