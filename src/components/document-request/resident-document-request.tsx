"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DocumentRequestActionsMenu from "@/components/document-request/document-request-actions-menu";
import ClearanceDocumentRequestDialog from "@/components/document-request/dialogs/clearance-document-request-dialog";
import ResidencyDocumentRequestDialog from "@/components/document-request/dialogs/residency-document-request-dialog";
import NoObjectionDocumentRequestDialog from "@/components/document-request/dialogs/no-objection-document-request-dialog";
import IndigencyDocumentRequestDialog from "@/components/document-request/dialogs/indigency-document-request-dialog";
import SoloParentDocumentRequestDialog from "@/components/document-request/dialogs/solo-parent-document-request-dialog";
import MedicalAssistanceDocumentRequestDialog from "@/components/document-request/dialogs/medical-assistance-document-request-dialog";
import { getMyDocumentRequests } from "@/actions/document-requests";
import { getResidentProfile } from "@/actions/resident-profile";
import { statusBadgeVariant } from "@/lib/document-requests";
import {
  ChevronRight,
  FileUser,
  HandHeart,
  HeartPulse,
  Home,
  IdCard,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

const CLEARANCE_DOCUMENT_NAME = "Barangay Clearance";
const RESIDENCY_DOCUMENT_NAME = "Certificate of Residency";
const NO_OBJECTION_DOCUMENT_NAME = "Certificate of No Objection";
const INDIGENCY_DOCUMENT_NAME = "Certificate of Indigency";
const SOLO_PARENT_DOCUMENT_NAME = "Solo Parent Certification";
const MEDICAL_ASSISTANCE_DOCUMENT_NAME = "Medical / Lab Assistance";

interface DocumentType {
  name: string;
  description: string;
  icon: LucideIcon;
}

const documentTypes: DocumentType[] = [
  {
    name: "Certificate of Indigency",
    description:
      "Proof of low-income status for financial assistance, medical, or scholarship applications.",
    icon: HandHeart,
  },
  {
    name: "Certificate of Residency",
    description: "Confirms that you currently live within the barangay.",
    icon: Home,
  },
  {
    name: "Barangay Clearance",
    description:
      "General clearance commonly required for employment, business, or legal transactions.",
    icon: FileUser,
  },
  {
    name: "Certificate of No Objection",
    description: "States that the barangay has no objection to a specific request or activity.",
    icon: Truck,
  },
  {
    name: "Solo Parent Certification",
    description:
      "Certifies solo parent status for benefits under the Solo Parents' Welfare Act.",
    icon: Users,
  },
  {
    name: "Medical / Lab Assistance",
    description: "Request for medical or laboratory financial assistance.",
    icon: HeartPulse,
  },
];

function formatSubmittedDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ResidentDocumentRequest() {
  const [selectedClearanceDocument, setSelectedClearanceDocument] = useState<string | null>(null);
  const [isResidencyDialogOpen, setIsResidencyDialogOpen] = useState(false);
  const [isNoObjectionDialogOpen, setIsNoObjectionDialogOpen] = useState(false);
  const [isIndigencyDialogOpen, setIsIndigencyDialogOpen] = useState(false);
  const [isSoloParentDialogOpen, setIsSoloParentDialogOpen] = useState(false);
  const [isMedicalAssistanceDialogOpen, setIsMedicalAssistanceDialogOpen] = useState(false);

  const { data: myRequests = [], isLoading } = useQuery({
    queryKey: ["document-requests"],
    queryFn: getMyDocumentRequests,
  });

  const { user } = useUser();
  const { data: residentProfile, isLoading: isResidentProfileLoading } = useQuery({
    queryKey: ["resident-profile", user?.id],
    queryFn: () => getResidentProfile(user!.id),
    enabled: !!user?.id,
  });

  const hasResidentProfile = !!residentProfile;

  return (
    <>
      {isResidentProfileLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : !hasResidentProfile ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <IdCard className="size-8 text-muted-foreground" />
          <div>
            <p className="font-semibold leading-tight">Complete your Resident Credentials</p>
            <p className="text-sm text-muted-foreground">
              You need to fill up your Resident Credentials form before you can request any document.
            </p>
          </div>
          <Button asChild className="mt-1">
            <Link href={`/portal/profile/${user?.id}`}>Complete Resident Credentials</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {documentTypes.map(({ name, description, icon: Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                if (name === CLEARANCE_DOCUMENT_NAME) setSelectedClearanceDocument(name);
                else if (name === RESIDENCY_DOCUMENT_NAME) setIsResidencyDialogOpen(true);
                else if (name === NO_OBJECTION_DOCUMENT_NAME) setIsNoObjectionDialogOpen(true);
                else if (name === INDIGENCY_DOCUMENT_NAME) setIsIndigencyDialogOpen(true);
                else if (name === SOLO_PARENT_DOCUMENT_NAME) setIsSoloParentDialogOpen(true);
                else if (name === MEDICAL_ASSISTANCE_DOCUMENT_NAME)
                  setIsMedicalAssistanceDialogOpen(true);
              }}
              className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50"
            >
              <div className="flex w-full items-start justify-between">
                <Icon className="size-7" />
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
              <p className="font-semibold leading-tight">{name}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">My Requests</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Type</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ) : myRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                    No requests yet.
                  </TableCell>
                </TableRow>
              ) : (
                myRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.documentType}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatSubmittedDate(request.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(request.status)}>{request.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DocumentRequestActionsMenu request={request} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ResidencyDocumentRequestDialog
        open={isResidencyDialogOpen}
        onOpenChange={setIsResidencyDialogOpen}
      />

      <NoObjectionDocumentRequestDialog
        open={isNoObjectionDialogOpen}
        onOpenChange={setIsNoObjectionDialogOpen}
      />

      <ClearanceDocumentRequestDialog
        documentName={selectedClearanceDocument ?? ""}
        open={selectedClearanceDocument !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedClearanceDocument(null);
        }}
      />

      <IndigencyDocumentRequestDialog
        open={isIndigencyDialogOpen}
        onOpenChange={setIsIndigencyDialogOpen}
      />

      <SoloParentDocumentRequestDialog
        open={isSoloParentDialogOpen}
        onOpenChange={setIsSoloParentDialogOpen}
      />

      <MedicalAssistanceDocumentRequestDialog
        open={isMedicalAssistanceDialogOpen}
        onOpenChange={setIsMedicalAssistanceDialogOpen}
      />
    </>
  );
}
