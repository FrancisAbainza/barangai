import Image from "next/image";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fetchFile } from "@/lib/storage";
import type { Official } from "@/db/schema";
import EditOfficialDialog from "./edit-official-dialog";
import DeleteOfficialDialog from "./delete-official-dialog";

interface OfficialCardProps {
  official: Official;
  isAdmin: boolean;
  hasLeader: boolean;
}

export default function OfficialCard({ official, isAdmin, hasLeader }: OfficialCardProps) {
  const featured = official.isLeader;
  const photoKey = official.photo[0]?.key;
  const src = photoKey ? fetchFile(photoKey) : null;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 overflow-hidden rounded-lg border bg-card text-center",
        featured ? "p-6" : "p-4"
      )}
      style={
        featured
          ? {
              background:
                "linear-gradient(135deg, rgba(0, 56, 168, 0.7) 0%, transparent 30%, transparent 70%, rgba(206, 17, 38, 0.7) 100%)",
            }
          : undefined
      }
    >
      {isAdmin && (
        <div className="absolute top-2 right-2 flex gap-1">
          <EditOfficialDialog official={official} hasLeader={hasLeader} />
          <DeleteOfficialDialog official={official} />
        </div>
      )}

      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full bg-muted",
          featured ? "size-24" : "size-16"
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={official.name}
            fill
            sizes={featured ? "96px" : "64px"}
            className="object-cover"
            unoptimized
          />
        ) : (
          <User className={cn("text-muted-foreground", featured ? "size-10" : "size-7")} />
        )}
      </div>

      <div className="space-y-1.5">
        <p className={cn("font-medium", featured ? "text-base" : "text-sm")}>{official.name}</p>
        {featured ? (
          <Badge className="bg-emerald-700 text-white hover:bg-emerald-700">{official.position}</Badge>
        ) : (
          <p className="text-xs text-muted-foreground">{official.position}</p>
        )}
      </div>
    </div>
  );
}
