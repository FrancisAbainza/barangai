import type { Complaint } from "@/db/schema";
import type { PUBLIC_SAFETY_RISK_LEVELS } from "@/schemas/complaint-schema";

export function statusBadgeVariant(status: Complaint["status"]) {
  if (status === "Resolved") return "default";
  if (status === "Dismissed") return "destructive";
  return "outline";
}

export function priorityBadgeVariant(priority: Complaint["priority"]) {
  if (priority === "Urgent") return "destructive";
  if (priority === "High") return "default";
  return "outline";
}

export function publicSafetyRiskBadgeVariant(risk: (typeof PUBLIC_SAFETY_RISK_LEVELS)[number]) {
  if (risk === "High") return "destructive";
  if (risk === "Medium") return "default";
  return "outline";
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
