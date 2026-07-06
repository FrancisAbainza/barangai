import { FileX } from "lucide-react";

export default function DocumentRequestRestricted() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-10 text-center shadow-sm">
      <FileX className="size-8 text-muted-foreground" />
      <div>
        <p className="font-semibold leading-tight">Document Request is for Residents only</p>
        <p className="text-sm text-muted-foreground">
          Admin and Super Admin accounts don&apos;t have a resident profile, so this feature isn&apos;t available.
        </p>
      </div>
    </div>
  );
}
