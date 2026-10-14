"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { GripVertical, User, UserRoundX } from "lucide-react";
import { DragDropContext, Draggable, Droppable, type DraggableProvided, type DropResult } from "@hello-pangea/dnd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchFile } from "@/lib/storage";
import { getOfficials, reorderOfficials, type OfficialSection } from "@/actions/officials";
import type { Official } from "@/db/schema";
import AddOfficialDialog from "@/components/barangay-settings/dialogs/add-official-dialog";
import EditOfficialDialog from "@/components/barangay-settings/dialogs/edit-official-dialog";
import DeleteOfficialDialog from "@/components/barangay-settings/dialogs/delete-official-dialog";

interface OfficialsListProps {
  title: string;
  icon: ReactNode;
  addLabel: string;
  section: OfficialSection;
}

// Rows are spaced with a margin on each row rather than a gap on the list, since pangea
// measures each draggable's margins (but not the list's gap) when shifting rows aside.
const rowClassName = "mb-2 flex items-center gap-2 rounded-lg border bg-card p-2 pr-3 sm:gap-3";

function OfficialRowSkeleton() {
  return (
    <div className={rowClassName}>
      <Skeleton className="h-12 w-6 sm:w-8" />
      <Skeleton className="size-10 sm:size-12" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// Takes pangea's pieces as separate props: reading them off the `provided` object during
// render trips the React Compiler's react-hooks/refs lint, since that object holds a ref.
interface OfficialRowProps extends Pick<DraggableProvided, "innerRef" | "draggableProps" | "dragHandleProps"> {
  official: Official;
  isDragging: boolean;
}

function OfficialRow({ official, innerRef, draggableProps, dragHandleProps, isDragging }: OfficialRowProps) {
  const photoKey = official.photo[0]?.key;
  const src = photoKey ? fetchFile(photoKey) : null;

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      // Copied into a plain object: radix's `--radix-*` additions to React's CSSProperties
      // make pangea's style interface unassignable as-is.
      style={{ ...draggableProps.style }}
      className={cn(rowClassName, isDragging && "shadow-lg ring-2 ring-primary/40")}
    >
      <div
        {...dragHandleProps}
        aria-label={`Drag to reorder ${official.name}`}
        className="flex h-12 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-8"
      >
        <GripVertical className="size-4" />
      </div>

      <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted sm:size-12">
        {src ? (
          <Image src={src} alt="" fill sizes="48px" className="object-cover object-top" unoptimized />
        ) : (
          <User className="size-5 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium wrap-break-word">{official.name}</p>
        <p className="text-sm text-muted-foreground wrap-break-word">{official.position}</p>
      </div>

      <div className="flex shrink-0 gap-1">
        <EditOfficialDialog official={official} />
        <DeleteOfficialDialog official={official} />
      </div>
    </div>
  );
}

export default function OfficialsList({ title, icon, addLabel, section }: OfficialsListProps) {
  const queryClient = useQueryClient();
  const queryKey = ["officials", section];
  const reorderKey = ["reorder-officials", section];

  const { data: officials, isLoading } = useQuery({
    queryKey,
    queryFn: () => getOfficials(section),
  });

  const { mutate: saveOrder } = useMutation({
    mutationKey: reorderKey,
    mutationFn: (orderedIds: number[]) => reorderOfficials(section, orderedIds),
    // Saves run one at a time, so quick successive drags reach the server in order.
    scope: { id: reorderKey.join(":") },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save the new order. Please try again.");
    },
    // Refetch once the last queued save settles. That confirms the order, or restores the
    // saved one after a failure, without flickering between saves.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: reorderKey }) === 1) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (!officials || !destination || destination.index === source.index) return;

    const reordered = [...officials];
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    // Updated synchronously so the dropped row doesn't snap back while the save is in flight.
    queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData(queryKey, reordered);
    saveOrder(reordered.map((official) => official.id));
  };

  const count = officials?.length ?? 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="rounded-lg bg-primary/10 p-2 text-primary [&_svg]:size-5">{icon}</div>
        <div className="flex-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>
            {count} {count === 1 ? "official" : "officials"}
            {count > 1 && " · Drag to reorder"}
          </CardDescription>
        </div>
        <AddOfficialDialog title={title} addLabel={addLabel} section={section} />
      </CardHeader>

      <CardContent>
        {isLoading ? (
          Array.from({ length: 3 }, (_, index) => <OfficialRowSkeleton key={index} />)
        ) : !officials?.length ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 py-10 text-center text-muted-foreground">
            <UserRoundX className="size-8" />
            <p className="text-sm">No officials added yet.</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={`officials-${section}`}>
              {(droppable) => (
                <div ref={droppable.innerRef} {...droppable.droppableProps}>
                  {officials.map((official, index) => (
                    <Draggable key={official.id} draggableId={String(official.id)} index={index}>
                      {({ innerRef, draggableProps, dragHandleProps }, { isDragging }) => (
                        <OfficialRow
                          official={official}
                          innerRef={innerRef}
                          draggableProps={draggableProps}
                          dragHandleProps={dragHandleProps}
                          isDragging={isDragging}
                        />
                      )}
                    </Draggable>
                  ))}
                  {droppable.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </CardContent>
    </Card>
  );
}
