import { Eye, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBarangaySettings } from "@/actions/settings";

export default async function MissionVisionSection() {
  const { mission, vision } = await getBarangaySettings();

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="size-5" />
            </span>
            Mission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{mission}</p>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Eye className="size-5" />
            </span>
            Vision
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{vision}</p>
        </CardContent>
      </Card>
    </div>
  );
}
