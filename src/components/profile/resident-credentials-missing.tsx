import { IdCard } from "lucide-react";

export default function ResidentCredentialsMissing() {
  return (
    <div className="flex flex-col justify-center gap-3 rounded-xl border border-border bg-card p-10 text-center shadow-sm md:items-center">
      <IdCard className="self-center size-8 text-muted-foreground" />
      <div>
        <p className="font-semibold leading-tight">Resident Credentials Not Completed</p>
        <p className="text-sm text-muted-foreground">
          This resident hasn&apos;t filled up their Resident Credentials yet.
        </p>
      </div>
    </div>
  );
}
