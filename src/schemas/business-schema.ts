import type { MediaItem } from "@/components/file-uploader";
import type { LocationValue } from "@/components/map-picker";
import z from "zod";

export const BUSINESS_CATEGORIES = [
  "Food & Beverage",
  "Retail",
  "Services",
  "Health & Wellness",
  "Beauty & Personal Care",
  "Education",
  "Automotive",
  "Agriculture",
  "Technology",
  "Others",
] as const;

export const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const BUSINESS_STATUSES = ["Pending", "Processing", "Verified", "Rejected"] as const;

export const operatingHoursSchema = z.object({
  days: z.array(z.enum(DAYS_OF_WEEK)).min(1, "Select at least one operating day"),
  opens: z.string().min(1, "Opening time is required"),
  closes: z.string().min(1, "Closing time is required"),
});

export type OperatingHours = z.infer<typeof operatingHoursSchema>;

export const businessFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(BUSINESS_CATEGORIES),
  contactNumber: z
    .string()
    .min(10, "Enter a valid contact number")
    .max(13, "Enter a valid contact number"),
  socialMediaLink: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  operatingHours: operatingHoursSchema,
  photos: z.array(z.custom<MediaItem>()).max(10, "Only up to 10 photos are allowed").optional(),
  permit: z
    .array(z.custom<MediaItem>())
    .min(1, "Upload your business permit")
    .max(1, "Only one file is allowed"),
  location: z.custom<LocationValue>().optional(),
});

export type BusinessFormValues = z.infer<typeof businessFormSchema>;
