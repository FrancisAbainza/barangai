import type { LocationValue } from "@/components/map-picker";
import type { MediaItem } from "@/components/file-uploader";
import z from "zod";

export const COMPLAINT_CATEGORIES = [
  "Noise",
  "Sanitation",
  "Public Safety",
  "Traffic",
  "Infrastructure",
  "Water/Electricity",
  "Domestic",
  "Environment",
  "Others",
] as const;

export const COMPLAINT_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

export const COMPLAINT_STATUSES = ["Pending", "In Progress", "Resolved", "Dismissed"] as const;

export const complaintInsightsSchema = z.object({
  category: z.enum(COMPLAINT_CATEGORIES),
  priority: z.enum(COMPLAINT_PRIORITIES),
});

export type ComplaintInsights = z.infer<typeof complaintInsightsSchema>;

export const PUBLIC_SAFETY_RISK_LEVELS = ["None", "Low", "Medium", "High"] as const;

export const complaintAiInsightSchema = z.object({
  budgetEstimate: z
    .string()
    .describe("Estimated budget range in Philippine peso (PHP) needed to address the complaint"),
  estimatedManpower: z
    .string()
    .describe("Estimated number and type of personnel needed to resolve the complaint"),
  estimatedTimeframe: z.string().describe("Estimated time needed to resolve the complaint"),
  suggestedSolution: z
    .string()
    .describe("Recommended course of action for barangay officials to resolve the complaint"),
  requiredResources: z
    .array(z.string())
    .describe("Materials, equipment, or resources needed to resolve the complaint"),
  publicSafetyRisk: z
    .enum(PUBLIC_SAFETY_RISK_LEVELS)
    .describe("Level of public safety risk posed by this complaint if left unresolved"),
  preventionAdvice: z
    .string()
    .describe("Advice for barangay officials on how to prevent similar complaints from occurring in the future"),
});

export type ComplaintAiInsight = z.infer<typeof complaintAiInsightSchema>;

export const complaintFormSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z
    .custom<LocationValue>()
    .refine((value) => !!value, "Please select the location of the incident"),
  evidence: z.array(z.custom<MediaItem>()).max(5, "Only up to 5 files are allowed"),
});

export type ComplaintFormValues = z.infer<typeof complaintFormSchema>;
