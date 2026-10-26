import type { Business, Complaint, CourtReservation, DocumentRequest } from "@/db/schema";
import { getSubmissionDialogHref } from "@/lib/ai-assistant/portal-dialogs";
import type { PortalNavigationTargetId } from "@/lib/ai-assistant/portal-navigation";
import type { AssistantButton } from "@/lib/ai-assistant/tools/buttons";
import { formatReferenceNumber as formatBusinessReference } from "@/lib/business";
import { formatReferenceNumber as formatComplaintReference } from "@/lib/complaints";
import {
  formatReferenceNumber as formatCourtReservationReference,
  formatFee,
  formatReservationDate,
  formatReservationTime,
} from "@/lib/court-reservations";
import { formatReferenceNumber as formatDocumentRequestReference } from "@/lib/document-requests";
import { formatPhilippineDate } from "@/lib/utils";

// What the residents' getMySubmissions and openSubmissionDetails (resident/) and the admins'
// getHandledSubmissions and openSubmissionDetails (admin/) have in common: the same four kinds of
// submissions, shown to the model and opened the same way.

// Per kind of submission, most recent first. More than a resident usually has.
export const MAX_PER_KIND = 10;
const MAX_MESSAGE_LENGTH = 300;

// For what the reply has to say when a list is cut off: what the user has, and the page that
// lists them all.
export const LIST_DESCRIPTIONS = {
  documentRequests: { name: "document requests", page: "document-request" },
  complaints: { name: "complaints", page: "complaint" },
  followedComplaints: { name: "followed complaints", page: "complaint" },
  courtReservations: { name: "court reservations", page: "court-reservation" },
  businesses: { name: "Community Hub businesses", page: "community-hub" },
} as const satisfies Record<string, { name: string; page: PortalNavigationTargetId }>;

function truncate(text: string | null) {
  if (!text) return undefined;
  return text.length > MAX_MESSAGE_LENGTH ? `${text.slice(0, MAX_MESSAGE_LENGTH)}…` : text;
}

// What the model gets for each kind of submission.
export function formatDocumentRequest(request: DocumentRequest) {
  return {
    referenceNumber: formatDocumentRequestReference(request.id),
    documentType: request.documentType,
    purpose: request.purpose === "Other" ? request.otherPurpose : request.purpose,
    receiveVia: request.receiveVia,
    preferredClaimAt: request.preferredClaimAt ? formatPhilippineDate(request.preferredClaimAt, true) : undefined,
    status: request.status,
    pickupMessage: truncate(request.pickupMessage),
    rejectionReason: truncate(request.rejectionReason),
    claimedAt: request.claimedAt ? formatPhilippineDate(request.claimedAt, true) : undefined,
    submitted: formatPhilippineDate(request.createdAt),
    lastUpdated: formatPhilippineDate(request.updatedAt),
  };
}

export function formatComplaint(complaint: Complaint) {
  return {
    referenceNumber: formatComplaintReference(complaint.id),
    subject: complaint.subject,
    category: complaint.category,
    status: complaint.status,
    resolutionMessage: truncate(complaint.resolutionMessage),
    dismissalReason: truncate(complaint.dismissalReason),
    submitted: formatPhilippineDate(complaint.createdAt),
    lastUpdated: formatPhilippineDate(complaint.updatedAt),
  };
}

export function formatCourtReservation(reservation: CourtReservation) {
  return {
    referenceNumber: formatCourtReservationReference(reservation.id),
    date: formatReservationDate(reservation.date),
    time: formatReservationTime(reservation),
    purpose: reservation.purpose,
    total: formatFee(Number(reservation.totalAmount)),
    status: reservation.status,
    rejectionReason: truncate(reservation.rejectionReason),
    submitted: formatPhilippineDate(reservation.createdAt),
  };
}

export function formatBusiness(business: Business) {
  return {
    referenceNumber: formatBusinessReference(business.id),
    name: business.name,
    category: business.category,
    status: business.status,
    rejectionReason: truncate(business.rejectionReason),
    submitted: formatPhilippineDate(business.createdAt),
  };
}

// The reference number prefixes (createReferenceNumbers in each domain's lib) and the page whose
// `?view=<id>` opens that kind of submission's Submission Info dialog.
const REFERENCE_PREFIX_PAGES = {
  DR: "document-request",
  CP: "complaint",
  CR: "court-reservation",
  CH: "community-hub",
} as const satisfies Record<string, PortalNavigationTargetId>;

// e.g. "dr12" → { referenceNumber: "DR-12", page: "document-request", id: 12 }, or null if it
// isn't a reference number.
export function parseReferenceNumber(referenceNumber: string) {
  const match = referenceNumber.trim().toUpperCase().match(/^(DR|CP|CR|CH)-?(\d+)$/);
  if (!match) return null;
  const prefix = match[1] as keyof typeof REFERENCE_PREFIX_PAGES;
  const id = Number(match[2]);
  return { referenceNumber: `${prefix}-${id}`, page: REFERENCE_PREFIX_PAGES[prefix], id };
}

// The button that opens a submission's Submission Info dialog on its page.
export function getSubmissionButton(submission: {
  referenceNumber: string;
  label: string;
  page: PortalNavigationTargetId;
  id: number;
}): AssistantButton {
  const { referenceNumber, label, page, id } = submission;
  return {
    key: `submission-${referenceNumber}`,
    kind: "submission",
    page,
    label: `View ${referenceNumber}: ${label}`,
    href: getSubmissionDialogHref(page, id),
  };
}
