import PageHeader from "@/components/page-header";
import { SportShoe } from "lucide-react";

export default function CourtReservationPage() {
  return (
    <div className="container space-y-6 m-auto">
      <PageHeader
        icon={SportShoe}
        title="Court Reservation"
        description="Request and track your court reservation."
      />
    </div>
  );
}