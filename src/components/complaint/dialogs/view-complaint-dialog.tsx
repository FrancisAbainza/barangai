"use client";

import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, IdCard, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import MediaLightbox from "@/components/media-lightbox";
import MediaPreviewList from "@/components/media-preview-list";
import MapView from "@/components/map-view";
import { fetchFile } from "@/lib/storage";
import { isAdminRole } from "@/lib/roles";
import {
  statusBadgeVariant,
  priorityBadgeVariant,
  publicSafetyRiskBadgeVariant,
  formatDate,
} from "@/lib/complaints";
import { getResidentProfile } from "@/actions/resident-profile";
import { generateComplaintInsight, type ComplaintWithComplainant } from "@/actions/complaints";
import type { MediaItem } from "@/components/file-uploader";

interface ViewComplaintDialogProps {
  complaint: ComplaintWithComplainant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ValidIdPreview({ label, item }: { label: string; item: MediaItem | undefined }) {
  if (!item?.key) return null;
  const url = fetchFile(item.key);

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <MediaLightbox src={url} alt={label} className="w-full">
        <div className="relative aspect-video w-full overflow-hidden rounded-md border">
          <Image src={url} alt={label} fill sizes="240px" className="object-cover" unoptimized />
        </div>
      </MediaLightbox>
    </Field>
  );
}

export default function ViewComplaintDialog({
  complaint,
  open,
  onOpenChange,
}: ViewComplaintDialogProps) {
  const evidence = complaint.evidence as MediaItem[];
  const resolutionAttachments = complaint.resolutionAttachments as MediaItem[];
  const dismissalAttachments = complaint.dismissalAttachments as MediaItem[];
  const queryClient = useQueryClient();

  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["resident-profile", complaint.complainantId],
    queryFn: () => getResidentProfile(complaint.complainantId),
    enabled: open,
  });

  const {
    mutate: generateInsight,
    data: generatedInsight,
    isPending: isGeneratingInsight,
  } = useMutation({
    mutationFn: () =>
      generateComplaintInsight({
        id: complaint.id,
        subject: complaint.subject,
        description: complaint.description,
        category: complaint.category,
        priority: complaint.priority,
        location: complaint.location,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
    onError: () => {
      toast.error("Failed to generate AI insight. Please try again.");
    },
  });

  const insight = generatedInsight ?? complaint.aiInsight;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{complaint.subject}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="complaint">
          <TabsList className="w-full">
            <TabsTrigger value="complaint" className="flex-1">
              Complaint Info
            </TabsTrigger>
            <TabsTrigger value="complainant" className="flex-1">
              Complainant Info
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="ai-insight" className="flex-1">
                AI Insight
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="complaint" className="space-y-4 pt-2">
            <Field>
              <FieldLabel>Status</FieldLabel>
              <div>
                <Badge variant={statusBadgeVariant(complaint.status)}>{complaint.status}</Badge>
              </div>
            </Field>

            <Field>
              <FieldLabel>Category</FieldLabel>
              <p className="text-sm">{complaint.category}</p>
            </Field>

            <Field>
              <FieldLabel>Priority</FieldLabel>
              <div>
                <Badge variant={priorityBadgeVariant(complaint.priority)}>{complaint.priority}</Badge>
              </div>
            </Field>

            <Field>
              <FieldLabel>Description</FieldLabel>
              <p className="text-sm text-muted-foreground">{complaint.description}</p>
            </Field>

            <Field>
              <FieldLabel>Location</FieldLabel>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  <span>{complaint.location.address || "Address unavailable"}</span>
                </div>
                <MapView location={complaint.location} />
              </div>
            </Field>

            {evidence.length > 0 && (
              <Field>
                <FieldLabel>Evidence</FieldLabel>
                <MediaPreviewList items={evidence} />
              </Field>
            )}

            <Field>
              <FieldLabel>Submission Date</FieldLabel>
              <p className="text-sm">{formatDate(complaint.createdAt)}</p>
            </Field>

            {(complaint.resolutionMessage || resolutionAttachments.length > 0) && (
              <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <p className="text-sm font-semibold text-primary">Resolved</p>
                </div>

                {complaint.resolutionMessage && <p className="text-sm">{complaint.resolutionMessage}</p>}

                {resolutionAttachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                    <MediaPreviewList items={resolutionAttachments} />
                  </div>
                )}
              </div>
            )}

            {(complaint.dismissalMessage || dismissalAttachments.length > 0) && (
              <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-center gap-2">
                  <Ban className="size-4 text-destructive" />
                  <p className="text-sm font-semibold text-destructive">Dismissed</p>
                </div>

                {complaint.dismissalMessage && <p className="text-sm">{complaint.dismissalMessage}</p>}

                {dismissalAttachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                    <MediaPreviewList items={dismissalAttachments} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="complainant" className="space-y-4 pt-2">
            {isProfileLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : !profile ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <IdCard className="size-6" />
                This resident hasn&apos;t completed their profile yet.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Full Name</FieldLabel>
                    <p className="text-sm">
                      {[profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ")}
                    </p>
                  </Field>
                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <p className="text-sm">{complaint.complainantEmail}</p>
                  </Field>
                  <Field>
                    <FieldLabel>Birthdate</FieldLabel>
                    <p className="text-sm">{formatDate(profile.birthdate)}</p>
                  </Field>
                  <Field>
                    <FieldLabel>Sex</FieldLabel>
                    <p className="text-sm">{profile.sex}</p>
                  </Field>
                  <Field>
                    <FieldLabel>Civil Status</FieldLabel>
                    <p className="text-sm">{profile.civilStatus}</p>
                  </Field>
                  <Field>
                    <FieldLabel>Contact Number</FieldLabel>
                    <p className="text-sm">{profile.contactNumber}</p>
                  </Field>
                </div>

                <Field>
                  <FieldLabel>Address</FieldLabel>
                  <p className="text-sm">{profile.address}</p>
                </Field>

                <Field>
                  <FieldLabel>Valid ID Type</FieldLabel>
                  <p className="text-sm">{profile.validIdType}</p>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <ValidIdPreview
                    label="Valid ID (Front)"
                    item={(profile.validIdFront as MediaItem[])[0]}
                  />
                  <ValidIdPreview label="Valid ID (Back)" item={(profile.validIdBack as MediaItem[])[0]} />
                </div>
              </>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="ai-insight" className="space-y-4 pt-2">
              {isGeneratingInsight ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : !insight ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
                  <Sparkles className="size-6 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Get AI-generated insights</p>
                    <p className="text-sm text-muted-foreground">
                      Summarize this complaint and surface suggested next steps.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => generateInsight()}>
                    <Sparkles className="size-4" />
                    Generate Insight
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>Budget Estimate</FieldLabel>
                      <p className="text-sm">{insight.budgetEstimate}</p>
                    </Field>
                    <Field>
                      <FieldLabel>Estimated Manpower</FieldLabel>
                      <p className="text-sm">{insight.estimatedManpower}</p>
                    </Field>
                    <Field>
                      <FieldLabel>Estimated Timeframe</FieldLabel>
                      <p className="text-sm">{insight.estimatedTimeframe}</p>
                    </Field>
                    <Field>
                      <FieldLabel>Public Safety Risk</FieldLabel>
                      <div>
                        <Badge variant={publicSafetyRiskBadgeVariant(insight.publicSafetyRisk)}>
                          {insight.publicSafetyRisk}
                        </Badge>
                      </div>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>Suggested Solution</FieldLabel>
                    <p className="text-sm text-muted-foreground">{insight.suggestedSolution}</p>
                  </Field>

                  <Field>
                    <FieldLabel>Required Resources</FieldLabel>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {insight.requiredResources.map((resource) => (
                        <li key={resource}>{resource}</li>
                      ))}
                    </ul>
                  </Field>

                  <Field>
                    <FieldLabel>Prevention Advice</FieldLabel>
                    <p className="text-sm text-muted-foreground">{insight.preventionAdvice}</p>
                  </Field>

                  <Button size="sm" variant="outline" onClick={() => generateInsight()}>
                    <Sparkles className="size-4" />
                    Regenerate
                  </Button>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
