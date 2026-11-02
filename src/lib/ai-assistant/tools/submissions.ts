import type { Business, Complaint, CourtReservation, DocumentRequest } from "@/db/schema";
import { getSubmissionDialogHref } from "@/lib/ai-assistant/portal-dialogs";
import type { PortalNavigationTargetId } from "@/lib/ai-assistant/portal-navigation";
import { markdownLink } from "@/lib/ai-assistant/tools/links";
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

// What the residents' getMySubmissions (resident/) and the admins' getHandledSubmissions (admin/)
// have in common: the same four kinds of submissions, shown to the model the same way. Each one's
// `link` goes to its page with `?view=<id>`, which opens its Submission Info dialog: the barangay's
// reply and attachments, and for an admin, the actions to review it. The page loads it only if
// the user may see it.

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

// e.g. "[View DR-12: Barangay Clearance request](/portal/document-request?view=12)"
export function submissionLink(label: string, page: PortalNavigationTargetId, id: number): string {
  return markdownLink(`View ${label}`, getSubmissionDialogHref(page, id));
}

function truncate(text: string | null) {
  if (!text) return undefined;
  return text.length > MAX_MESSAGE_LENGTH ? `${text.slice(0, MAX_MESSAGE_LENGTH)}…` : text;
}

// What the model gets for each kind of submission.
export function formatDocumentRequest(request: DocumentRequest) {
  const referenceNumber = formatDocumentRequestReference(request.id);
  return {
    referenceNumber,
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
    link: submissionLink(`${referenceNumber}: ${request.documentType} request`, "document-request", request.id),
  };
}

export function formatComplaint(complaint: Complaint) {
  const referenceNumber = formatComplaintReference(complaint.id);
  return {
    referenceNumber,
    subject: complaint.subject,
    category: complaint.category,
    status: complaint.status,
    resolutionMessage: truncate(complaint.resolutionMessage),
    dismissalReason: truncate(complaint.dismissalReason),
    submitted: formatPhilippineDate(complaint.createdAt),
    lastUpdated: formatPhilippineDate(complaint.updatedAt),
    link: submissionLink(`${referenceNumber}: ${complaint.subject}`, "complaint", complaint.id),
  };
}

export function formatCourtReservation(reservation: CourtReservation) {
  const referenceNumber = formatCourtReservationReference(reservation.id);
  const date = formatReservationDate(reservation.date);
  return {
    referenceNumber,
    date,
    time: formatReservationTime(reservation),
    purpose: reservation.purpose,
    total: formatFee(Number(reservation.totalAmount)),
    status: reservation.status,
    rejectionReason: truncate(reservation.rejectionReason),
    submitted: formatPhilippineDate(reservation.createdAt),
    link: submissionLink(`${referenceNumber}: Court reservation on ${date}`, "court-reservation", reservation.id),
  };
}

export function formatBusiness(business: Business) {
  const referenceNumber = formatBusinessReference(business.id);
  return {
    referenceNumber,
    name: business.name,
    category: business.category,
    status: business.status,
    rejectionReason: truncate(business.rejectionReason),
    submitted: formatPhilippineDate(business.createdAt),
    link: submissionLink(`${referenceNumber}: ${business.name}`, "community-hub", business.id),
  };
}
